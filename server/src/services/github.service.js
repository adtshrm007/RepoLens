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
    // Use GitHub Contents API — returns only the immediate children of `path`
    // (not recursive), so folders and files are correctly separated.
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,          // empty string = repo root
    });

    // getContent returns an array for directories, an object for files.
    // We always call it on a directory path, so data will be an array.
    const items = Array.isArray(data) ? data : [data];

    const files = items.map((item) => ({
      name: item.name,          // just the filename, no path prefix
      path: item.path,          // full path from repo root
      type: item.type === 'file' ? 'file' : 'dir',
      size: item.size || 0,
    }));

    // Sort: directories first, then files, both alphabetically
    files.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    return { files };
  } catch (error) {
    if (error.status === 401) {
      const err = new Error("GITHUB_TOKEN_EXPIRED");
      err.status = 401;
      throw err;
    }
    console.error("Error fetching repository contents:", error);
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
