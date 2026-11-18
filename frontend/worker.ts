interface D1Result {
  success: boolean;
  meta?: { last_row_id?: number };
}

interface D1Statement {
  bind(...values: Array<string | number>): D1Statement;
  first<T>(): Promise<T | null>;
  run(): Promise<D1Result>;
}

interface D1Database {
  prepare(query: string): D1Statement;
}

interface Env {
  DB: D1Database;
  ASSETS: { fetch(request: Request): Promise<Response> };
}

interface UserRow {
  id: number;
  name: string;
  email: string;
  password_hash?: string;
}

const SESSION_COOKIE = "roadlens_session";
const SESSION_SECONDS = 14 * 24 * 60 * 60;
// Cloudflare Workers Free allows 10 ms of CPU per request. This reduced work
// factor keeps registration usable on Free, but is weaker than OWASP's
// recommended 600,000 PBKDF2-HMAC-SHA256 iterations.
const PASSWORD_ITERATIONS = 40_000;
const encoder = new TextEncoder();

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
    const token = sessionToken(request);
    if (!token) return json({ error: "Sign in to access your dashboard." }, 401);
    const user = await env.DB.prepare(
      "SELECT users.id, users.name, users.email FROM auth_sessions JOIN users ON users.id = auth_sessions.user_id WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?",
    ).bind(await sha256(token), Math.floor(Date.now() / 1000)).first<Omit<UserRow, "password_hash">>();
    return user ? json({ user }) : json({ error: "Sign in to access your dashboard." }, 401);
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

    const user = await env.DB.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").bind(email).first<UserRow>();
    const registering = path === "/api/auth/register";
    if (!user || (!registering && (!user.password_hash || !(await verifyPassword(password, user.password_hash))))) {
      return json({ error: "Email or password is incorrect." }, 401);
    }
    const token = await createSession(env, user.id);
    await env.DB.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(Math.floor(Date.now() / 1000)).run();
    const publicUser = { id: user.id, name: user.name, email: user.email };
    return json({ user: publicUser }, path.endsWith("register") ? 201 : 200, { "Set-Cookie": sessionCookie(token, request) });
  }

  return json({ error: "Authentication route not found." }, 404);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith("/api/auth/")) {
      try {
        return await handleAuth(request, env);
      } catch {
        return json({ error: "The authentication service could not complete your request." }, 500);
      }
    }
    if (pathname.startsWith("/api/")) return json({ error: "API route not found." }, 404);
    return env.ASSETS.fetch(request);
  },
};
