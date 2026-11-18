import type {
  AnalysisData,
  ApiMeta,
  CommunityReport,
  EmergencyCoverageData,
  EmergencyFacility,
  HotspotsData,
  OptimizedRoute,
  OverviewData,
  PredictionsData,
  RiskFactorsData,
  SeverityData,
} from "../types/analytics";

export const demoMeta: ApiMeta = { mode: "demo", updatedAt: "Demo snapshot · 13 Nov 2026" };

export const demoOverview: OverviewData = {
  metrics: [
    { label: "Reported accidents", value: "2,846", change: 4.2, helper: "Sample records · 2018–2024" },
    { label: "Reported fatalities", value: "418", change: -2.1, helper: "Sample records · all severities" },
    { label: "Injuries reported", value: "1,972", change: 1.4, helper: "Sample records · where available" },
    { label: "Detected hotspots", value: "18", helper: "Sample groups of nearby crash reports" },
  ],
  monthlyTrend: [
    { label: "Jan", accidents: 162, fatalities: 26 }, { label: "Feb", accidents: 184, fatalities: 29 },
    { label: "Mar", accidents: 201, fatalities: 31 }, { label: "Apr", accidents: 193, fatalities: 30 },
    { label: "May", accidents: 224, fatalities: 36 }, { label: "Jun", accidents: 215, fatalities: 33 },
    { label: "Jul", accidents: 247, fatalities: 39 }, { label: "Aug", accidents: 239, fatalities: 38 },
    { label: "Sep", accidents: 258, fatalities: 40 }, { label: "Oct", accidents: 291, fatalities: 44 },
    { label: "Nov", accidents: 318, fatalities: 51 }, { label: "Dec", accidents: 314, fatalities: 48 },
  ],
  monthlyDistribution: [
    { name: "Jan", value: 162 }, { name: "Feb", value: 184 }, { name: "Mar", value: 201 },
    { name: "Apr", value: 193 }, { name: "May", value: 224 }, { name: "Jun", value: 215 },
    { name: "Jul", value: 247 }, { name: "Aug", value: 239 }, { name: "Sep", value: 258 },
    { name: "Oct", value: 291 }, { name: "Nov", value: 318 }, { name: "Dec", value: 314 },
  ],
  weekdayDistribution: [
    { name: "Mon", value: 371 }, { name: "Tue", value: 382 }, { name: "Wed", value: 398 },
    { name: "Thu", value: 410 }, { name: "Fri", value: 476 }, { name: "Sat", value: 446 }, { name: "Sun", value: 363 },
  ],
  severityDistribution: [
    { name: "Fatal", value: 418, color: "#dc2626" }, { name: "Serious injury", value: 862, color: "#f59e0b" },
    { name: "Minor injury", value: 816, color: "#2563eb" }, { name: "No injury reported", value: 750, color: "#16a34a" },
  ],
  roadUserDistribution: [
    { name: "Pedestrian", value: 1046, color: "#2563eb" }, { name: "Motorcycle", value: 743, color: "#f59e0b" },
    { name: "Passenger", value: 542, color: "#16a34a" }, { name: "Driver", value: 384, color: "#64748b" },
    { name: "Cyclist", value: 131, color: "#8b5cf6" },
  ],
  hotspots: [
    { id: "hs-01", name: "Thika Road · Pangani", latitude: -1.271, longitude: 36.831, incidents: 164, fatalities: 27, level: "high", mainRoadUser: "Pedestrian", summary: "Example location for interface preview." },
    { id: "hs-02", name: "Mombasa Road · Bellevue", latitude: -1.321, longitude: 36.851, incidents: 118, fatalities: 18, level: "high", mainRoadUser: "Motorcycle", summary: "Example location for interface preview." },
    { id: "hs-03", name: "Outer Ring Road · Umoja", latitude: -1.286, longitude: 36.891, incidents: 83, fatalities: 12, level: "moderate", mainRoadUser: "Pedestrian", summary: "Example location for interface preview." },
    { id: "hs-04", name: "Uhuru Highway · CBD", latitude: -1.292, longitude: 36.817, incidents: 69, fatalities: 9, level: "moderate", mainRoadUser: "Passenger", summary: "Example location for interface preview." },
    { id: "hs-05", name: "Waiyaki Way · Westlands", latitude: -1.267, longitude: 36.806, incidents: 42, fatalities: 4, level: "lower", mainRoadUser: "Motorcycle", summary: "Example location for interface preview." },
  ],
  insights: [
    "The demo records contain more reports in the final quarter than the first quarter.",
    "Pedestrian records make up the largest road-user group in this sample response.",
    "The locations shown are examples and are not verified Nairobi risk rankings.",
  ],
};

export const demoAnalysis: AnalysisData = {
  annualTrend: [
    { label: "2018", accidents: 286, fatalities: 39 }, { label: "2019", accidents: 318, fatalities: 42 },
    { label: "2020", accidents: 271, fatalities: 37 }, { label: "2021", accidents: 364, fatalities: 54 },
    { label: "2022", accidents: 429, fatalities: 63 }, { label: "2023", accidents: 516, fatalities: 78 },
    { label: "2024", accidents: 662, fatalities: 105 },
  ],
  weekdayDistribution: demoOverview.weekdayDistribution,
  hourlyDistribution: [
    { label: "00", accidents: 58 }, { label: "02", accidents: 43 }, { label: "04", accidents: 34 },
    { label: "06", accidents: 94 }, { label: "08", accidents: 178 }, { label: "10", accidents: 133 },
    { label: "12", accidents: 141 }, { label: "14", accidents: 169 }, { label: "16", accidents: 221 },
    { label: "18", accidents: 285 }, { label: "20", accidents: 239 }, { label: "22", accidents: 134 },
  ],
  roadTypeDistribution: [
    { name: "Urban arterial", value: 1118 }, { name: "Highway", value: 673 },
    { name: "Collector road", value: 582 }, { name: "Local street", value: 473 },
  ],
  insights: demoOverview.insights,
};

