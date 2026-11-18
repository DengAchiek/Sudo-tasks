interface D1Result {
  success: boolean;
  meta?: { last_row_id?: number };
}

interface D1Statement {
  bind(...values: Array<string | number>): D1Statement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  role?: "user" | "admin";
  password_hash?: string;
}

const SESSION_COOKIE = "roadlens_session";
const SESSION_SECONDS = 14 * 24 * 60 * 60;
// Cloudflare Workers Free allows 10 ms of CPU per request. This reduced work
// factor keeps registration usable on Free, but is weaker than OWASP's
// recommended 600,000 PBKDF2-HMAC-SHA256 iterations.
const PASSWORD_ITERATIONS = 40_000;
const encoder = new TextEncoder();
const METRICS_RETENTION_SECONDS = 90 * 24 * 60 * 60;
const PAGE_PATHS = new Set([
  "/", "/login", "/register", "/analytics", "/analytics/accidents", "/analytics/hotspots",
  "/analytics/severity", "/analytics/risk-factors", "/analytics/predictions", "/analytics/emergency",
  "/analytics/reports", "/analytics/settings", "/analytics/admin",
]);
let lastMetricsCleanupDay = -1;

function json(body: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  const headers = new Headers(extraHeaders);
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  return new Response(JSON.stringify(body), { status, headers });
}

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const result = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBuffer, iterations }, key, 256);
  return new Uint8Array(result);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const digest = await derivePassword(password, salt, PASSWORD_ITERATIONS);
  return `pbkdf2_sha256$${PASSWORD_ITERATIONS}$${encodeBase64Url(salt)}$${encodeBase64Url(digest)}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [algorithm, iterationText, saltText, digestText] = storedHash.split("$");
    const iterations = Number(iterationText);
    if (algorithm !== "pbkdf2_sha256" || !Number.isInteger(iterations) || iterations < 20_000 || iterations > 1_000_000 || !saltText || !digestText) return false;
    const expected = decodeBase64Url(digestText);
    const actual = await derivePassword(password, decodeBase64Url(saltText), iterations);
    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index += 1) difference |= actual[index] ^ expected[index];
    return difference === 0;
  } catch {
    return false;
  }
}

function sessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get("Cookie") ?? "";
  for (const cookie of cookieHeader.split(";")) {
    const [name, ...valueParts] = cookie.trim().split("=");
    if (name === SESSION_COOKIE) return valueParts.join("=") || null;
  }
  return null;
}

function sessionCookie(token: string, request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Max-Age=${SESSION_SECONDS}; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function expiredCookie(request: Request): string {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${secure}`;
}

function publicUser(user: UserRow) {
  return { id: user.id, name: user.name, email: user.email, role: user.role === "admin" ? "admin" as const : "user" as const };
}

async function requestUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = sessionToken(request);
  if (!token) return null;
  return env.DB.prepare(
    "SELECT users.id, users.name, users.email, users.role FROM auth_sessions JOIN users ON users.id = auth_sessions.user_id WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?",
  ).bind(await sha256(token), Math.floor(Date.now() / 1000)).first<UserRow>();
}

function metricRoute(pathname: string): string {
  if (PAGE_PATHS.has(pathname)) return pathname;
  if (/^\/api\/auth\/(?:login|register|me|logout)$/u.test(pathname)) return pathname;
  if (pathname === "/api/metrics/pageview") return pathname;
  if (/^\/api\/v1\/[a-z0-9/_-]{1,80}$/u.test(pathname)) return pathname;
  if (pathname.startsWith("/api/")) return "/api/other";
  if (pathname.startsWith("/assets/")) {
    const extension = pathname.split(".").at(-1)?.toLowerCase();
    return extension && ["js", "css", "svg", "png", "jpg", "webp", "woff2"].includes(extension)
      ? `/assets/*.${extension}`
      : "/assets/*";
  }
  return "/other";
}

async function recordRequestMetric(env: Env, pathname: string, status: number, durationMs: number): Promise<void> {
  const now = Math.floor(Date.now() / 60_000) * 60;
  const day = Math.floor(now / 86_400);
  const statements = [env.DB.prepare(
    "INSERT INTO app_request_minutes (minute_start, route, status_code, request_count, duration_total_ms, duration_max_ms) VALUES (?, ?, ?, 1, ?, ?) ON CONFLICT(minute_start, route, status_code) DO UPDATE SET request_count = request_count + 1, duration_total_ms = duration_total_ms + excluded.duration_total_ms, duration_max_ms = MAX(duration_max_ms, excluded.duration_max_ms)",
  ).bind(now, metricRoute(pathname), status, Math.max(0, Math.round(durationMs)), Math.max(0, Math.round(durationMs)))];

  if (day !== lastMetricsCleanupDay) {
    lastMetricsCleanupDay = day;
    const cutoff = now - METRICS_RETENTION_SECONDS;
    statements.push(env.DB.prepare("DELETE FROM app_request_minutes WHERE minute_start < ?").bind(cutoff));
    statements.push(env.DB.prepare("DELETE FROM app_pageview_minutes WHERE minute_start < ?").bind(cutoff));
    statements.push(env.DB.prepare("DELETE FROM app_active_user_minutes WHERE minute_start < ?").bind(cutoff));
  }
  await Promise.all(statements.map((statement) => statement.run()));
}

