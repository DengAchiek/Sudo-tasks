import { lazy, Suspense } from "react";
import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";

const AnalyticsLayout = lazy(() => import("./layouts/AnalyticsLayout").then((module) => ({ default: module.AnalyticsLayout })));
const PublicLanding = lazy(() => import("./pages/PublicLanding").then((module) => ({ default: module.PublicLanding })));
const OverviewPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.OverviewPage })));
const AccidentAnalysisPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.AccidentAnalysisPage })));
const HotspotsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.HotspotsPage })));
const SeverityPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.SeverityPage })));
const RiskFactorsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.RiskFactorsPage })));
const PredictionsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.PredictionsPage })));
const EmergencyResponsePage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.EmergencyResponsePage })));
const CommunityReportsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.CommunityReportsPage })));

function LoadingPage() { return <div className="app-loading"><span className="app-loading-mark">R</span><span>Loading RoadLens</span></div>; }

function NotFound() {
  return <main className="not-found"><div className="not-found-mark"><MapPin size={24} /></div><span>404 · ROAD NOT FOUND</span><h1>This route is off the map.</h1><p>The page may have moved or the link may be out of date.</p><Link className="button button-primary" to="/">Return to RoadLens <ArrowLeft size={15} /></Link></main>;
}

export function App() {
  return <Suspense fallback={<LoadingPage />}><Routes>
    <Route path="/" element={<PublicLanding />} />
    <Route path="/analytics" element={<AnalyticsLayout />}>
      <Route index element={<OverviewPage />} />
      <Route path="accidents" element={<AccidentAnalysisPage />} />
      <Route path="hotspots" element={<HotspotsPage />} />
      <Route path="severity" element={<SeverityPage />} />
      <Route path="risk-factors" element={<RiskFactorsPage />} />
      <Route path="predictions" element={<PredictionsPage />} />
      <Route path="emergency" element={<EmergencyResponsePage />} />
      <Route path="reports" element={<CommunityReportsPage />} />
    </Route>
    <Route path="/analytics/*" element={<Navigate to="/analytics" replace />} />
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense>;
}
