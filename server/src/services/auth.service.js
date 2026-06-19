import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.util.js";

export const generateTokensAndLogin = async (user, res) => {
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
    },
  );

  const appRefreshToken = jwt.sign(
    {
      id: user.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
    },
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { appRefreshToken },
  });

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  res.cookie("refreshToken", appRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return res.status(200).json({
    message: "User logged in successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
};
