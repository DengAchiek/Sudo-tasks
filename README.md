# ROAD SAFETY IN NAIROBI
## Capstone Project  Team Management & GitHub Task Allocation

**Project:** Nairobi Road Safety Analysis, Accident Hotspot Detection & Emergency Response Route Optimization

**Project Category:** Data Science | Machine Learning | Geospatial Analytics | Backend Development | Business Intelligence

**Team Size:** 5 Members

**Project Management:** GitHub Projects, GitHub Issues and GitHub Repository

---

# 1. PROJECT OVERVIEW

The objective of this project is to leverage data science, machine learning, geospatial analysis and route optimization to investigate road safety challenges in Nairobi, Kenya.

The system will analyze historical road accident data, identify accident hotspots, investigate factors contributing to accidents, predict accident risk and recommend optimized routes for emergency response teams.

The final solution will include:

1. A cleaned and structured road accident dataset.
2. Exploratory data analysis and visualizations.
3. Machine learning models for accident risk and severity analysis.
4. Interactive accident hotspot maps.
5. Emergency response route optimization.
6. A web application for community accident reporting and route recommendations.
7. Interactive dashboards for decision-makers.

# 2. TEAM STRUCTURE AND RESPONSIBILITIES

The seven original project workstreams have been consolidated into five responsibilities.

| Member | Department | Assigned responsibilities |
|---|---|---|
| Member 1 | Data Engineering & Analytics | Data cleaning, preprocessing, EDA and charts |
| Member 2 | Machine Learning | Predictive modelling and model evaluation |
| Member 3 | Geospatial Engineering | Maps, hotspot detection and route optimization |
| Member 4 | Backend & Application Development | Web application and API development |
| Member 5 | Business Intelligence & Project Documentation | Dashboards, technical writing and presentation |

## MEMBER 1 – DATA ENGINEERING & ANALYTICS

**Responsibilities:** Data cleaning, preprocessing, exploratory data analysis and charts.

**Main objective:** Transform the raw accident datasets into reliable, analysis-ready data and identify meaningful patterns.

### GitHub Issues

**ISSUE 01: Dataset Collection and Inspection**

<badge color="danger">P0 – Critical</badge>

- [ ] Collect `Crashes_algorithmcode` dataset.
- [ ] Collect `Crashes_manualcode` dataset.
- [ ] Inspect CSV, SPSS and Stata files.
- [ ] Identify available columns and variable types.
- [ ] Identify missing values.
- [ ] Identify duplicate records.
- [ ] Document dataset date coverage.
- [ ] Investigate differences between manual and algorithm-coded datasets.
- [ ] Prepare initial data quality report.

**Deliverable:** Dataset inspection notebook and data quality report.

**ISSUE 02: Data Cleaning and Preprocessing**

<badge color="danger">P0 – Critical</badge>

- [ ] Standardize column names.
- [ ] Convert dates and times into consistent formats.
- [ ] Handle missing values.
- [ ] Remove or flag duplicate accident records.
- [ ] Validate geographical coordinates.
- [ ] Standardize categorical variables.
- [ ] Investigate outliers and inconsistent records.
- [ ] Merge datasets where appropriate, accounting for overlapping periods.
- [ ] Save cleaned datasets.

**Deliverable:** Cleaned master dataset.

**ISSUE 03: Feature Engineering**

<badge color="warning">P1 – High</badge>

- [ ] Extract accident year.
- [ ] Extract accident month.
- [ ] Extract day of the week.
- [ ] Extract accident hour.
- [ ] Categorize time into morning, afternoon, evening and night.
- [ ] Create weekend/weekday features.
- [ ] Standardize road user categories.
- [ ] Create accident severity categories where supported by the data.
- [ ] Prepare features for machine learning.

**Deliverable:** Feature-engineered dataset and data dictionary.

**ISSUE 04: Exploratory Data Analysis**

<badge color="danger">P0 – Critical</badge>

- [ ] Analyze accident distribution over time.
- [ ] Analyze accident distribution by location.
- [ ] Analyze accident severity.
- [ ] Analyze accident distribution by road user.
- [ ] Identify peak accident hours.
- [ ] Identify high-risk days and months.
- [ ] Investigate relationships between variables.
- [ ] Investigate geographical accident patterns.
- [ ] Identify potential contributing factors.

**Deliverable:** EDA notebook and findings report.

**ISSUE 05: Data Visualization**

<badge color="warning">P1 – High</badge>

