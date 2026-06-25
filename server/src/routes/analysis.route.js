import express from "express";
import { 
  runAnalysis, getAnalysisHistory, getAnalysisById, runManualAnalysis, exploreManualCode, exploreRepoFile, generateDocs,
  getLatestMetrics, getLatestHealth, getLatestGraph, getLatestSecurity, getLatestOnboarding
} from "../controllers/analysis.controller.js";
import { verifyToken } from "../middleware/verifyJWT.middleware.js";

const router = express.Router();

router.use(verifyToken); // All analysis routes are protected

router.post("/run", runAnalysis);
router.post("/manual", runManualAnalysis);
router.post("/explore", exploreManualCode);
router.post("/explore-repo", exploreRepoFile);
router.post("/generate-docs", generateDocs);
router.get("/history", getAnalysisHistory);
router.get("/:id", getAnalysisById);

// V1.5 Endpoints
router.get("/repo/:repoId/latest/metrics", getLatestMetrics);
router.get("/repo/:repoId/latest/health", getLatestHealth);
router.get("/repo/:repoId/latest/graph", getLatestGraph);
router.get("/repo/:repoId/latest/security", getLatestSecurity);
router.get("/repo/:repoId/latest/onboarding", getLatestOnboarding);

export default router;
