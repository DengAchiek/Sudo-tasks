"""Flask application for RoadLens authentication and the built frontend."""

import base64
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, g, jsonify, request, send_from_directory

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
METRICS_RETENTION_SECONDS = 90 * 24 * 60 * 60
PAGE_PATHS = {
    "/", "/login", "/register", "/analytics", "/analytics/accidents", "/analytics/hotspots",
    "/analytics/severity", "/analytics/risk-factors", "/analytics/predictions", "/analytics/emergency",
    "/analytics/reports", "/analytics/settings", "/analytics/admin",
}
last_metrics_cleanup_day = -1
AUTH_DB = Path(os.environ.get("ROADLENS_AUTH_DB", PROJECT_ROOT / "instance" / "roadlens.sqlite3"))
SESSION_COOKIE = "roadlens_session"
SESSION_LIFETIME = timedelta(days=14)
app = Flask(__name__, static_folder=str(FRONTEND_DIST / "assets"), static_url_path="/assets")


def connect_auth_db():
    AUTH_DB.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(AUTH_DB)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


@contextmanager
def auth_connection():
    connection = connect_auth_db()
    try:
        yield connection
        connection.commit()
    except Exception:
        connection.rollback()
        raise
    finally:
        connection.close()


def initialize_auth_db():
    with auth_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin'))
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);
            CREATE TABLE IF NOT EXISTS app_request_minutes (
                minute_start INTEGER NOT NULL,
                route TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                request_count INTEGER NOT NULL DEFAULT 0,
                duration_total_ms INTEGER NOT NULL DEFAULT 0,
                duration_max_ms INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (minute_start, route, status_code)
            ) WITHOUT ROWID;
            CREATE TABLE IF NOT EXISTS app_pageview_minutes (
                minute_start INTEGER NOT NULL,
                path TEXT NOT NULL,
                page_views INTEGER NOT NULL DEFAULT 0,
                PRIMARY KEY (minute_start, path)
            ) WITHOUT ROWID;
            CREATE TABLE IF NOT EXISTS app_active_user_minutes (
                minute_start INTEGER NOT NULL,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                PRIMARY KEY (minute_start, user_id)
            ) WITHOUT ROWID;
            CREATE INDEX IF NOT EXISTS app_request_minutes_start_idx ON app_request_minutes(minute_start);
            CREATE INDEX IF NOT EXISTS app_pageview_minutes_start_idx ON app_pageview_minutes(minute_start);
            CREATE INDEX IF NOT EXISTS app_active_user_minutes_start_idx ON app_active_user_minutes(minute_start);
            """
        )
        user_columns = {column["name"] for column in connection.execute("PRAGMA table_info(users)")}
        if "role" not in user_columns:
            connection.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'")


initialize_auth_db()


def utc_now():
    return datetime.now(timezone.utc)


def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
    return "scrypt${}${}".format(base64.urlsafe_b64encode(salt).decode("ascii"), base64.urlsafe_b64encode(digest).decode("ascii"))


def verify_password(password, password_hash):
    try:
        scheme, salt_text, digest_text = password_hash.split("$", 2)
        if scheme != "scrypt":
            return False
        salt = base64.urlsafe_b64decode(salt_text.encode("ascii"))
        expected = base64.urlsafe_b64decode(digest_text.encode("ascii"))
        actual = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1)
        return hmac.compare_digest(actual, expected)
    except (ValueError, TypeError):
        return False


def public_user(user):
    return {"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"] if "role" in user.keys() else "user"}


def metric_route(pathname):
    if pathname in PAGE_PATHS:
        return pathname
    if re.fullmatch(r"/api/auth/(login|register|me|logout)", pathname) or pathname == "/api/metrics/pageview":
        return pathname
    if re.fullmatch(r"/api/v1/[a-z0-9/_-]{1,80}", pathname):
        return pathname
    if pathname.startswith("/api/"):
        return "/api/other"
    if pathname.startswith("/assets/"):
        extension = pathname.rsplit(".", 1)[-1].lower() if "." in pathname else ""
        return f"/assets/*.{extension}" if extension in {"js", "css", "svg", "png", "jpg", "webp", "woff2"} else "/assets/*"
    return "/other"


def record_request_metric(pathname, status_code, duration_ms):
    global last_metrics_cleanup_day
    now = int(time.time())
    minute = now // 60 * 60
    duration = max(0, round(duration_ms))
    with auth_connection() as connection:
        connection.execute(
            """INSERT INTO app_request_minutes
               (minute_start, route, status_code, request_count, duration_total_ms, duration_max_ms)
               VALUES (?, ?, ?, 1, ?, ?)
               ON CONFLICT(minute_start, route, status_code) DO UPDATE SET
                 request_count = request_count + 1,
                 duration_total_ms = duration_total_ms + excluded.duration_total_ms,
                 duration_max_ms = MAX(duration_max_ms, excluded.duration_max_ms)""",
            (minute, metric_route(pathname), status_code, duration, duration),
        )
        day = minute // 86400
        if day != last_metrics_cleanup_day:
            cutoff = now - METRICS_RETENTION_SECONDS
            connection.execute("DELETE FROM app_request_minutes WHERE minute_start < ?", (cutoff,))
            connection.execute("DELETE FROM app_pageview_minutes WHERE minute_start < ?", (cutoff,))
            connection.execute("DELETE FROM app_active_user_minutes WHERE minute_start < ?", (cutoff,))
            last_metrics_cleanup_day = day


@app.before_request
def start_request_timer():
    g.request_started_at = time.perf_counter()


@app.after_request
def collect_request_metric(response):
    if request.path != "/api/admin/metrics":
        try:
            duration_ms = (time.perf_counter() - getattr(g, "request_started_at", time.perf_counter())) * 1000
            record_request_metric(request.path, response.status_code, duration_ms)
        except sqlite3.Error:
            app.logger.exception("Could not record aggregate request metrics")
    return response


def create_session(connection, user_id):
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("ascii")).hexdigest()
    expires_at = utc_now() + SESSION_LIFETIME
    connection.execute(
        "INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (token_hash, user_id, expires_at.isoformat()),
    )
    return token


def current_user():
    token = request.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    token_hash = hashlib.sha256(token.encode("ascii", errors="ignore")).hexdigest()
    with auth_connection() as connection:
        row = connection.execute(
            """
            SELECT users.id, users.name, users.email, users.role
            FROM auth_sessions
            JOIN users ON users.id = auth_sessions.user_id
            WHERE auth_sessions.token_hash = ? AND auth_sessions.expires_at > ?
            """,
            (token_hash, utc_now().isoformat()),
        ).fetchone()
    return public_user(row) if row else None


def set_session_cookie(response, token):
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=int(SESSION_LIFETIME.total_seconds()),
        httponly=True,
        secure=request.is_secure or os.environ.get("ROADLENS_COOKIE_SECURE", "").lower() == "true",
        samesite="Lax",
        path="/",
    )
    return response


@app.post("/api/auth/register")
def register():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="Submit your account details as JSON."), 400
    name = payload.get("name", "").strip() if isinstance(payload.get("name"), str) else ""
    email = payload.get("email", "").strip().lower() if isinstance(payload.get("email"), str) else ""
    password = payload.get("password", "") if isinstance(payload.get("password"), str) else ""

    if len(name) < 2 or len(name) > 80:
        return jsonify(error="Enter a name between 2 and 80 characters."), 400
    if len(email) > 254 or not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email):
        return jsonify(error="Enter a valid email address."), 400
    if len(password) < 10 or len(password) > 128:
        return jsonify(error="Use a password between 10 and 128 characters."), 400

    try:
        with auth_connection() as connection:
            cursor = connection.execute(
                "INSERT INTO users (name, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (name, email, hash_password(password), utc_now().isoformat()),
            )
            user = connection.execute("SELECT id, name, email, role FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
            token = create_session(connection, user["id"])
    except sqlite3.IntegrityError:
        return jsonify(error="An account with this email already exists. Sign in instead."), 409

    return set_session_cookie(jsonify(user=public_user(user)), token), 201


@app.post("/api/auth/login")
def login():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="Submit your sign-in details as JSON."), 400
    email = payload.get("email", "").strip().lower() if isinstance(payload.get("email"), str) else ""
    password = payload.get("password", "") if isinstance(payload.get("password"), str) else ""
    with auth_connection() as connection:
        user = connection.execute("SELECT id, name, email, role, password_hash FROM users WHERE email = ?", (email,)).fetchone()
        if not user or not verify_password(password, user["password_hash"]):
            return jsonify(error="Email or password is incorrect."), 401
        connection.execute("DELETE FROM auth_sessions WHERE expires_at <= ?", (utc_now().isoformat(),))
        token = create_session(connection, user["id"])
    return set_session_cookie(jsonify(user=public_user(user)), token)


@app.get("/api/auth/me")
def get_current_user():
    user = current_user()
    if not user:
        return jsonify(error="Sign in to access your dashboard."), 401
    return jsonify(user=user)


@app.post("/api/auth/logout")
def logout():
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        token_hash = hashlib.sha256(token.encode("ascii", errors="ignore")).hexdigest()
        with auth_connection() as connection:
            connection.execute("DELETE FROM auth_sessions WHERE token_hash = ?", (token_hash,))
    response = jsonify(status="signed_out")
    response.delete_cookie(SESSION_COOKIE, path="/", httponly=True, samesite="Lax")
    return response


@app.post("/api/metrics/pageview")
def record_pageview():
    origin = request.headers.get("Origin")
    if origin and origin.rstrip("/") != request.host_url.rstrip("/"):
        return jsonify(error="Cross-origin request rejected."), 403
    payload = request.get_json(silent=True)
    candidate = payload.get("path") if isinstance(payload, dict) else None
    path = candidate if isinstance(candidate, str) and candidate in PAGE_PATHS else "/other"
    minute = int(time.time()) // 60 * 60
    user = current_user()
    try:
        with auth_connection() as connection:
            connection.execute(
                """INSERT INTO app_pageview_minutes (minute_start, path, page_views) VALUES (?, ?, 1)
                   ON CONFLICT(minute_start, path) DO UPDATE SET page_views = page_views + 1""",
                (minute, path),
            )
            if user:
                connection.execute(
                    "INSERT OR IGNORE INTO app_active_user_minutes (minute_start, user_id) VALUES (?, ?)",
                    (minute, user["id"]),
                )
    except sqlite3.Error:
        app.logger.exception("Could not record aggregate page-view metrics")
        return jsonify(error="Page view could not be recorded."), 500
    return jsonify(recorded=True), 202


@app.get("/api/admin/metrics")
def admin_metrics():
    user = current_user()
    if not user:
        return jsonify(error="Sign in to access application metrics."), 401
    if user.get("role") != "admin":
        return jsonify(error="Administrator access is required."), 403

    requested_range = request.args.get("range")
    selected_range = requested_range if requested_range in {"7d", "30d"} else "24h"
    range_seconds = {"24h": 86400, "7d": 7 * 86400, "30d": 30 * 86400}[selected_range]
    bucket_seconds = 3600 if selected_range == "24h" else 86400
    now = int(time.time())
    now_minute = now // 60 * 60
    cutoff = now - range_seconds
    cutoff_iso = datetime.fromtimestamp(cutoff, timezone.utc).isoformat()

    try:
        with auth_connection() as connection:
            request_summary = connection.execute(
                """SELECT COALESCE(SUM(request_count), 0) AS requests,
                          COALESCE(SUM(CASE WHEN status_code >= 400 THEN request_count ELSE 0 END), 0) AS errors,
                          COALESCE(ROUND(SUM(duration_total_ms) * 1.0 / NULLIF(SUM(request_count), 0), 1), 0) AS average_response_ms,
                          COALESCE(MAX(duration_max_ms), 0) AS max_response_ms
                   FROM app_request_minutes WHERE minute_start >= ?""",
                (cutoff,),
            ).fetchone()
            request_timeline = connection.execute(
                """SELECT CAST(minute_start / ? AS INTEGER) * ? AS timestamp,
                          SUM(request_count) AS requests,
                          SUM(CASE WHEN status_code >= 400 THEN request_count ELSE 0 END) AS errors,
                          ROUND(SUM(duration_total_ms) * 1.0 / NULLIF(SUM(request_count), 0), 1) AS average_response_ms
                   FROM app_request_minutes WHERE minute_start >= ? GROUP BY timestamp ORDER BY timestamp""",
                (bucket_seconds, bucket_seconds, cutoff),
            ).fetchall()
            pageview_summary = connection.execute(
                "SELECT COALESCE(SUM(page_views), 0) AS page_views FROM app_pageview_minutes WHERE minute_start >= ?",
                (cutoff,),
            ).fetchone()
            pageview_timeline = connection.execute(
                """SELECT CAST(minute_start / ? AS INTEGER) * ? AS timestamp, SUM(page_views) AS page_views
                   FROM app_pageview_minutes WHERE minute_start >= ? GROUP BY timestamp ORDER BY timestamp""",
                (bucket_seconds, bucket_seconds, cutoff),
            ).fetchall()
            unique_users = connection.execute(
                "SELECT COUNT(DISTINCT user_id) AS count FROM app_active_user_minutes WHERE minute_start >= ?",
                (cutoff,),
            ).fetchone()["count"]
            active_users = connection.execute(
                "SELECT COUNT(DISTINCT user_id) AS count FROM app_active_user_minutes WHERE minute_start >= ?",
                (now_minute - 300,),
            ).fetchone()["count"]
            total_users = connection.execute("SELECT COUNT(*) AS count FROM users").fetchone()["count"]
            new_users = connection.execute("SELECT COUNT(*) AS count FROM users WHERE created_at >= ?", (cutoff_iso,)).fetchone()["count"]
            signup_timeline = connection.execute(
                """SELECT CAST(CAST(strftime('%s', created_at) AS INTEGER) / ? AS INTEGER) * ? AS timestamp,
                          COUNT(*) AS new_users FROM users WHERE created_at >= ? GROUP BY timestamp ORDER BY timestamp""",
                (bucket_seconds, bucket_seconds, cutoff_iso),
            ).fetchall()
            top_pages = connection.execute(
                """SELECT path, SUM(page_views) AS views FROM app_pageview_minutes WHERE minute_start >= ?
                   GROUP BY path ORDER BY views DESC LIMIT 8""",
                (cutoff,),
            ).fetchall()
            slow_routes = connection.execute(
                """SELECT route, SUM(request_count) AS requests,
                          SUM(CASE WHEN status_code >= 400 THEN request_count ELSE 0 END) AS errors,
                          ROUND(SUM(duration_total_ms) * 1.0 / NULLIF(SUM(request_count), 0), 1) AS average_response_ms,
                          MAX(duration_max_ms) AS max_response_ms
                   FROM app_request_minutes WHERE minute_start >= ? GROUP BY route
                   ORDER BY average_response_ms DESC LIMIT 8""",
                (cutoff,),
            ).fetchall()
            status_codes = connection.execute(
                """SELECT status_code AS status, SUM(request_count) AS requests FROM app_request_minutes
                   WHERE minute_start >= ? GROUP BY status_code ORDER BY status_code""",
                (cutoff,),
            ).fetchall()
    except sqlite3.Error:
        app.logger.exception("Could not load aggregate application metrics")
        return jsonify(error="Application metrics could not be loaded."), 500

    request_by_time = {row["timestamp"]: row for row in request_timeline}
    page_views_by_time = {row["timestamp"]: row["page_views"] for row in pageview_timeline}
    signups_by_time = {row["timestamp"]: row["new_users"] for row in signup_timeline}
    first_bucket = cutoff // bucket_seconds * bucket_seconds
    last_bucket = now // bucket_seconds * bucket_seconds
    timeline = []
    for timestamp in range(first_bucket, last_bucket + 1, bucket_seconds):
        request_bucket = request_by_time.get(timestamp)
        timeline.append({
            "timestamp": timestamp,
            "requests": request_bucket["requests"] if request_bucket else 0,
            "pageViews": page_views_by_time.get(timestamp, 0),
            "errors": request_bucket["errors"] if request_bucket else 0,
            "averageResponseMs": request_bucket["average_response_ms"] if request_bucket else 0,
            "newUsers": signups_by_time.get(timestamp, 0),
        })

    request_count = request_summary["requests"]
    error_count = request_summary["errors"]
    return jsonify(
        range=selected_range,
        generatedAt=utc_now().isoformat(),
        summary={
            "requests": request_count,
            "pageViews": pageview_summary["page_views"],
            "uniqueUsers": unique_users,
            "activeUsers": active_users,
            "totalUsers": total_users,
            "newUsers": new_users,
            "averageResponseMs": request_summary["average_response_ms"],
            "maxResponseMs": request_summary["max_response_ms"],
            "errors": error_count,
            "errorRate": round(error_count * 1000 / request_count) / 10 if request_count else 0,
        },
        timeline=timeline,
        topPages=[dict(row) for row in top_pages],
        slowRoutes=[{
            "route": row["route"], "requests": row["requests"], "errors": row["errors"],
            "averageResponseMs": row["average_response_ms"], "maxResponseMs": row["max_response_ms"],
        } for row in slow_routes],
        statusCodes=[dict(row) for row in status_codes],
    )


@app.get("/health")
def health_check():
    return jsonify(status="ok", application="RoadLens")


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def frontend(path: str):
    index_path = FRONTEND_DIST / "index.html"
    if not index_path.is_file():
        return jsonify(error="Frontend build not found", next_step="Run `cd frontend && npm install && npm run build`."), 503

    requested_path = (FRONTEND_DIST / path).resolve()
    if requested_path.is_file() and FRONTEND_DIST.resolve() in requested_path.parents:
        return send_from_directory(FRONTEND_DIST, requested_path.relative_to(FRONTEND_DIST.resolve()))
    return send_from_directory(FRONTEND_DIST, "index.html")


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
