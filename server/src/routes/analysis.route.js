import express from "express";
import { 
  runAnalysis, getAnalysisHistory, getAnalysisById, runManualAnalysis, exploreManualCode, exploreRepoFile, generateDocs,
  getLatestMetrics, getLatestHealth, getLatestGraph, getLatestSecurity, getLatestOnboarding,
  getDashboardStats, compareScansByIds, askAIAssistant, globalSearch
} from "../controllers/analysis.controller.js";
import { verifyToken } from "../middleware/verifyJWT.middleware.js";

const router = express.Router();

router.use(verifyToken); // All analysis routes are protected

router.post("/run", runAnalysis);
router.post("/manual", runManualAnalysis);
router.post("/explore", exploreManualCode);
router.post("/explore-repo", exploreRepoFile);
router.post("/generate-docs", generateDocs);
router.post("/ask", askAIAssistant);
router.get("/history", getAnalysisHistory);
router.get("/dashboard-stats", getDashboardStats);
router.get("/compare", compareScansByIds);
router.get("/search", globalSearch);
router.get("/:id", getAnalysisById);

// V1.5 Endpoints
router.get("/repo/:repoId/latest/metrics", getLatestMetrics);
router.get("/repo/:repoId/latest/health", getLatestHealth);
router.get("/repo/:repoId/latest/graph", getLatestGraph);
router.get("/repo/:repoId/latest/security", getLatestSecurity);
router.get("/repo/:repoId/latest/onboarding", getLatestOnboarding);

export default router;
