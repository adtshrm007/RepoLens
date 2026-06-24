import prisma from "../utils/prisma.util.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  isStrongPassword,
  isValidEmail,
  isValidName,
} from "../utils/auth.utils.js";
import { generateTokensAndLogin, generateTokensAndRedirect } from "../services/auth.service.js";
import { verifyGoogleToken } from "../middleware/verifyGoogleToken.middleware.js";
import { getGitHubAccessToken } from "../utils/github.util.js";
import axios from "axios";
import { Octokit } from "octokit";

export const registerUser = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    //Validating fields before check
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    //Checking existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res.status(400).json({ message: "User Already exist." });
    }

    //Validating Password and Email
    const checkValidEmail = isValidEmail(email);
    if (!checkValidEmail) {
      return res.status(400).json({ message: "Email is Invalid." });
    }
    const checkStrongPassword = isStrongPassword(password);
    if (!checkStrongPassword) {
      return res.status(400).json({ message: "Weak password." });
    }

    const checkName = isValidName(name);
    if (!checkName) {
      return res
        .status(400)
        .json({ message: "Name must be atleast 4 characters." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        name: name,
        email: email,
        password: hashedPassword,
      },
    });
    return res.status(201).json({ message: "User created successfully." });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error." });
  }
};

export const loginUser = async (req, res) => {
  try {
    const email = req.body.email?.toLowerCase();
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({
        message: "All fields are required.",
      });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid Credentials.",
      });
    }

    //Google-only users have no password — don't crash on bcrypt.compare(x, null)
    if (!user.password) {
      return res.status(400).json({
        message: "This account uses Google sign-in. Please log in with Google.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        message: "Invalid Credentials.",
      });
    }

    await generateTokensAndLogin(user, res);
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Server Error.",
    });
  }
};

//Full Google OAuth flow — verify token, find/create user, issue JWT cookies
export const googleLogin = async (req, res) => {
  try {
    const { accessToken } = req.body;
    if (!accessToken) {
      return res.status(401).json({ message: "Please try to log in again." });
    }

    // Verify token and get user info from Google
    const tokenInfo = await verifyGoogleToken(accessToken);
    if (!tokenInfo) {
      return res.status(401).json({ message: "Invalid Google token." });
    }

    // Fetch full profile (name, picture) from Google userinfo endpoint
    const userInfoRes = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${accessToken}`,
    );
    const userInfo = await userInfoRes.json();

    const googleId = tokenInfo.sub;
    const email = tokenInfo.email;
    const name = userInfo.name || email.split("@")[0];
    const picture = userInfo.picture || null;

    // Try to find user by their Google ID first (fastest path)
    let user = await prisma.user.findUnique({ where: { googleId } });

    if (!user) {
      // Check if an account already exists with this email (e.g. signed up manually)
      const existingByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingByEmail) {
        // Link Google ID to the existing account
        user = await prisma.user.update({
          where: { email },
          data: { googleId, profilePic: picture, provider: "GOOGLE" },
        });
      } else {
        // Brand new user — create their account
        user = await prisma.user.create({
          data: {
            name,
            email,
            googleId,
            profilePic: picture,
            provider: "GOOGLE",
          },
        });
      }
    }

    await generateTokensAndLogin(user, res);
  } catch (error) {
    console.error("Google login error:", error);
    return res
      .status(401)
      .json({ message: "Failed to verify the Google token." });
  }
};

//Full GitHub OAuth flow
export const githubLogin = async (req, res) => {
  try {
    // 'repo' scope gives access to private repos
    // 'user:email' gives access to the user's email addresses
    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&scope=repo,user:email`;

    return res.redirect(url);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const githubCallback = async (req, res) => {
  const code = req.query.code;

  try {
    // 1. Exchange code for access token
    const tokenResponse = await getGitHubAccessToken(code);
    const access_token = tokenResponse.data?.access_token;

    if (!access_token) {
      return res.redirect(`${process.env.CLIENT_URL}/auth?error=github_token_failed`);
    }

    // 2. Fetch GitHub user profile
    const octokit = new Octokit({ auth: access_token });
    const { data: githubUser } = await octokit.request("GET /user");

    // 3. GitHub may not expose email on /user — fetch primary verified email separately
    let email = githubUser.email;
    if (!email) {
      try {
        const { data: emails } = await octokit.request("GET /user/emails");
        const primary = emails.find((e) => e.primary && e.verified);
        email = primary?.email || emails[0]?.email || null;
      } catch {
        email = null;
      }
    }

    if (!email) {
      return res.redirect(`${process.env.CLIENT_URL}/auth?error=no_email`);
    }

    const githubId    = String(githubUser.id);
    const name        = githubUser.name || githubUser.login;
    const profilePic  = githubUser.avatar_url || null;
    const username    = githubUser.login || null;

    // 4. Find or create the user
    // First try by githubId (fastest — already linked)
    let user = await prisma.user.findUnique({ where: { githubId } });

    if (!user) {
      // Check if an account already exists with this email
      const existingByEmail = await prisma.user.findUnique({ where: { email } });

      if (existingByEmail) {
        // Link GitHub to existing account
        user = await prisma.user.update({
          where: { email },
          data: {
            githubId,
            githubAccessToken: access_token,
            profilePic: profilePic || existingByEmail.profilePic,
            username: username || existingByEmail.username,
          },
        });
      } else {
        // Brand new user via GitHub
        user = await prisma.user.create({
          data: {
            name,
            email,
            githubId,
            githubAccessToken: access_token,
            profilePic,
            username,
            provider: "GITHUB",
          },
        });
      }
    } else {
      // Already linked — refresh the access token and avatar
      user = await prisma.user.update({
        where: { githubId },
        data: {
          githubAccessToken: access_token,
          profilePic: profilePic || user.profilePic,
        },
      });
    }

    // 5. Issue JWT cookies and redirect to dashboard
    await generateTokensAndRedirect(user, res);
  } catch (err) {
    console.error("GitHub OAuth Error:", err.response?.data || err.message);
    res.redirect(`${process.env.CLIENT_URL}/auth?error=oauth_failed`);
  }
};

// ─── Shared ───────────────────────────────────────────────────────────────────

// @desc    Get Current User Profile
// @route   GET /auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const { password, githubAccessToken, githubRefreshToken, appRefreshToken, ...safeUser } = user;
    res.json(safeUser);
  } catch (error) {
    console.error("Get Me Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Logout User
// @route   POST /auth/logout
// @access  Public
export const logout = (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
  };
  // Clear both cookies set by generateTokensAndLogin / generateTokensAndRedirect
  res.cookie("accessToken", "", cookieOptions);
  res.cookie("refreshToken", "", cookieOptions);
  res.status(200).json({ message: "Logged out successfully" });
};

// @desc    Refresh Access Token
// @route   POST /auth/refresh
// @access  Public
export const refreshToken = async (req, res) => {
  try {
    const appRefreshToken = req.cookies?.refreshToken;

    if (!appRefreshToken) {
      return res.status(401).json({ message: "No refresh token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(appRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Protection against token reuse / hijacked session:
    if (user.appRefreshToken !== appRefreshToken) {
      return res.status(401).json({ message: "Refresh token has been revoked or reused" });
    }

    // Issue new tokens via the service function
    // generateTokensAndLogin will create new access/refresh tokens, update DB, set cookies
    // Note: It also sends a 200 JSON response which is what the frontend expects.
    await generateTokensAndLogin(user, res);
  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({ message: "Server error during token refresh" });
  }
};
