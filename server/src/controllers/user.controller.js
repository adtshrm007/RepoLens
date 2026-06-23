import prisma from "../utils/prisma.util.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  isStrongPassword,
  isValidEmail,
  isValidName,
} from "../utils/auth.utils.js";
import { generateTokensAndLogin } from "../services/auth.service.js";
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
    const url =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${process.env.GITHUB_CLIENT_ID}` +
      `&scope=user:email`;

    return res.redirect(url);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Server Error" });
  }
};

export const githubCallback = async (req, res) => {
  const code = req.query.code;

  try {
    const tokenResponse = await getGitHubAccessToken(code);
    const access_token = tokenResponse.data.access_token;

    //Create the instance of octokit
    const octokit = new Octokit({ auth: access_token });

    //fetch the user
    let user = await octokit.request("GET /user");
    
    //creating or updating the user
    user=await prisma.user.upsert({
      data:{
        email:user.email,
        name:user.name,
        
      }
    })

    // const userResponse = await axios.get("https://api.github.com/user", {
    //   headers: {
    //     Authorization: `Bearer ${access_token}`,
    //     Accept: "application/vnd.github+json",
    //   },
    // });

    // const reposResponse = await axios.get("https://api.github.com/user/repos", {
    //   headers: {
    //     Authorization: `Bearer ${access_token}`,
    //     Accept: "application/vnd.github+json",
    //   },
    // });

    // // 3. LOG RAW RESPONSES
    // console.log("=== GITHUB USER ===");
    // console.log(userResponse.data);

    // console.log("=== GITHUB REPOS ===");
    // console.log(reposResponse.data);

    // // 4. Send raw data to frontend
    // res.json({
    //   user: userResponse.data,
    //   repos: reposResponse.data,
    //   token: access_token,
    // });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "OAuth failed" });
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
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Logout User
// @route   POST /auth/logout
// @access  Public
export const logout = (req, res) => {
  res.cookie("token", "", { httpOnly: true, expires: new Date(0) });
  res.status(200).json({ message: "Logged out successfully" });
};
