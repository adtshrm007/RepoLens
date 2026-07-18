import {
  fetchUserRepositories,
  fetchRepositoryDetails,
  fetchRepositoryTree,
  fetchFileContent,
} from "../services/github.service.js";
import prisma from "../utils/prisma.util.js";

// @desc    Get user's repositories
// @route   GET /repos
// @access  Private
export const getRepos = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubAccessToken) {
      return res.status(200).json([]);
    }

    const repos = await fetchUserRepositories(user.githubAccessToken);
    res.json(repos);
  } catch (error) {
    if (error.message === "GITHUB_TOKEN_EXPIRED") {
      return res.status(403).json({ code: "GITHUB_TOKEN_EXPIRED", message: "Your GitHub connection has expired." });
    }
    console.error("Fetch Repos Error:", error);
    res.status(500).json({ message: "Failed to fetch repositories" });
  }
};

// @desc    Get repository details
// @route   GET /repos/:owner/:repo
// @access  Private
export const getRepoDetails = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubAccessToken) {
      return res.status(403).json({ message: "GitHub access token missing" });
    }

    const repoDetails = await fetchRepositoryDetails(user.githubAccessToken, owner, repo);
    res.json(repoDetails);
  } catch (error) {
    if (error.message === "GITHUB_TOKEN_EXPIRED") {
      return res.status(403).json({ code: "GITHUB_TOKEN_EXPIRED", message: "Your GitHub connection has expired." });
    }
    console.error("Fetch Repo Details Error:", error);
    res.status(500).json({ message: "Failed to fetch repository details" });
  }
};

// @desc    Get repository files tree
// @route   GET /repos/:owner/:repo/files
// @access  Private
export const getRepoFiles = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path } = req.query;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubAccessToken) {
      return res.status(403).json({ message: "GitHub access token missing" });
    }

    const repoTree = await fetchRepositoryTree(user.githubAccessToken, owner, repo, path || "");
    res.json(repoTree);
  } catch (error) {
    if (error.message === "GITHUB_TOKEN_EXPIRED") {
      return res.status(403).json({ code: "GITHUB_TOKEN_EXPIRED", message: "Your GitHub connection has expired." });
    }
    console.error("Fetch Repo Files Error:", error);
    res.status(500).json({ message: "Failed to fetch repository files" });
  }
};

// @desc    Get repository tech stack (package.json)
// @route   GET /repos/:owner/:repo/tech-stack
// @access  Private
export const getRepoTechStack = async (req, res) => {
  try {
    const { owner, repo } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user || !user.githubAccessToken) {
      return res.status(403).json({ message: "GitHub access token missing" });
    }

    let packageJsonData = { dependencies: {}, devDependencies: {}, scripts: {} };
    try {
      // Directly fetch the root package.json — most repos only have one
      const content = await fetchFileContent(user.githubAccessToken, owner, repo, "package.json");
      if (content) {
        const parsed = JSON.parse(content);
        packageJsonData.dependencies = parsed.dependencies || {};
        packageJsonData.devDependencies = parsed.devDependencies || {};
        packageJsonData.scripts = parsed.scripts || {};
      }
    } catch (e) {
      // package.json might not exist or parsing failed — return empty
      console.log("Could not fetch package.json:", e.message);
    }

    res.json(packageJsonData);
  } catch (error) {
    if (error.message === "GITHUB_TOKEN_EXPIRED") {
      return res.status(403).json({ code: "GITHUB_TOKEN_EXPIRED", message: "Your GitHub connection has expired." });
    }
    console.error("Fetch Tech Stack Error:", error);
    res.status(500).json({ message: "Failed to fetch tech stack" });
  }
};
