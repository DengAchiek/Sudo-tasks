# ROAD-SAFETY-NAIROBI

A data science and software project for analysing road-safety patterns in Nairobi, Kenya.

## Project goals
- Collect and document relevant road-safety data.
- Clean and explore crash, road, traffic, and environmental data.
- Identify patterns and potential risk factors.
- Develop and evaluate machine-learning models where the data supports them.
- Analyse crash locations and spatial hotspots.
- Build an API, dashboard, and final project report.

## Repository structure
See the folder structure in this repository. Raw data should remain unchanged; store cleaned outputs in `data/interim/` or `data/processed/`.

## Getting started
1. Create and activate a virtual environment.
2. Install dependencies with `pip install -r requirements.txt`.
3. Add permitted source datasets to `data/raw/` and record their sources, dates, licences, and limitations.
4. Work through the notebooks in numerical order.

## RoadLens web application

The public RoadLens landing page is the root route. The analytics workspace is available at `/analytics` with separate pages for accident analysis, hotspots, severity, risk factors, predictions, emergency response, community reports, and methodology.

Start the Flask authentication service from the project root in one terminal:

```bash
python app.py
```

Then start the React and Vite development server in another terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://127.0.0.1:5173>. The analytics client uses typed API services. Until a backend URL is configured, it uses clearly labeled illustrative responses. Set `VITE_API_BASE_URL` from `frontend/.env.example` to connect an analytics API. Login and registration use the Flask service at `/api/auth`; accounts are stored in `instance/roadlens.sqlite3` and passwords are stored as scrypt hashes. New accounts need a name, email address, and password of at least 10 characters. Authentication uses an HTTP-only session cookie, and all `/analytics` pages require a valid session. Set `ROADLENS_COOKIE_SECURE=true` when serving over HTTPS. The Flask app serves the built frontend and handles authentication at <http://127.0.0.1:5000>. No dataset upload or training interface is included.

Create a static frontend build with `npm run build`. The Flask shell in `app.py` can serve the built app at <http://127.0.0.1:5000>. The existing FastAPI scaffold remains available separately at `backend/main.py`.

## Responsible use
This project is for research and decision support. Do not treat model outputs as definitive evidence of individual driver behaviour or as a substitute for official road-safety decisions. Protect personal and sensitive information.
