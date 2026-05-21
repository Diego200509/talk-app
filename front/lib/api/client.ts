import axios, { type AxiosError } from "axios";
import { useAuthStore } from "@/stores/auth-store";
import { disconnectSocket } from "@/lib/socket";

const baseURL = `${process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:5001"}/api`;

export const apiClient = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

const AUTH_PUBLIC_PATHS = ["/auth/login", "/auth/register", "/auth/forgot-password", "/auth/reset-password"];

function isAuthPublicRequest(url?: string) {
  if (!url) return false;
  return AUTH_PUBLIC_PATHS.some((path) => url.includes(path));
}

function redirectToLogin() {
  if (typeof window === "undefined") return;
  const path = window.location.pathname;
  if (path.startsWith("/login") || path.startsWith("/registro") || path.startsWith("/recuperar") || path.startsWith("/restablecer")) {
    return;
  }
  window.location.replace("/login");
}

let handlingUnauthorized = false;

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url ?? "";

    if (status === 401 && !isAuthPublicRequest(requestUrl) && !handlingUnauthorized) {
      handlingUnauthorized = true;
      useAuthStore.getState().clearSession();
      disconnectSocket();
      redirectToLogin();
      setTimeout(() => {
        handlingUnauthorized = false;
      }, 500);
    }

    return Promise.reject(error);
  }
);