async function handlePageView(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") return json({ error: "Page-view method not allowed." }, 405, { Allow: "POST" });
  if (!validOrigin(request)) return json({ error: "Cross-origin request rejected." }, 403);
  let payload: unknown;
  try { payload = await request.json(); } catch { return json({ error: "Submit a page path as JSON." }, 400); }
  const candidate = payload && typeof payload === "object" && !Array.isArray(payload)
    ? (payload as Record<string, unknown>).path
    : null;
  const path = typeof candidate === "string" && PAGE_PATHS.has(candidate) ? candidate : "/other";
  const minute = Math.floor(Date.now() / 60_000) * 60;
  const user = await requestUser(request, env);
  const statements = [env.DB.prepare(
    "INSERT INTO app_pageview_minutes (minute_start, path, page_views) VALUES (?, ?, 1) ON CONFLICT(minute_start, path) DO UPDATE SET page_views = page_views + 1",
  ).bind(minute, path)];
  if (user) statements.push(env.DB.prepare("INSERT OR IGNORE INTO app_active_user_minutes (minute_start, user_id) VALUES (?, ?)").bind(minute, user.id));
  await Promise.all(statements.map((statement) => statement.run()));
  return json({ recorded: true }, 202);
}

async function handleAdminMetrics(request: Request, env: Env): Promise<Response> {
  if (request.method !== "GET") return json({ error: "Metrics method not allowed." }, 405, { Allow: "GET" });
  const user = await requestUser(request, env);
  if (!user) return json({ error: "Sign in to access application metrics." }, 401);
  if (user.role !== "admin") return json({ error: "Administrator access is required." }, 403);

  const url = new URL(request.url);
  const requestedRange = url.searchParams.get("range");
  const range = requestedRange === "7d" || requestedRange === "30d" ? requestedRange : "24h";
  const rangeSeconds = range === "24h" ? 86_400 : range === "7d" ? 7 * 86_400 : 30 * 86_400;
  const bucketSeconds = range === "24h" ? 3_600 : 86_400;
  const now = Math.floor(Date.now() / 1000);
  const cutoff = now - rangeSeconds;
  const nowMinute = Math.floor(now / 60) * 60;
  const requestSummaryQuery = env.DB.prepare(
    "SELECT COALESCE(SUM(request_count), 0) AS requests, COALESCE(SUM(CASE WHEN status_code >= 400 THEN request_count ELSE 0 END), 0) AS errors, COALESCE(ROUND(SUM(duration_total_ms) * 1.0 / NULLIF(SUM(request_count), 0), 1), 0) AS average_response_ms, COALESCE(MAX(duration_max_ms), 0) AS max_response_ms FROM app_request_minutes WHERE minute_start >= ?",
  ).bind(cutoff);
  const requestTimelineQuery = env.DB.prepare(
    "SELECT CAST(minute_start / ? AS INTEGER) * ? AS timestamp, SUM(request_count) AS requests, SUM(CASE WHEN status_code >= 400 THEN request_count ELSE 0 END) AS errors, ROUND(SUM(duration_total_ms) * 1.0 / NULLIF(SUM(request_count), 0), 1) AS average_response_ms FROM app_request_minutes WHERE minute_start >= ? GROUP BY timestamp ORDER BY timestamp",
  ).bind(bucketSeconds, bucketSeconds, cutoff);
  const pageviewSummaryQuery = env.DB.prepare("SELECT COALESCE(SUM(page_views), 0) AS page_views FROM app_pageview_minutes WHERE minute_start >= ?").bind(cutoff);
  const pageviewTimelineQuery = env.DB.prepare(
    "SELECT CAST(minute_start / ? AS INTEGER) * ? AS timestamp, SUM(page_views) AS page_views FROM app_pageview_minutes WHERE minute_start >= ? GROUP BY timestamp ORDER BY timestamp",
  ).bind(bucketSeconds, bucketSeconds, cutoff);
  const uniqueUsersQuery = env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM app_active_user_minutes WHERE minute_start >= ?").bind(cutoff);
  const activeUsersQuery = env.DB.prepare("SELECT COUNT(DISTINCT user_id) AS count FROM app_active_user_minutes WHERE minute_start >= ?").bind(nowMinute - 300);
  const totalUsersQuery = env.DB.prepare("SELECT COUNT(*) AS count FROM users");
  const newUsersQuery = env.DB.prepare("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?").bind(cutoff);
  const signupTimelineQuery = env.DB.prepare(
    "SELECT CAST(created_at / ? AS INTEGER) * ? AS timestamp, COUNT(*) AS new_users FROM users WHERE created_at >= ? GROUP BY timestamp ORDER BY timestamp",
  ).bind(bucketSeconds, bucketSeconds, cutoff);
  const topPagesQuery = env.DB.prepare(
    "SELECT path, SUM(page_views) AS views FROM app_pageview_minutes WHERE minute_start >= ? GROUP BY path ORDER BY views DESC LIMIT 8",
  ).bind(cutoff);
  const slowRoutesQuery = env.DB.prepare(
    "SELECT route, SUM(request_count) AS requests, SUM(CASE WHEN status_code >= 400 THEN request_count ELSE 0 END) AS errors, ROUND(SUM(duration_total_ms) * 1.0 / NULLIF(SUM(request_count), 0), 1) AS average_response_ms, MAX(duration_max_ms) AS max_response_ms FROM app_request_minutes WHERE minute_start >= ? GROUP BY route ORDER BY average_response_ms DESC LIMIT 8",
  ).bind(cutoff);
  const statusCodesQuery = env.DB.prepare(
    "SELECT status_code AS status, SUM(request_count) AS requests FROM app_request_minutes WHERE minute_start >= ? GROUP BY status_code ORDER BY status_code",
  ).bind(cutoff);

  const [requestSummary, requestTimeline, pageviewSummary, pageviewTimeline, uniqueUsers, activeUsers, totalUsers, newUsers, signupTimeline, topPages, slowRoutes, statusCodes] = await Promise.all([
    requestSummaryQuery.first<{ requests: number; errors: number; average_response_ms: number; max_response_ms: number }>(),
    requestTimelineQuery.all<{ timestamp: number; requests: number; errors: number; average_response_ms: number | null }>(),
    pageviewSummaryQuery.first<{ page_views: number }>(),
    pageviewTimelineQuery.all<{ timestamp: number; page_views: number }>(),
    uniqueUsersQuery.first<{ count: number }>(),
    activeUsersQuery.first<{ count: number }>(),
    totalUsersQuery.first<{ count: number }>(),
    newUsersQuery.first<{ count: number }>(),
    signupTimelineQuery.all<{ timestamp: number; new_users: number }>(),
    topPagesQuery.all<{ path: string; views: number }>(),
    slowRoutesQuery.all<{ route: string; requests: number; errors: number; average_response_ms: number; max_response_ms: number }>(),
    statusCodesQuery.all<{ status: number; requests: number }>(),
  ]);

  const requestByTime = new Map(requestTimeline.results.map((item) => [item.timestamp, item]));
  const pageViewsByTime = new Map(pageviewTimeline.results.map((item) => [item.timestamp, item.page_views]));
  const signupsByTime = new Map(signupTimeline.results.map((item) => [item.timestamp, item.new_users]));
  const firstBucket = Math.floor(cutoff / bucketSeconds) * bucketSeconds;
  const lastBucket = Math.floor(now / bucketSeconds) * bucketSeconds;
  const timeline = [];
  for (let timestamp = firstBucket; timestamp <= lastBucket; timestamp += bucketSeconds) {
    const requests = requestByTime.get(timestamp);
    timeline.push({
      timestamp,
      requests: requests?.requests ?? 0,
      pageViews: pageViewsByTime.get(timestamp) ?? 0,
      errors: requests?.errors ?? 0,
      averageResponseMs: requests?.average_response_ms ?? 0,
      newUsers: signupsByTime.get(timestamp) ?? 0,
    });
  }

  const requestCount = requestSummary?.requests ?? 0;
  const errorCount = requestSummary?.errors ?? 0;
  return json({
    range,
    generatedAt: new Date().toISOString(),
    summary: {
      requests: requestCount,
      pageViews: pageviewSummary?.page_views ?? 0,
      uniqueUsers: uniqueUsers?.count ?? 0,
      activeUsers: activeUsers?.count ?? 0,
      totalUsers: totalUsers?.count ?? 0,
      newUsers: newUsers?.count ?? 0,
      averageResponseMs: requestSummary?.average_response_ms ?? 0,
      maxResponseMs: requestSummary?.max_response_ms ?? 0,
      errors: errorCount,
      errorRate: requestCount ? Math.round((errorCount / requestCount) * 1000) / 10 : 0,
    },
    timeline,
    topPages: topPages.results,
    slowRoutes: slowRoutes.results.map((item) => ({ route: item.route, requests: item.requests, errors: item.errors, averageResponseMs: item.average_response_ms, maxResponseMs: item.max_response_ms })),
    statusCodes: statusCodes.results,
  });
}

