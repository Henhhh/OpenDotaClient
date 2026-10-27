import type { Success } from "../../../../shared/api-contract";
import { readToken } from "@/shared/auth/storage";
export type * from "../../../../shared/api-contract";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 0) {
    super(message);
    this.status = status;
  }
}
export const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1"
).replace(/\/$/, "");
export async function apiRequest<T>(
  path: string,
  options: {
    params?: Record<string, string | number | undefined>;
    signal?: AbortSignal;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  } = {},
): Promise<Success<T>> {
  const { params = {}, signal, method = "GET" } = options;
  const query = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(
      ([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
    )
    .join("&");
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(abort, 25000);
  try {
    const privateRequest = path.startsWith("/me/") || path.startsWith("/auth/");
    const token = privateRequest ? await readToken() : null;
    const response = await fetch(
      `${apiBaseUrl}${path}${query ? `?${query}` : ""}`,
      {
        signal: controller.signal,
        method,
        credentials: privateRequest ? "include" : "omit",
        headers: {
          ...(options.body !== undefined
            ? { "Content-Type": "application/json" }
            : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body:
          options.body !== undefined ? JSON.stringify(options.body) : undefined,
      },
    );
    if (response.status === 204)
      return {
        data: undefined as T,
        meta: {
          request_id: response.headers.get("X-Request-Id") ?? "",
          fetched_at: new Date().toISOString(),
          source: "database",
          stale: false,
          unavailable_fields: [],
        },
      };
    const body = await response.json();
    if (!response.ok)
      throw new ApiError(
        body.error?.message ?? "Request failed",
        response.status,
      );
    if (
      !body ||
      !Object.hasOwn(body, "data") ||
      typeof body.meta?.fetched_at !== "string"
    )
      throw new ApiError("Invalid API response", 502);
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted)
      throw new ApiError("Request cancelled or timed out. Please retry.");
    throw new ApiError(
      "Cannot reach the API. Check the connection and backend address.",
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
export function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
) {
  return apiRequest<T>(path, { params, signal });
}