- [ ] Accident trends line chart.
- [ ] Accident distribution by day of the week.
- [ ] Accident distribution by hour.
- [ ] Accident severity distribution.
- [ ] Accident distribution by road user.
- [ ] Top accident-prone locations.
- [ ] Correlation heatmap.
- [ ] Monthly accident patterns.
- [ ] Prepare charts for dashboard integration.

**Deliverable:** At least 8–12 meaningful charts.

---

## MEMBER 2 – MACHINE LEARNING & PREDICTIVE MODELLING

**Main objective:** Develop predictive models to identify accident risk patterns and classify accident severity.

### GitHub Issues

**ISSUE 06: Define Machine Learning Problems**

<badge color="danger">P0 – Critical</badge>

- [ ] Define the target variables.
- [ ] Distinguish accident occurrence prediction from severity prediction.
- [ ] Identify suitable independent variables.
- [ ] Establish the modelling methodology.
- [ ] Define training, validation and testing strategies.
- [ ] Investigate class imbalance.
- [ ] Coordinate with Member 1 on feature availability.

**Deliverable:** Modelling methodology document.

**ISSUE 07: Logistic Regression Baseline Model**

<badge color="danger">P0 – Critical</badge>

- [ ] Prepare modelling dataset.
- [ ] Encode categorical variables.
- [ ] Scale numerical features where appropriate.
- [ ] Split data into training and testing sets.
- [ ] Train Logistic Regression.
- [ ] Generate predictions.
- [ ] Evaluate performance.
- [ ] Document baseline results.

**Deliverable:** Baseline model and evaluation report.

**ISSUE 08: Random Forest Model**

<badge color="warning">P1 – High</badge>

- [ ] Train Random Forest classifier.
- [ ] Tune hyperparameters.
- [ ] Evaluate performance.
- [ ] Generate confusion matrix.
- [ ] Analyze feature importance.
- [ ] Compare results against Logistic Regression.

**Deliverable:** Trained Random Forest model.

**ISSUE 09: XGBoost Model**

<badge color="warning">P1 – High</badge>

- [ ] Train XGBoost classifier.
- [ ] Perform hyperparameter optimization.
- [ ] Evaluate model performance.
- [ ] Analyze feature importance.
- [ ] Compare against other models.
- [ ] Select the best-performing model.

**Deliverable:** Trained XGBoost model and comparison report.

**ISSUE 10: Model Evaluation and Interpretation**

<badge color="danger">P0 – Critical</badge>

- [ ] Calculate accuracy.
- [ ] Calculate precision.
- [ ] Calculate recall.
- [ ] Calculate F1-score.
- [ ] Generate ROC-AUC where applicable.
- [ ] Generate confusion matrices.
- [ ] Investigate overfitting and underfitting.
- [ ] Perform temporal or spatial validation where appropriate.
- [ ] Interpret influential features.
- [ ] Document model limitations.

**Deliverable:** Model evaluation report.

**ISSUE 11: Model Deployment Preparation**

<badge color="warning">P1 – High</badge>

- [ ] Save the best-performing model.
- [ ] Save preprocessing transformations.
- [ ] Prepare inference pipeline.
- [ ] Track experiments using MLflow.
- [ ] Test predictions on unseen records.
- [ ] Provide model integration instructions to Member 4.

**Deliverable:** Deployment-ready model artifacts.

---

## MEMBER 3 – GEOSPATIAL ANALYSIS & ROUTE OPTIMIZATION

**Main objective:** Identify geographical accident hotspots and develop an emergency response routing system.

### GitHub Issues

**ISSUE 12: Geographical Data Preparation**

<badge color="danger">P0 – Critical</badge>

- [ ] Extract latitude and longitude.
- [ ] Validate accident coordinates.
- [ ] Identify records with missing geographical information.
- [ ] Convert coordinates into GeoDataFrames.
- [ ] Select an appropriate Nairobi coordinate reference system for spatial analysis.
- [ ] Obtain Nairobi road network data from OpenStreetMap.
- [ ] Prepare emergency facility locations.

**Deliverable:** Geospatial dataset and processed road network.

**ISSUE 13: Accident Hotspot Detection**

<badge color="danger">P0 – Critical</badge>

- [ ] Perform spatial exploratory analysis.
- [ ] Apply DBSCAN clustering.
- [ ] Determine suitable clustering parameters.
- [ ] Identify accident clusters.
- [ ] Visualize accident hotspots.
- [ ] Compare hotspot patterns by severity.
- [ ] Identify high-risk geographical zones.
- [ ] Document clustering results.

**Deliverable:** DBSCAN analysis and interactive hotspot map.

**ISSUE 14: Road Network Analysis**

