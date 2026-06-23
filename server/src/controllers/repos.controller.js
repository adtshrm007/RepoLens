import {
  fetchUserRepositories,
  fetchRepositoryDetails,
  fetchRepositoryTree,
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
    res.status(500).json({ message: "Failed to fetch repositories", error: error.message });
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
    res.status(500).json({ message: "Failed to fetch repository details", error: error.message });
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
    res.status(500).json({ message: "Failed to fetch repository tree", error: error.message });
  }
};
