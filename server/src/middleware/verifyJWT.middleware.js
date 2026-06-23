import jwt from "jsonwebtoken";
import prisma from "../utils/prisma.util.js";

export const verifyToken = async (req, res, next) => {
  try {
    const token = req.cookies?.accessToken;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized - No token" });
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        provider: true,
        profilePic: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid Token" });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token verification failed" });
  }
};
