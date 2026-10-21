import { extractSavedRecord } from "./adminState.js";

const API_BASE = import.meta.env.VITE_API_URL || "";
export async function api(path, options = {}) {
  const token = localStorage.getItem("astratech_admin_token");
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;
  const headers = { ...(isFormData ? {} : { "Content-Type": "application/json" }), ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;
  let data;
  try {
    response = await fetch(`${API_BASE}/api${path}`, {
      ...options,
      signal: options.signal || controller.signal,
      headers
    });
    try {
      data = await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw error;
      throw new Error(`The server returned an invalid response (${response.status}).`);
    }
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The request timed out. Please try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const error = new Error(data.message || `Request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }

  const method = (options.method || "GET").toUpperCase();
  if (path === "/admin/contact") {
    if (method === "PUT") window.dispatchEvent(new Event("astratech:content-changed"));
  } else if (/^\/admin\/(courses|faculty|results|testimonials|notices|resources)(\/|$)/.test(path)) {
    if (["POST", "PUT"].includes(method)) data = extractSavedRecord(data);
    if (["POST", "PUT", "DELETE"].includes(method)) {
      window.dispatchEvent(new Event("astratech:content-changed"));
    }
  }
  return data;
}
export async function uploadImage(file) {
  const form = new FormData();
  form.append("image", file);
  const result = await api("/admin/images", { method: "POST", body: form });
  if (typeof result.image !== "string" || !result.image.startsWith("https://")) {
    throw new Error("The server did not return a permanent HTTPS image URL.");
  }
  return result.image;
}
export function imageUrl(image) {
  return image || "";
}
export const imageFallback = "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85";
