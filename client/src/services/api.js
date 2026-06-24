import axios from "axios";

// Axios instance with base URL and cookie credentials
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true, // send JWT cookies with every request
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || "";
    const is401 = error.response?.status === 401;
    const isAuthCheck = url.includes("/auth/me") || url.includes("/auth/login") || url.includes("/auth/register");
    const isAuthPage = window.location.pathname.startsWith("/auth");

    if (is401 && !isAuthCheck) {
      if (originalRequest.url.includes("/auth/refresh")) {
        // Refresh token failed. Clean up and redirect to login.
        if (!isAuthPage) {
          window.location.href = "/auth";
        }
        return Promise.reject(error);
      }

      if (!originalRequest._retry) {
        if (isRefreshing) {
          return new Promise(function (resolve, reject) {
            failedQueue.push({ resolve, reject });
          })
            .then(() => {
              return api(originalRequest);
            })
            .catch((err) => {
              return Promise.reject(err);
            });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          await api.post("/auth/refresh");
          processQueue(null, "Refreshed");
          return api(originalRequest);
        } catch (err) {
          processQueue(err, null);
          if (!isAuthPage) {
            window.location.href = "/auth";
          }
          return Promise.reject(err);
        } finally {
          isRefreshing = false;
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
