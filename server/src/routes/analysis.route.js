import express from "express";
import { runAnalysis, getAnalysisHistory, getAnalysisById, runManualAnalysis, exploreManualCode, exploreRepoFile, generateDocs } from "../controllers/analysis.controller.js";
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

export default router;
