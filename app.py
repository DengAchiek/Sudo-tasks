"""Flask application for RoadLens authentication and the built frontend."""

import base64
import hashlib
import hmac
import os
import re
import secrets
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
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
                created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS auth_sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx ON auth_sessions(expires_at);
            """
        )


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
    return {"id": user["id"], "name": user["name"], "email": user["email"]}


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
            SELECT users.id, users.name, users.email
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
            user = connection.execute("SELECT id, name, email FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
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
        user = connection.execute("SELECT id, name, email, password_hash FROM users WHERE email = ?", (email,)).fetchone()
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
