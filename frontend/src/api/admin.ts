import type { AdminMetrics, AdminRange } from "../types/analytics";

export async function loadAdminMetrics(range: AdminRange, signal?: AbortSignal): Promise<AdminMetrics> {
  const response = await fetch(`/api/admin/metrics?range=${range}`, {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal,
  });
  const result = await response.json().catch(() => ({})) as AdminMetrics | { error?: string };
  if (!response.ok) {
    throw new Error("error" in result && result.error ? result.error : "Application metrics are unavailable.");
  }
  return result as AdminMetrics;
}
