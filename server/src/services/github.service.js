import { Octokit } from "octokit";

// Helper function to initialize Octokit with the user's access token
const getOctokit = (accessToken) => {
  return new Octokit({ auth: accessToken });
};

export const fetchUserRepositories = async (accessToken) => {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      per_page: 100,
    });
    return data;
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw new Error("Failed to fetch repositories from GitHub");
  }
};

export const fetchRepositoryDetails = async (accessToken, owner, repo) => {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    return data;
  } catch (error) {
    console.error("Error fetching repository details:", error);
    throw new Error("Failed to fetch repository details");
  }
};

export const fetchRepositoryTree = async (accessToken, owner, repo, path = "") => {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    const raw = Array.isArray(data) ? data : [data];
    // Normalize to the shape the frontend expects
    const files = raw.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type,   // "file" | "dir"
      size: item.size ?? 0,
    }));
    return { files };
  } catch (error) {
    console.error("Error fetching repository tree:", error);
    throw new Error("Failed to fetch repository tree");
  }
};

export const fetchFileContent = async (accessToken, owner, repo, path) => {
  const octokit = getOctokit(accessToken);
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (data.type === "file" && data.encoding === "base64") {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return content;
    }
    throw new Error("Invalid file content type");
  } catch (error) {
    console.error(`Error fetching file content for ${path}:`, error);
    throw new Error(`Failed to fetch content for file: ${path}`);
  }
};
