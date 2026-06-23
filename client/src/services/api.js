import axios from "axios";

// Axios instance with base URL and cookie credentials
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true, // send JWT cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Response interceptor: redirect to /auth on 401 (except when already on auth page)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
    }
    return Promise.reject(error);
  },
);

export default api;
