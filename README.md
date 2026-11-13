# Spatio-Temporal Analysis of Crash Hotspots and Emergency Response Route Optimization in Nairobi

**Capstone Project: Nairobi Road Safety Analysis, Accident Hotspot Detection & Emergency Response Route Optimization**

Project Category: Data Science | Machine Learning | Geospatial Analytics | Backend Development | Business Intelligence

Team Size: 5 Members | Time Frame: 4 weeks | Project Management: GitHub Projects, GitHub Issues and GitHub Repository

---

## 1. Project Overview

The objective of this project is to leverage data science, machine learning, geospatial analysis and route optimization to investigate road safety challenges in Nairobi, Kenya.

The system will analyze historical road accident data, identify accident hotspots, investigate factors contributing to accidents, predict accident risk and recommend optimized routes for emergency response teams.

The final solution will include:

- A cleaned and structured road accident dataset.
- Exploratory data analysis and visualizations.
- Machine learning models for accident risk and severity analysis.
- Interactive accident hotspot maps.
- Emergency response route optimization.
- A web application for community accident reporting and route recommendations.
- Interactive dashboards for decision-makers.

---

## 2. Team Structure and Responsibilities

| Member | Department | Assigned responsibilities |
|---|---|---|
| Member 1 | Data Engineering & Analytics | Data cleaning, preprocessing, weather data, EDA, charts, emergency facility data |
| Member 2 | Machine Learning | Predictive modelling and model evaluation |
| Member 3 | Geospatial Engineering | Maps, hotspot detection, road network and route optimization |
| Member 4 | Backend & Application Development | Web application and API development |
| Member 5 | Project Lead, Business Intelligence & Documentation | Task board, PR reviews, dashboards, technical writing and presentation |

Every member writes up their own section of the final report. Member 5 compiles it.

---

## 3. Timeline (4 weeks)

| Week | Activities | Main contributors |
|---|---|---|
| 1 | Repo setup, data inspection, data cleaning, research, backend foundation | All members |
| 2 | Feature engineering, EDA, baseline model, hotspot detection, road network, reporting API | Members 1, 2, 3, 4 |
| 3 | Model comparison and evaluation, emergency routing, APIs, web app, dashboards | Members 2, 3, 4, 5 |
| 4 | Integration, testing, final report, presentation and demonstration | All members |

---

## 4. Issues per Member

Priority: **P0** = critical, **P1** = high, **P2** = medium, **P3** = low.

### Member 1: Data Engineering & Analytics - Moret

| # | Issue | Priority |
|---|---|---|
| 01 | Dataset collection and inspection (both datasets, CSV/SPSS/Stata, columns, missing values, duplicates, date coverage, manual vs algorithm differences, data quality report) | P0 |
| 02 | Data cleaning and preprocessing (standardize columns, dates and times, missing values, duplicates, validate coordinates, merge datasets accounting for overlapping periods, save cleaned data) | P0 |
| 03 | Feature engineering (year, month, day of week, hour, time of day, weekend/weekday, standardize road user categories, prepare ML features, data dictionary) | P1 |
| 04 | Weather data: pull from Open-Meteo Historical Weather API and join to crashes | P1 |
| 05 | Exploratory data analysis and 8-12 charts (trends, day, hour, road user, top locations, correlation heatmap, monthly patterns) | P0 |
| 06 | Emergency facilities dataset: hospitals and emergency facilities from OpenStreetMap | P1 |

**When we get the NTSA data:**
- Accident severity categories (Issue 03) and severity analysis in EDA (Issue 05), once severity data is available.
- Ambulance station locations (Issue 06), once the data is available.
- Traffic level feature (Issue 03), once traffic data is available.
- Extend the master dataset with NTSA 2024-2026 data (Issues 01, 02), once approved.

### Member 2: Machine Learning - Brandon

| # | Issue | Priority |
|---|---|---|
| 07 | Define machine learning problems (target variables, accident occurrence vs severity, independent variables, train/validation/test strategy, class imbalance) | P0 |
| 08 | Logistic Regression baseline | P0 |
| 09 | Model evaluation (accuracy, precision, recall, F1, ROC AUC, confusion matrices, over/underfitting, limitations) | P0 |
| 10 | Random Forest (tuning, confusion matrix, feature importance, comparison) | P1 |
| 11 | XGBoost (tuning, feature importance, comparison, select best model) | P1 |
| 12 | Deployment preparation (save best model and preprocessing, inference pipeline, MLflow tracking, hand over to Member 4) | P1 |

