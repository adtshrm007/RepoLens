import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.util.js";

/**
 * Generate JWT access + refresh tokens, set httpOnly cookies, and return user JSON.
 * Used for email/password and Google OAuth login.
 */
export const generateTokensAndLogin = async (user, res) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );

  const appRefreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { appRefreshToken },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", appRefreshToken, cookieOptions);

  return res.status(200).json({
    message: "User logged in successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      profilePic: user.profilePic,
    },
  });
};

/**
 * Generate JWT tokens, set httpOnly cookies, and REDIRECT to the dashboard.
 * Used specifically for GitHub OAuth callback flow.
 */
export const generateTokensAndRedirect = async (user, res) => {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
  );

  const appRefreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { appRefreshToken },
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie("accessToken", accessToken, cookieOptions);
  res.cookie("refreshToken", appRefreshToken, cookieOptions);

  // Redirect user to the dashboard after successful GitHub OAuth
  return res.redirect(`${process.env.CLIENT_URL}/dashboard`);
};
