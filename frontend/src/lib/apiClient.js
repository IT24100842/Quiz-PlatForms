import { getToken } from "./authStorage";
import { localMockApiRequest } from "./localMockApi";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080";
const USE_LOCAL_API = String(import.meta.env.VITE_USE_LOCAL_API || "true").toLowerCase() !== "false";

async function safeJson(response) {
  try {
    return await response.json();
  } catch (error) {
    return null;
  }
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    includeAuth = true,
    headers = {},
  } = options;

  const requestHeaders = { ...headers };
  if (includeAuth) {
    requestHeaders["X-Auth-Token"] = getToken();
  }
  if (body !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (USE_LOCAL_API) {
    return localMockApiRequest(path, {
      method,
      body,
      headers: requestHeaders,
    });
  }

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    throw new Error(`Cannot reach server at ${API_BASE}. Make sure backend is running.`);
  }

  const payload = await safeJson(response);
  if (!response.ok) {
    const message = payload && payload.message ? payload.message : `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

export { API_BASE };
