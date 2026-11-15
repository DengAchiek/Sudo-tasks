export type Period = "30d" | "90d" | "12m" | "all";
export type RiskLevel = "high" | "moderate" | "lower";

export interface ApiMeta {
  mode: "demo" | "live";
  updatedAt: string;
}

export interface Metric {
  label: string;
  value: number | string;
  unit?: string;
  change?: number | null;
  helper?: string;
}

export interface TrendPoint {
  label: string;
  accidents: number;
  fatalities?: number;
  injuries?: number;
}

export interface DistributionPoint {
  name: string;
  value: number;
  color?: string;
}

export interface Hotspot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  incidents: number;
  fatalities: number;
  level: RiskLevel;
  mainRoadUser: string;
  summary?: string;
}

export interface OverviewData {
  metrics: Metric[];
  monthlyTrend: TrendPoint[];
  monthlyDistribution: DistributionPoint[];
  weekdayDistribution: DistributionPoint[];
  severityDistribution: DistributionPoint[];
  roadUserDistribution: DistributionPoint[];
  hotspots: Hotspot[];
  insights: string[];
}

export interface AnalysisData {
  annualTrend: TrendPoint[];
  weekdayDistribution: DistributionPoint[];
  hourlyDistribution: TrendPoint[];
  roadTypeDistribution: DistributionPoint[];
  insights: string[];
}

export interface HotspotsData {
  summary: Metric[];
  locations: Hotspot[];
  history: TrendPoint[];
}

export interface ModelMetric {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc?: number;
}

export interface SeverityData {
  byRoadUser: DistributionPoint[];
  byTime: TrendPoint[];
  models: ModelMetric[];
  confusionMatrix: number[][];
}

export interface RiskFactor {
  factor: string;
  importance: number;
  direction: string;
}

export interface RiskFactorsData {
  factors: RiskFactor[];
  associations: DistributionPoint[];
  insights: string[];
}

export interface PredictionsData {
  models: ModelMetric[];
  validation: TrendPoint[];
  featureImportance: RiskFactor[];
  notes: string[];
}

export interface EmergencyFacility {
  id: string;
  name: string;
  type: "hospital" | "station" | "proposed";
  latitude: number;
  longitude: number;
}

export interface EmergencyCoverageData {
  proposedFacilities: EmergencyFacility[];
  demandCoveragePercent: number;
  averageTravelMinutesExisting: number;
  averageTravelMinutesProposed: number;
  coverageGaps: string[];
}

export interface RouteRequest {
  incident: string;
  facilityId: string;
  algorithm: "dijkstra" | "astar";
}

export interface OptimizedRoute {
  facilityName: string;
  distanceKm: number;
  travelMinutes: number;
  algorithm: string;
  alternatives: Array<{ name: string; distanceKm: number; travelMinutes: number }>;
  routeCoordinates: Array<[number, number]>;
  demo?: boolean;
}

export interface CommunityReport {
  id: string;
  incidentType: string;
  location: string;
  submittedAt: string;
  status: "Pending verification" | "Verified" | "Rejected";
}

export interface CommunityReportInput {
  location: string;
  occurredAt: string;
  incidentType: string;
  roadUsers: string[];
  description: string;
  contact?: string;
  photo?: File;
  latitude?: number;
  longitude?: number;
}
