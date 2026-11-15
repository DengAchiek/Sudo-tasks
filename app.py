"""Flask production-style shell for serving the built RoadLens frontend."""

from pathlib import Path

from flask import Flask, jsonify, send_from_directory

PROJECT_ROOT = Path(__file__).resolve().parent
FRONTEND_DIST = PROJECT_ROOT / "frontend" / "dist"
app = Flask(__name__, static_folder=str(FRONTEND_DIST / "assets"), static_url_path="/assets")


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
