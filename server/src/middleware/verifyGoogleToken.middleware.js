import { googleClient } from "../utils/google.util.js";

export const verifyGoogleToken = async (accessToken) => {
  // getTokenInfo validates the access_token and returns user info (email, sub, etc.)
  const tokenInfo = await googleClient.getTokenInfo(accessToken);
  return tokenInfo;
};