**When we get the NTSA data:**
- Severity classification model (Issue 07), once severity data is available.
- Retrain and re-evaluate models with NTSA 2024-2026 data, once approved.

### Member 3: Geospatial Engineering - Jewel

| # | Issue | Priority |
|---|---|---|
| 13 | Geographical data preparation (latitude/longitude, GeoDataFrames, Nairobi CRS, download OSM road network) | P0 |
| 14 | Accident hotspot detection (DBSCAN, parameters, clusters, interactive hotspot map, high-risk zones) | P0 |
| 15 | Road network analysis (intersections, road types, map accidents to road segments, high-risk segments, NetworkX graph) | P1 |
| 16 | Emergency route optimization (Dijkstra, A*, travel-time edge weights, road restrictions, compare against baseline routes, estimated response times, route visualization) | P0 |
| 17 | Emergency facility location optimization (p-Median, Capacitated Facility Location, candidate ambulance stations, demand points, compare existing vs proposed coverage) | P2 |

**When we get the NTSA data:**
- Hotspot comparison by severity (Issue 14), once severity data is available.
- Traffic-based edge weights (Issue 16), once traffic data is available.
- Mapping ambulance stations and underserved areas (Issue 17), once ambulance station data is available.

### Member 4: Backend & Application Development - Achiek

