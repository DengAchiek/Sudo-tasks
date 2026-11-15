import axios from "axios";
import {
  demoAnalysis,
  demoCoverage,
  demoFacilities,
  demoHotspots,
  demoMeta,
  demoOverview,
  demoPredictions,
  demoReports,
  demoRiskFactors,
  demoRoute,
  demoSeverity,
} from "./mock";
import type {
  AnalysisData,
  ApiMeta,
  CommunityReport,
  CommunityReportInput,
  EmergencyFacility,
  EmergencyCoverageData,
  HotspotsData,
  ModelMetric,
  OptimizedRoute,
  OverviewData,
  Period,
  PredictionsData,
  RiskFactorsData,
  RouteRequest,
  SeverityData,
} from "../types/analytics";

const baseURL = import.meta.env.VITE_API_BASE_URL?.trim();
export const isDemoMode = !baseURL;
export const http = axios.create({ baseURL, timeout: 15_000, withCredentials: true, headers: { Accept: "application/json" } });
http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const serverMessage = typeof error.response?.data?.detail === "string" ? error.response.data.detail : null;
      const message = status === 401
        ? "This view requires a RoadLens account. Sign in to continue."
        : status === 403
          ? "Your account does not have permission to view this information."
          : serverMessage ?? (error.response ? "The analytics service returned an error." : "The analytics service could not be reached.");
      return Promise.reject(new Error(message));
    }
    return Promise.reject(error);
  },
);

const wait = (duration = 220) => new Promise((resolve) => window.setTimeout(resolve, duration));
const params = (period: Period, search?: string) => ({ period, ...(search ? { search } : {}) });

async function demo<T>(data: T): Promise<{ data: T; meta: ApiMeta }> {
  await wait();
  return { data, meta: demoMeta };
}

async function get<T>(url: string, fallback: T, query?: Record<string, string>) {
  if (isDemoMode) return demo(fallback);
  const response = await http.get<T>(url, { params: query });
  return { data: response.data, meta: { mode: "live" as const, updatedAt: response.headers["last-modified"] ?? new Date().toISOString() } };
}

export const roadlensApi = {
  overview: (period: Period, search?: string) => get<OverviewData>("/api/v1/overview", demoOverview, params(period, search)),
  analysis: (period: Period) => get<AnalysisData>("/api/v1/accidents/trends", demoAnalysis, params(period)),
  hotspots: (period: Period, search?: string) => get<HotspotsData>("/api/v1/hotspots", demoHotspots, params(period, search)),
  severity: (period: Period) => get<SeverityData>("/api/v1/severity/analysis", demoSeverity, params(period)),
  riskFactors: (period: Period) => get<RiskFactorsData>("/api/v1/risk-factors", demoRiskFactors, params(period)),
  predictions: (period: Period) => get<PredictionsData>("/api/v1/predictions", demoPredictions, params(period)),
  modelPerformance: (period: Period) => get<ModelMetric[]>("/api/v1/models/performance", demoSeverity.models, params(period)),
  distributions: (period: Period) => get<Pick<OverviewData, "monthlyDistribution" | "weekdayDistribution" | "severityDistribution" | "roadUserDistribution">>("/api/v1/accidents/distribution", { monthlyDistribution: demoOverview.monthlyDistribution, weekdayDistribution: demoOverview.weekdayDistribution, severityDistribution: demoOverview.severityDistribution, roadUserDistribution: demoOverview.roadUserDistribution }, params(period)),
  facilities: async (): Promise<{ data: EmergencyFacility[]; meta: ApiMeta }> => get("/api/v1/emergency/facilities", demoFacilities),
  coverage: async (): Promise<{ data: EmergencyCoverageData; meta: ApiMeta }> => get("/api/v1/emergency/coverage", demoCoverage),
  // The backend must enforce authorization and omit personal contact details from this public view.
  communityReports: (period: Period) => get<CommunityReport[]>("/api/v1/reports", demoReports, params(period)),
  requestRoute: async (body: RouteRequest): Promise<{ data: OptimizedRoute; meta: ApiMeta }> => {
    if (isDemoMode) return demo({ ...demoRoute, facilityName: demoFacilities.find((facility) => facility.id === body.facilityId)?.name ?? demoRoute.facilityName, algorithm: `${body.algorithm === "astar" ? "A*" : "Dijkstra"} · demo response` });
    const response = await http.post<OptimizedRoute>("/api/v1/emergency/routes", body);
    return { data: response.data, meta: { mode: "live", updatedAt: new Date().toISOString() } };
  },
  submitReport: async (body: CommunityReportInput): Promise<{ data: CommunityReport; meta: ApiMeta }> => {
    if (isDemoMode) return demo({ id: `RL-DEMO-${Math.floor(100 + Math.random() * 900)}`, incidentType: body.incidentType, location: body.location, submittedAt: new Date().toISOString().slice(0, 10), status: "Pending verification" });
    const form = new FormData();
    Object.entries(body).forEach(([key, value]) => {
      if (value instanceof File) form.append("photo", value);
      else if (Array.isArray(value)) value.forEach((item) => form.append(key, item));
      else if (value !== undefined) form.append(key, String(value));
    });
    const response = await http.post<CommunityReport>("/api/v1/reports", form);
    return { data: response.data, meta: { mode: "live", updatedAt: new Date().toISOString() } };
  },
};
