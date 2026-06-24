import express from "express";
import { getRepos, getRepoDetails, getRepoFiles, getRepoTechStack } from "../controllers/repos.controller.js";
import { verifyToken } from "../middleware/verifyJWT.middleware.js";

const router = express.Router();

router.use(verifyToken); // All repo routes are protected

router.get("/", getRepos);
router.get("/:owner/:repo", getRepoDetails);
router.get("/:owner/:repo/files", getRepoFiles);
router.get("/:owner/:repo/tech-stack", getRepoTechStack);

export default router;