<badge color="warning">P1 – High</badge>

- [ ] Extract Nairobi road network.
- [ ] Identify road intersections and connectivity.
- [ ] Classify road types.
- [ ] Identify road network restrictions where available.
- [ ] Map accident locations onto nearby road segments.
- [ ] Investigate high-risk road segments.
- [ ] Prepare graph representation using NetworkX.

**Deliverable:** Nairobi road network graph.

**ISSUE 15: Emergency Facility Mapping**

<badge color="warning">P1 – High</badge>

- [ ] Identify hospitals.
- [ ] Identify ambulance stations where data is available.
- [ ] Identify emergency response facilities.
- [ ] Obtain geographical coordinates.
- [ ] Map facilities in relation to accident hotspots.
- [ ] Identify underserved geographical areas.

**Deliverable:** Emergency facility map and dataset.

**ISSUE 16: Emergency Route Optimization**

<badge color="danger">P0 – Critical</badge>

- [ ] Implement Dijkstra's Algorithm.
- [ ] Implement A* Search Algorithm.
- [ ] Calculate shortest paths.
- [ ] Develop travel-time-based edge weights.
- [ ] Incorporate road restrictions.
- [ ] Integrate traffic information where available.
- [ ] Compare optimized routes against baseline routes.
- [ ] Calculate estimated response times.
- [ ] Visualize recommended emergency routes.

**Deliverable:** Emergency routing prototype.

**ISSUE 17: Emergency Facility Location Optimization**

<badge color="info">P2 – Medium</badge>

- [ ] Investigate p-Median optimization.
- [ ] Investigate Capacitated Facility Location.
- [ ] Identify candidate ambulance station locations.
- [ ] Define demand points using accident hotspots or other justified demand estimates.
- [ ] Minimize weighted travel distance or time.
- [ ] Compare existing and proposed facility coverage.
- [ ] Document assumptions and findings.

**Deliverable:** Facility location optimization report.

---

## MEMBER 4 – WEB APPLICATION & API DEVELOPMENT

**Main objective:** Build the application that connects the machine learning models, geographical analysis and community reporting functionality.

### GitHub Issues

**ISSUE 18: Backend Architecture and Database Setup**

<badge color="danger">P0 – Critical</badge>

- [ ] Design backend architecture.
- [ ] Set up FastAPI.
- [ ] Configure PostgreSQL.
- [ ] Enable PostGIS.
- [ ] Design database tables.
- [ ] Create accident records schema.
- [ ] Create community reports schema.
- [ ] Create emergency facilities schema.
- [ ] Configure environment variables.
- [ ] Set up API documentation.

**Deliverable:** Working backend foundation.

**ISSUE 19: Accident Data API**

<badge color="warning">P1 – High</badge>

- [ ] Implement accident retrieval endpoint.
- [ ] Implement accident filtering.
- [ ] Implement geographical queries.
- [ ] Implement accident hotspot retrieval.
- [ ] Implement emergency facility retrieval.
- [ ] Test API responses.

**Deliverable:** Accident data API.

**ISSUE 20: Community Accident Reporting**

<badge color="danger">P0 – Critical</badge>

- [ ] Develop accident reporting endpoint.
- [ ] Accept geographical coordinates.
- [ ] Accept accident descriptions.
- [ ] Accept accident time.
- [ ] Accept vehicle and road user information.
- [ ] Support optional image uploads.
- [ ] Implement input validation.
- [ ] Implement duplicate report detection.
- [ ] Add report verification status.
- [ ] Test reporting functionality.

**Deliverable:** Community reporting API.

**ISSUE 21: Machine Learning Integration**

<badge color="warning">P1 – High</badge>

- [ ] Integrate the trained ML model.
- [ ] Load preprocessing artifacts.
- [ ] Develop prediction endpoint.
- [ ] Validate incoming prediction data.
- [ ] Return prediction results.
- [ ] Test model inference.

**Deliverable:** Working prediction API.

**ISSUE 22: Emergency Routing API**

<badge color="danger">P0 – Critical</badge>

- [ ] Integrate Member 3's routing engine.
- [ ] Accept accident location.
- [ ] Identify nearby emergency facilities.
- [ ] Calculate optimized routes.
- [ ] Return route coordinates.
- [ ] Return estimated travel time where supported.
- [ ] Test emergency routing endpoint.

**Deliverable:** Emergency response routing API.

**ISSUE 23: Public Web Application**

<badge color="warning">P1 – High</badge>

