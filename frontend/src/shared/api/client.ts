import type { Success } from "../../../../shared/api-contract";
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
export async function apiGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  signal?: AbortSignal,
): Promise<Success<T>> {
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
    const response = await fetch(
      `${apiBaseUrl}${path}${query ? `?${query}` : ""}`,
      { signal: controller.signal },
    );
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
