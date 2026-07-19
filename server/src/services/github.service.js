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
    if (error.status === 401) {
      const err = new Error("GITHUB_TOKEN_EXPIRED");
      err.status = 401;
      throw err;
    }
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
    if (error.status === 401) {
      const err = new Error("GITHUB_TOKEN_EXPIRED");
      err.status = 401;
      throw err;
    }
    console.error("Error fetching repository details:", error);
    throw new Error("Failed to fetch repository details");
  }
};

export const fetchRepositoryTree = async (accessToken, owner, repo, path = "") => {
  const octokit = getOctokit(accessToken);
  try {
    if (path) {
      // Lazy-load a specific subdirectory (used by Code Explorer folder click)
      const { data } = await octokit.rest.repos.getContent({
        owner,
        repo,
        path,
      });
      const items = Array.isArray(data) ? data : [data];
      const files = items
        .map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type === 'file' ? 'file' : 'dir',
          size: item.size || 0,
        }))
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
          return a.name.localeCompare(b.name);
        });
      return { files };
    }

    // Full recursive tree (used by scanner and repo scan)
    const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
    const defaultBranch = repoData.default_branch;

    const { data: treeData } = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: '1',
    });

    const files = treeData.tree.map((item) => ({
      name: item.path.split('/').pop(),
      path: item.path,
      type: item.type === 'blob' ? 'file' : 'dir',
      size: item.size || 0,
    }));
    return { files };
  } catch (error) {
    if (error.status === 401) {
      const err = new Error("GITHUB_TOKEN_EXPIRED");
      err.status = 401;
      throw err;
    }
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
      mediaType: {
        format: "raw",
      },
    });

    if (typeof data === "string") {
      return data;
    }
    // Fallback if it didn't return raw for some reason
    if (data.type === "file" && data.encoding === "base64") {
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      return content;
    }
    throw new Error("Invalid file content type");
  } catch (error) {
    if (error.status === 401) {
      const err = new Error("GITHUB_TOKEN_EXPIRED");
      err.status = 401;
      throw err;
    }
    console.error(`Error fetching file content for ${path}:`, error);
    throw new Error(`Failed to fetch content for file: ${path}`);
  }
};
