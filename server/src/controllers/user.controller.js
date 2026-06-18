import prisma from "../utils/prisma.util.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  isStrongPassword,
  isValidEmail,
  isValidName,
} from "../utils/auth.utils.js";
import { generateTokensAndLogin } from "../services/auth.service.js";

export const registerUser = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required." });
    }
    const existingUser = await prisma.user.findUnique({
      where: { email: email },
    });
    if (existingUser) {
      return res.status(400).json({ message: "User Already exist." });
    }
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