export const demoHotspots: HotspotsData = {
  summary: [
    { label: "Detected clusters", value: "18", helper: "Sample groups of nearby reports" },
    { label: "Highest cluster count", value: "164", helper: "Sample records · selected area" },
    { label: "Areas with fatal crashes", value: "12", helper: "Sample response only" },
  ],
  locations: demoOverview.hotspots,
  history: demoAnalysis.annualTrend,
};

export const demoSeverity: SeverityData = {
  byRoadUser: [
    { name: "Pedestrian", value: 211, color: "#dc2626" }, { name: "Motorcycle", value: 102, color: "#f59e0b" },
    { name: "Passenger", value: 65, color: "#2563eb" }, { name: "Driver", value: 33, color: "#16a34a" },
  ],
  byTime: demoAnalysis.hourlyDistribution.map((point) => ({ ...point, fatalities: Math.round(point.accidents * 0.14) })),
  models: [
    { model: "Logistic Regression", accuracy: 0.72, precision: 0.68, recall: 0.63, f1: 0.65, auc: 0.76 },
    { model: "Random Forest", accuracy: 0.81, precision: 0.78, recall: 0.74, f1: 0.76, auc: 0.84 },
    { model: "XGBoost", accuracy: 0.83, precision: 0.8, recall: 0.77, f1: 0.78, auc: 0.87 },
  ],
  confusionMatrix: [[132, 18, 7], [24, 121, 22], [8, 26, 114]],
};

export const demoRiskFactors: RiskFactorsData = {
  factors: [
    { factor: "Time of day", importance: 0.86, direction: "Evening sample records" },
    { factor: "Road-user category", importance: 0.78, direction: "Varies by outcome" },
    { factor: "Road type", importance: 0.69, direction: "Arterial roads in sample" },
    { factor: "Day of week", importance: 0.57, direction: "Friday and Saturday sample" },
    { factor: "Weather field", importance: 0.34, direction: "Coverage varies" },
    { factor: "Lighting condition", importance: 0.29, direction: "Coverage varies" },
  ],
  associations: [
    { name: "Time of day", value: 0.44 }, { name: "Road type", value: 0.32 },
    { name: "Road-user group", value: 0.28 }, { name: "Weather", value: 0.14 },
  ],
  insights: [
    "Time of day had a stronger influence on these example results.",
    "These details influenced the example results; this does not show what caused a crash.",
  ],
};

export const demoPredictions: PredictionsData = {
  models: demoSeverity.models,
  validation: demoAnalysis.annualTrend,
  featureImportance: demoRiskFactors.factors,
  notes: [
    "These scores are examples of how results compare with recorded crash outcomes.",
    "Past hotspots show where crashes were reported, not where the next crash will happen.",
    "Estimating future crash locations requires reliable traffic counts and records from roads and times with no reported crashes too.",
  ],
};

export const demoFacilities: EmergencyFacility[] = [
  { id: "facility-01", name: "Kenyatta National Hospital", type: "hospital", latitude: -1.300, longitude: 36.807 },
  { id: "facility-02", name: "Aga Khan University Hospital", type: "hospital", latitude: -1.263, longitude: 36.816 },
  { id: "facility-03", name: "Nairobi West Hospital", type: "hospital", latitude: -1.309, longitude: 36.823 },
  { id: "facility-04", name: "Central Fire Station", type: "station", latitude: -1.286, longitude: 36.824 },
];

export const demoCoverage: EmergencyCoverageData = {
  proposedFacilities: [
    { id: "proposal-01", name: "Proposed site · Ruai", type: "proposed", latitude: -1.274, longitude: 36.985 },
    { id: "proposal-02", name: "Proposed site · Dagoretti", type: "proposed", latitude: -1.310, longitude: 36.748 },
  ],
  demandCoveragePercent: 83,
  averageTravelMinutesExisting: 21.4,
  averageTravelMinutesProposed: 15.8,
  coverageGaps: ["Outer East · sample coverage gap", "South-West edge · sample coverage gap"],
};

export const demoRoute: OptimizedRoute = {
  facilityName: "Kenyatta National Hospital",
  distanceKm: 5.8,
  travelMinutes: 14,
  algorithm: "A* · demo response",
  alternatives: [
    { name: "Alternative via Haile Selassie Avenue", distanceKm: 6.4, travelMinutes: 17 },
    { name: "Alternative via Ngong Road", distanceKm: 7.1, travelMinutes: 19 },
  ],
  routeCoordinates: [[-1.275, 36.846], [-1.281, 36.836], [-1.291, 36.821], [-1.300, 36.807]],
  demo: true,
};

export const demoReports: CommunityReport[] = [
  { id: "RL-DEMO-014", incidentType: "Collision", location: "Sample report · Ngara", submittedAt: "2026-11-10", status: "Pending verification" },
  { id: "RL-DEMO-013", incidentType: "Pedestrian incident", location: "Sample report · Westlands", submittedAt: "2026-11-08", status: "Verified" },
  { id: "RL-DEMO-012", incidentType: "Collision", location: "Sample report · Embakasi", submittedAt: "2026-11-06", status: "Pending verification" },
];
