import dotenv from "dotenv";
dotenv.config();

import express from "express";
const app = express();
app.use(express.json());

import cookieParser from "cookie-parser";
app.use(cookieParser());

import cors from "cors";
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true, // allow cookies
  }),
);

import prisma from "./src/utils/prisma.util.js";

const port = process.env.PORT || 3000;

// ── Routes ─────────────────────────────────────────────────────
import userRouter from "./src/routes/user.route.js";
import reposRouter from "./src/routes/repos.route.js";
import analysisRouter from "./src/routes/analysis.route.js";
import scanRouter from "./src/routes/scan.routes.js";

app.use("/auth", userRouter);
app.use("/repos", reposRouter);
app.use("/analysis", analysisRouter);
app.use("/scan", scanRouter);

// ── Health Check ────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── 404 Handler ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found." });
});

// ── Global Error Handler ─────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal Server Error." });
});

// ── Start Server ─────────────────────────────────────────────────
app.listen(port, async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    console.log(`🚀 Server running at http://localhost:${port}`);
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    process.exit(1);
  }
});
