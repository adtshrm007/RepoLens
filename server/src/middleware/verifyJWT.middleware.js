import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.util.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Strip sensitive fields before attaching to request
    const { password, githubAccessToken, githubRefreshToken, appRefreshToken, ...safeUser } = user;
    req.user = safeUser;

    return next();
  } catch (error) {
    console.error("verifyToken error:", error.message);
    return res.status(401).json({ message: "Token verification failed" });
  }
};