async function createSession(env: Env, userId: number): Promise<string> {
  const token = encodeBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sha256(token);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  await env.DB.prepare("INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .bind(tokenHash, userId, expiresAt).run();
  return token;
}

function validOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function handleAuth(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (!validOrigin(request)) return json({ error: "Cross-origin request rejected." }, 403);

  if (path === "/api/auth/me" && request.method === "GET") {
    const user = await requestUser(request, env);
    return user ? json({ user: publicUser(user) }) : json({ error: "Sign in to access your dashboard." }, 401);
  }

  if (path === "/api/auth/logout" && request.method === "POST") {
    const token = sessionToken(request);
    if (token) await env.DB.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return json({ status: "signed_out" }, 200, { "Set-Cookie": expiredCookie(request) });
  }

  if ((path === "/api/auth/register" || path === "/api/auth/login") && request.method === "POST") {
    let payload: unknown;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Submit your account details as JSON." }, 400);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) return json({ error: "Submit your account details as JSON." }, 400);
    const fields = payload as Record<string, unknown>;
    const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
    const password = typeof fields.password === "string" ? fields.password : "";

    if (path === "/api/auth/register") {
      const name = typeof fields.name === "string" ? fields.name.trim() : "";
      if (name.length < 2 || name.length > 80) return json({ error: "Enter a name between 2 and 80 characters." }, 400);
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return json({ error: "Enter a valid email address." }, 400);
      if (password.length < 10 || password.length > 128) return json({ error: "Use a password between 10 and 128 characters." }, 400);

      const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first<{ id: number }>();
      if (existing) return json({ error: "An account with this email already exists. Sign in instead." }, 409);
      const passwordHash = await hashPassword(password);
      try {
        await env.DB.prepare("INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
          .bind(name, email, passwordHash, Math.floor(Date.now() / 1000)).run();
      } catch (error) {
        if (error instanceof Error && /unique constraint/iu.test(error.message)) return json({ error: "An account with this email already exists. Sign in instead." }, 409);
        throw error;
      }
    } else if (email.length > 254 || !email || password.length > 128) {
      return json({ error: "Email or password is incorrect." }, 401);
    }

    const user = await env.DB.prepare("SELECT id, name, email, role, password_hash FROM users WHERE email = ?").bind(email).first<UserRow>();
    const registering = path === "/api/auth/register";
    if (!user || (!registering && (!user.password_hash || !(await verifyPassword(password, user.password_hash))))) {
      return json({ error: "Email or password is incorrect." }, 401);
    }
    const token = await createSession(env, user.id);
    await env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)).run();
    return json({ user: publicUser(user) }, path.endsWith("register") ? 201 : 200, { "Set-Cookie": sessionCookie(token, request) });
  }

  return json({ error: "Authentication route not found." }, 404);
}

async function dispatch(request: Request, env: Env): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/api/admin/metrics") {
    try { return await handleAdminMetrics(request, env); }
    catch { return json({ error: "Application metrics could not be loaded." }, 500); }
  }
  if (pathname === "/api/metrics/pageview") {
    try { return await handlePageView(request, env); }
    catch { return json({ error: "Page view could not be recorded." }, 500); }
  }
  if (pathname.startsWith("/api/auth/")) {
    try { return await handleAuth(request, env); }
    catch { return json({ error: "The authentication service could not complete your request." }, 500); }
  }
  if (pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
  return env.ASSETS.fetch(request);
}

export default {
  async fetch(request: Request, env: Env, context: WorkerContext): Promise<Response> {
    const { pathname } = new URL(request.url);
    const startedAt = performance.now();
    let response: Response;
    try { response = await dispatch(request, env); }
    catch { response = json({ error: "The application could not complete your request." }, 500); }

    if (pathname !== "/api/admin/metrics") {
      const durationMs = performance.now() - startedAt;
      context.waitUntil(recordRequestMetric(env, pathname, response.status, durationMs).catch(() => undefined));
    }
    return response;
  },
};
