import express from "express";
import {
  registerUser,
  loginUser,
  googleLogin,
  githubLogin,
  githubCallback,
  getMe,
  logout,
  refreshToken,
} from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/verifyJWT.middleware.js";

const router = express.Router();

// Email / Password
router.post("/register", registerUser);
router.post("/login", loginUser);

// Google OAuth (Frontend sends ID token)
router.post("/google", googleLogin);

// GitHub OAuth
router.get("/github", githubLogin);
router.get("/github/callback", githubCallback);

// Session
router.get("/me", verifyToken, getMe);
router.post("/logout", logout);
router.post("/refresh", refreshToken);

export default router;

