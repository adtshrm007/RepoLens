import express from "express";
import { getRepos, getRepoDetails, getRepoFiles } from "../controllers/repos.controller.js";
import { protect } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(protect); // All repo routes are protected

router.get("/", getRepos);
router.get("/:owner/:repo", getRepoDetails);
router.get("/:owner/:repo/files", getRepoFiles);

export default router;
