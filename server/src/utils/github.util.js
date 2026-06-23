import axios from "axios";
import { Octokit } from "octokit";

/**
 * Exchange GitHub OAuth code for an access token
 */
export const getGitHubAccessToken = async (code) => {
  const tokenResponse = await axios.post(
    "https://github.com/login/oauth/access_token",
    {
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    },
    {
      headers: {
        Accept: "application/json",
      },
    },
  );
  return tokenResponse;
};

/**
 * Create an authenticated Octokit instance for a given GitHub access token
 */
export const createOctokit = (accessToken) => {
  return new Octokit({ auth: accessToken });
};