- [ ] Develop application interface.
- [ ] Create road safety overview page.
- [ ] Create accident reporting form.
- [ ] Create route recommendation interface.
- [ ] Integrate interactive maps.
- [ ] Connect frontend to backend APIs.
- [ ] Add appropriate error handling.
- [ ] Test the user experience.

**Deliverable:** Functional web application prototype.

---

## MEMBER 5 – DASHBOARDS, DOCUMENTATION & PRESENTATION

**Main objective:** Communicate the findings through interactive dashboards and produce the final project documentation and presentation.

### GitHub Issues

**ISSUE 24: Dashboard Planning and KPI Definition**

<badge color="danger">P0 – Critical</badge>

- [ ] Define dashboard objectives.
- [ ] Identify relevant KPIs.
- [ ] Identify required datasets.
- [ ] Establish dashboard layout.
- [ ] Coordinate data requirements with Members 1, 2 and 3.

**Deliverable:** Dashboard design plan and KPI definitions.

**ISSUE 25: Road Safety Overview Dashboard**

<badge color="warning">P1 – High</badge>

- [ ] Display total reported crashes.
- [ ] Display total fatalities.
- [ ] Display injuries where available.
- [ ] Display accident trends.
- [ ] Display affected road users.
- [ ] Include date and location filters.

**Deliverable:** Road safety overview dashboard.

**ISSUE 26: Accident Hotspot and Severity Dashboard**

<badge color="warning">P1 – High</badge>

- [ ] Visualize accident hotspots.
- [ ] Display accident severity distribution.
- [ ] Display high-risk locations.
- [ ] Display road user categories.
- [ ] Include geographical filters.
- [ ] Integrate geospatial outputs from Member 3.

**Deliverable:** Accident hotspot dashboard.

**ISSUE 27: Emergency Response Dashboard**

<badge color="info">P2  Medium</badge>

- [ ] Display emergency facilities.
- [ ] Display accident locations.
- [ ] Display optimized response routes.
- [ ] Display estimated response times.
- [ ] Compare baseline and optimized routing.
- [ ] Highlight areas with limited emergency facility coverage.

**Deliverable:** Emergency response dashboard.

**ISSUE 28: Research and Literature Review**

<badge color="danger">P0  Critical</badge>

- [ ] Research road safety challenges in Kenya.
- [ ] Review relevant NTSA reports.
- [ ] Review World Bank road safety publications.
- [ ] Review existing accident prediction studies.
- [ ] Research geospatial accident hotspot detection.
- [ ] Research emergency response optimization.
- [ ] Document research gaps.
- [ ] Maintain proper citations.

**Deliverable:** Literature review.

**ISSUE 29: Technical Documentation**

<badge color="warning">P1 – High</badge>

- [ ] Document business understanding.
- [ ] Document data sources.
- [ ] Document data understanding.
- [ ] Document data preparation.
- [ ] Document exploratory analysis.
- [ ] Document modelling methodology.
- [ ] Document geospatial methodology.
- [ ] Document API architecture.
- [ ] Document results and limitations.
- [ ] Compile final technical report.

**Deliverable:** Complete technical report.

**ISSUE 30: Final Presentation and Demonstration**

<badge color="warning">P1 – High</badge>

- [ ] Prepare presentation slides.
- [ ] Summarize project objectives.
- [ ] Present data insights.
- [ ] Present ML results.
- [ ] Present accident hotspot maps.
- [ ] Demonstrate emergency routing.
- [ ] Demonstrate community reporting.
- [ ] Present dashboards.
- [ ] Discuss limitations and recommendations.
- [ ] Prepare final project demonstration.

**Deliverable:** Final presentation and demonstration.

---

# 3. GITHUB PROJECT PRIORITY SYSTEM

Use the following priority labels across all issues.

| Priority | Meaning | Description |
|---|---|---|
| P0 – Critical | Must do | Essential tasks blocking other work |
| P1 – High | Important | Core project tasks |
| P2 – Medium | Enhancement | Additional analytical capabilities |
| P3 – Low | Optional | Improvements if time permits |

# 4. PROJECT DEPENDENCY MANAGEMENT

Some tasks cannot begin until another member provides the required output.

| Task | Depends on | Responsible member |
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

# 5. PROPOSED PROJECT TIMELINE

A suggested eight-week schedule:

| Week | Activities | Main contributors |
|---|---|---|
| 1 | Data inspection, repository setup and research | All members |
| 2 | Data cleaning, preprocessing and feature engineering | Member 1 |
| 3 | EDA, visualizations and geospatial preparation | Members 1, 3 |
| 4 | Machine learning models and hotspot detection | Members 2, 3 |
| 5 | Model evaluation and emergency route optimization | Members 2, 3 |
| 6 | Backend development and dashboard development | Members 4, 5 |
| 7 | Integration, testing and documentation | All members |
| 8 | Final report, presentation and demonstration | All members |

