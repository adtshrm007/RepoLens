import express from "express";
import {
  registerUser,
  loginUser,
  googleLogin,
  githubLogin,
  githubCallback,
  getMe,
  logout,
} from "../controllers/user.controller.js";
import { protect } from "../middleware/auth.middleware.js";

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
router.get("/me", protect, getMe);
router.post("/logout", logout);

export default router;
