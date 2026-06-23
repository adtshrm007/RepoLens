import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../utils/prisma.util.js";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "postmessage"
);

const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || "fallback_secret";
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

/** Issue a JWT and set it as an httpOnly cookie */
const issueToken = (res, userId) => {
  const token = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
};

// ─── Email / Password ────────────────────────────────────────────────────────

// @desc    Register with email + password
// @route   POST /auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "An account with that email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        username: email.split("@")[0],
        password: hashedPassword,
        provider: "CUSTOM",
      },
    });

    issueToken(res, user.id);

    res.status(201).json({
      message: "Account created successfully",
      user: { id: user.id, name: user.name, email: user.email, username: user.username, profilePic: user.profilePic },
    });
  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// @desc    Login with email + password
// @route   POST /auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.password) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    issueToken(res, user.id);

    res.status(200).json({
      message: "Logged in successfully",
      user: { id: user.id, name: user.name, email: user.email, username: user.username, profilePic: user.profilePic },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ─── Google OAuth (Frontend sends ID token) ───────────────────────────────────

// @desc    Google Auth via auth-code (GIS)
// @route   POST /auth/google
// @access  Public
export const googleAuth = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ message: "No code provided" });
    }

    // Exchange the authorization code for tokens
    const { tokens } = await googleClient.getToken(code);

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const profile = ticket.getPayload();
    if (!profile || !profile.sub) {
      throw new Error("Failed to verify Google token");
    }

    // 3. Upsert user
    let user = await prisma.user.findUnique({ where: { googleId: profile.sub } });

    if (!user) {
      // Check if email already exists (user registered with email/password)
      const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
      if (byEmail) {
        // Link Google to existing account
        user = await prisma.user.update({
          where: { id: byEmail.id },
          data: { googleId: profile.sub, profilePic: profile.picture || byEmail.profilePic, provider: "GOOGLE" },
        });
      } else {
        // Create new account
        user = await prisma.user.create({
          data: {
            googleId: profile.sub,
            name: profile.name || profile.email.split("@")[0],
            email: profile.email,
            username: profile.email.split("@")[0],
            profilePic: profile.picture,
            provider: "GOOGLE",
          },
        });
      }
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name: profile.name || user.name, profilePic: profile.picture || user.profilePic },
      });
    }

    issueToken(res, user.id);
    res.status(200).json({
      message: "Logged in successfully",
      user: { id: user.id, name: user.name, email: user.email, username: user.username, profilePic: user.profilePic },
    });
  } catch (error) {
    console.error("Google Auth Error:", error);
    res.status(500).json({ message: "Google Authentication failed" });
  }
};


// ─── GitHub OAuth ─────────────────────────────────────────────────────────────

// @desc    Initiate GitHub OAuth
// @route   GET /auth/github
// @access  Public
export const githubAuth = (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: process.env.GITHUB_REDIRECT_URI,
    scope: "repo,user",
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
};

// @desc    GitHub OAuth Callback
// @route   GET /auth/github/callback
// @access  Public
export const githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.redirect(`${CLIENT_URL}/auth?error=github_no_code`);

    // 1. Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) throw new Error("Failed to obtain GitHub access token");

    // 2. Fetch GitHub user
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const githubUser = await userRes.json();
    if (!githubUser?.id) throw new Error("Failed to fetch GitHub user");

    // Fetch user's emails if primary email is private/null
    let primaryEmail = githubUser.email;
    if (!primaryEmail) {
      try {
        const emailRes = await fetch("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const emails = await emailRes.json();
        const primary = emails.find((e) => e.primary);
        if (primary) {
          primaryEmail = primary.email;
        }
      } catch (e) {
        console.error("Failed to fetch GitHub emails", e);
      }
    }
    const fallbackEmail = `${githubUser.login}@github.users.noreply.com`;
    const finalEmail = primaryEmail || fallbackEmail;

    // 3. Check if user is already logged in via cookie
    let currentUser = null;
    if (req.cookies?.token) {
      try {
        const decoded = jwt.verify(req.cookies.token, JWT_SECRET);
        currentUser = await prisma.user.findUnique({ where: { id: decoded.id } });
      } catch (e) {
        // Token invalid or expired, ignore
      }
    }

    // 4. Upsert or Link user
    let user;
    if (currentUser) {
      // Check if this GitHub account is already linked to a DIFFERENT user
      const existingGithubUser = await prisma.user.findUnique({ where: { githubId: githubUser.id.toString() } });
      
      if (existingGithubUser && existingGithubUser.id !== currentUser.id) {
        return res.redirect(`${CLIENT_URL}/auth?error=github_already_linked`);
      }

      // Link to existing logged-in account
      user = await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          githubId: githubUser.id.toString(),
          githubAccessToken: accessToken,
          username: currentUser.username || githubUser.login, // Keep existing if present
        },
      });
    } else {
      // Find by GitHub ID
      user = await prisma.user.findUnique({ where: { githubId: githubUser.id.toString() } });

      if (!user) {
        // Fallback: Link by email if email is provided and matches
        const byEmail = await prisma.user.findUnique({ where: { email: finalEmail } });

        if (byEmail) {
          user = await prisma.user.update({
            where: { id: byEmail.id },
            data: { githubId: githubUser.id.toString(), githubAccessToken: accessToken, provider: "GITHUB" },
          });
        } else {
          user = await prisma.user.create({
            data: {
              githubId: githubUser.id.toString(),
              username: githubUser.login,
              name: githubUser.name || githubUser.login,
              email: finalEmail,
              profilePic: githubUser.avatar_url,
              githubAccessToken: accessToken,
              provider: "GITHUB",
            },
          });
        }
      } else {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { githubAccessToken: accessToken, username: githubUser.login, name: githubUser.name || githubUser.login, profilePic: githubUser.avatar_url },
        });
      }
    }

    issueToken(res, user.id);
    res.redirect(`${CLIENT_URL}/dashboard`);
  } catch (error) {
    console.error("GitHub Auth Error:", error);
    res.redirect(`${CLIENT_URL}/auth?error=github_failed`);
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