The schedule should be adjusted according to data approval, actual team availability and project complexity.

# 6. GITHUB REPOSITORY STRUCTURE

Use the following folder structure to keep the project organized.

```text
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

# 7. GITHUB ISSUE CREATION GUIDELINES

Each member should create or work on the issues assigned to them.

Use the following format when creating an issue:

### Issue Template

**Title:** [DATA] Clean and preprocess accident dataset

**Assignee:** Member 1

**Priority:** P0  Critical

**Description:**

Prepare the historical Nairobi road accident datasets for analysis and modelling.

**Tasks:**
- [ ] Inspect raw datasets.
- [ ] Identify missing values.
- [ ] Handle duplicates.
- [ ] Standardize columns.
- [ ] Validate coordinates.
- [ ] Export cleaned dataset.

**Acceptance Criteria:**
- Cleaned dataset is available.
- Data quality issues are documented.
- Data dictionary is created.
- Notebook runs successfully.
- Output is committed to the repository.

**Dependencies:** Raw datasets must be available.

**Labels:** `data-cleaning`, `preprocessing`, `P0`


# 8. GITHUB LABELS

Create the following labels in the repository.

| Label | Purpose |
|---|---|
| `data-cleaning` | Data preparation tasks |
| `eda` | Exploratory data analysis |
| `machine-learning` | Predictive modelling |
| `geospatial` | Maps and spatial analysis |
| `optimization` | Emergency route optimization |
| `backend` | API development |
| `frontend` | Web application |
| `dashboard` | Power BI/Tableau |
| `documentation` | Research and technical writing |
| `testing` | Testing and validation |
| `integration` | Combining project components |
| `P0` | Critical |
| `P1` | High |
| `P2` | Medium |
| `P3` | Low |

# 9. TEAM COLLABORATION RULES

1. Every member must work on their assigned issues.
2. All code must be committed to GitHub.
3. Use feature branches rather than directly committing major changes to the main branch.
4. Every major task must have a corresponding GitHub Issue.
5. Issues must be updated as work progresses.
6. Every completed task must include its relevant deliverables.
7. Members must review each other's work where integration is required.
8. No one should overwrite another member's work without communication.
9. All datasets and models must have clear documentation.
10. All members must contribute to the final project presentation.

### Suggested Branch Naming

```text
feature/data-cleaning
feature/eda
feature/ml-models
feature/geospatial
feature/emergency-routing
feature/backend-api
feature/frontend
feature/dashboard
feature/documentation
```

# 10. FINAL PROJECT COMPLETION CHECKLIST

### Data Engineering & Analytics
- [ ] Raw datasets inspected.
- [ ] Data cleaned.
- [ ] Features engineered.
- [ ] EDA completed.
- [ ] Charts generated.

### Machine Learning
- [ ] Logistic Regression trained.
- [ ] Random Forest trained.
- [ ] XGBoost trained.
- [ ] Models evaluated.
- [ ] Best model selected.
- [ ] Model artifacts saved.

### Geospatial Analysis
- [ ] Accident locations mapped.
- [ ] DBSCAN hotspots identified.
- [ ] Nairobi road network processed.
- [ ] Emergency facilities mapped.
- [ ] Dijkstra implemented.
- [ ] A* implemented.
- [ ] Route optimization evaluated.

### Web & API
- [ ] Database configured.
- [ ] FastAPI configured.
- [ ] Accident reporting implemented.
- [ ] ML model integrated.
- [ ] Routing engine integrated.
- [ ] Web application functional.

### Dashboards & Documentation
- [ ] Overview dashboard completed.
- [ ] Hotspot dashboard completed.
- [ ] Emergency response dashboard completed.
- [ ] Literature review completed.
- [ ] Technical report completed.
- [ ] Presentation completed.
- [ ] Final demonstration completed.


# 11. FINAL TEAM EXPECTATIONS

Each member is responsible for the quality, completion and documentation of their assigned workstream.

However, this is a collaborative capstone project. All five members should understand the overall architecture, objectives and findings, even when they are not directly responsible for a particular component.

**Project Repository:** https://github.com/donjuel003/ROAD-ACCIDENT-IN-NAIROBI-DATASET

**Our goal:** Develop a practical, data-driven road safety solution that helps identify accident-prone areas, understand road accident patterns and improve emergency response within Nairobi, Kenya.