| # | Issue | Priority |
|---|---|---|
| 18 | Backend architecture and database setup (FastAPI, PostgreSQL, PostGIS, tables for accidents, community reports and emergency facilities, environment variables, API docs) | P0 |
| 19 | Accident data API (retrieval, filtering, geographical queries, hotspots, emergency facilities) | P1 |
| 20 | Community accident reporting (coordinates, description, time, vehicle and road user, optional image uploads, input validation, duplicate report detection, verification status) | P0 |
| 21 | Machine learning integration (load model and preprocessing, prediction endpoint, validation) | P1 |
| 22 | Emergency routing API (integrate Member 3's routing engine, nearest facilities, route coordinates, estimated travel time) | P0 |
| 23 | Public web application (overview page, reporting form, route recommendation, interactive maps, error handling, UX testing) | P1 |

**When we get the data:**
- Load NTSA 2024-2026 records into the database, once approved.

### Member 5: Project Lead, Dashboards, Documentation & Presentation - Veronicah

| # | Issue | Priority |
|---|---|---|
| 24 | Repo setup, labels, task board and branch rules | P0 |
| 25 | Dashboard planning and KPI definitions | P0 |
| 26 | Road safety overview dashboard (crashes, fatalities, trends, road users, filters), reusing Member 1's charts | P1 |
| 27 | Hotspot and severity dashboard, reusing Member 3's hotspot maps | P1 |
| 28 | Emergency response dashboard (facilities, accidents, optimized routes, response times, baseline vs optimized, coverage gaps) | P2 |
| 29 | Research and literature review (Kenya road safety, NTSA, World Bank, accident prediction, hotspot detection, emergency response optimization) | P0 |
| 30 | Technical documentation, final report compilation, presentation and demonstration | P1 |

**When we get the data:**
- Injuries on the overview dashboard (Issue 26), once injury data is available.
- Severity distribution on the hotspot dashboard (Issue 27), once severity data is available.

---

## 5. Dependencies

| Task | Depends on | Responsible |
|---|---|---|
| EDA | Initial data preparation | Member 1 |
| ML modelling | Cleaned and feature-engineered data | Member 2 |
| Hotspot detection | Valid geographical coordinates | Member 3 |
| Road network analysis | OpenStreetMap data | Member 3 |
| Emergency route optimization | Road network and emergency facility data | Member 3 |
| Model API integration | Saved and documented ML model | Member 4 |
| Routing API integration | Routing engine | Member 4 |
| Dashboard development | Cleaned data and analytical outputs | Member 5 |
| Final report | Findings from all members | Member 5 |
| Final presentation | Completed project components | All members, coordinated by Member 5 |

---

## 6. Repository Structure

```
ROAD-SAFETY-NAIROBI/
│
├── README.md
├── requirements.txt
├── .gitignore
│
├── data/
│   ├── raw/
│   ├── interim/
│   ├── processed/
│   └── external/
│
├── notebooks/
│   ├── 01_data_cleaning/
│   ├── 02_eda/
│   ├── 03_machine_learning/
│   └── 04_geospatial/
│
├── src/
│   ├── preprocessing/
│   ├── features/
│   ├── models/
│   ├── geospatial/
│   └── optimization/
│
├── models/
│   └── README.md
│
├── backend/
│   ├── app/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   └── main.py
│
├── frontend/
│
├── dashboards/
│
├── reports/
│   ├── eda/
│   ├── modelling/
│   ├── geospatial/
│   └── final_report/
│
├── presentation/
│
├── docs/
│   ├── methodology.md
│   ├── data_dictionary.md
│   └── api_documentation.md
│
└── tests/
```

---

## 7. GitHub Labels

| Label | Purpose |
|---|---|
| data-cleaning | Data preparation tasks |
| eda | Exploratory data analysis |
| machine-learning | Predictive modelling |
| geospatial | Maps and spatial analysis |
| optimization | Emergency route optimization |
| backend | API development |
| frontend | Web application |
| dashboard | Power BI/Tableau |
| documentation | Research and technical writing |
| testing | Testing and validation |
| integration | Combining project components |
| P0 | Critical |
| P1 | High |
| P2 | Medium |
| P3 | Low |

---

## 8. Team Collaboration Rules

- Every member must work on their assigned issues.
- All code must be committed to GitHub.
- Use feature branches rather than directly committing major changes to the main branch.
- Every major task must have a corresponding GitHub Issue.
- Issues must be updated as work progresses.
- Every completed task must include its relevant deliverables.
- Members must review each other's work where integration is required.
- No one should overwrite another member's work without communication.
- All datasets and models must have clear documentation.
- Do not commit large raw data files. Keep them in `data/raw/` and list them in `.gitignore`.
- All members must contribute to the final project presentation.

**Suggested branch names:**
`feature/data-cleaning`, `feature/eda`, `feature/ml-models`, `feature/geospatial`, `feature/emergency-routing`, `feature/backend-api`, `feature/frontend`, `feature/dashboard`, `feature/documentation`

---

## 9. Final Project Completion Checklist

**Data Engineering & Analytics**
- [ ] Raw datasets inspected
- [ ] Data cleaned
- [ ] Weather data joined
- [ ] Features engineered
- [ ] EDA completed
- [ ] Charts generated
- [ ] Emergency facilities dataset prepared

**Machine Learning**
- [ ] Logistic Regression trained
- [ ] Random Forest trained
- [ ] XGBoost trained
- [ ] Models evaluated
- [ ] Best model selected
- [ ] Model artifacts saved

**Geospatial Analysis**
- [ ] Accident locations mapped
- [ ] DBSCAN hotspots identified
- [ ] Nairobi road network processed
- [ ] Emergency facilities mapped
- [ ] Dijkstra implemented
- [ ] A* implemented
- [ ] Route optimization evaluated
- [ ] Facility location optimization completed

**Web & API**
- [ ] Database configured
- [ ] FastAPI configured
- [ ] Accident reporting implemented
- [ ] ML model integrated
- [ ] Routing engine integrated
- [ ] Web application functional

**Dashboards & Documentation**
- [ ] Overview dashboard completed
- [ ] Hotspot dashboard completed
- [ ] Emergency response dashboard completed
- [ ] Literature review completed
- [ ] Technical report completed
- [ ] Presentation completed
- [ ] Final demonstration completed

---

## 10. Data Sources

- M3Route crash reports (World Bank Microdata Library): `Crashes_manualcode` (Jul 2017-Jul 2018, ~3,115 rows) and `Crashes_algorithmcode` (Aug 2012-Jul 2023, ~31,064 rows)
- Open-Meteo Historical Weather API
- OpenStreetMap (road network, hospitals)

**When we get the data:** NTSA 2024-2026 crash data, traffic data, ambulance station locations, and injury and severity data, if available.

---

## 11. Final Team Expectations

Each member is responsible for the quality, completion and documentation of their assigned workstream.

However, this is a collaborative capstone project. All five members should understand the overall architecture, objectives and findings, even when they are not directly responsible for a particular component.

Our goal: Develop a practical, data-driven road safety solution that helps identify accident-prone areas, understand road accident patterns and improve emergency response within Nairobi, Kenya.ion that helps identify accident-prone areas, understand road accident patterns and improve emergency response within Nairobi, Kenya.
