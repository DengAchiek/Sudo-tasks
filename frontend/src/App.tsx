import { lazy, Suspense, type ReactNode } from "react";
import { Link, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { ArrowLeft, MapPin } from "lucide-react";
import { useAuth } from "./auth/AuthContext";

const AnalyticsLayout = lazy(() => import("./layouts/AnalyticsLayout").then((module) => ({ default: module.AnalyticsLayout })));
const PublicLanding = lazy(() => import("./pages/PublicLanding").then((module) => ({ default: module.PublicLanding })));
const AuthPage = lazy(() => import("./pages/AuthPage").then((module) => ({ default: module.AuthPage })));
const OverviewPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.OverviewPage })));
const AccidentAnalysisPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.AccidentAnalysisPage })));
const HotspotsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.HotspotsPage })));
const SeverityPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.SeverityPage })));
const RiskFactorsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.RiskFactorsPage })));
const PredictionsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.PredictionsPage })));
const EmergencyResponsePage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.EmergencyResponsePage })));
const CommunityReportsPage = lazy(() => import("./pages/AnalyticsPages").then((module) => ({ default: module.CommunityReportsPage })));

function LoadingPage() { return <div className="app-loading"><span className="app-loading-mark">R</span><span>Loading RoadLens</span></div>; }

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingPage />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
}

function NotFound() {
  return <main className="not-found">
    <div className="not-found-mark"><MapPin size={24} /></div>
    <span>404 · ROAD NOT FOUND</span>
    <h1>This route is off the map.</h1>
    <p>The page may have moved or the link may be out of date.</p>
    <Link className="button button-primary" to="/">Return to RoadLens <ArrowLeft size={15} /></Link></main>;
}

export function App() {
  return <Suspense fallback={<LoadingPage />}><Routes>
    <Route path="/" element={<PublicLanding />} />
    <Route path="/login" element={<AuthPage mode="login" />} />
    <Route path="/register" element={<AuthPage mode="register" />} />
    <Route path="/analytics" element={<RequireAuth><AnalyticsLayout /></RequireAuth>}>
      <Route index element={<OverviewPage />} />
      <Route path="accidents" element={<AccidentAnalysisPage />} />
      <Route path="hotspots" element={<HotspotsPage />} />
      <Route path="severity" element={<SeverityPage />} />
      <Route path="risk-factors" element={<RiskFactorsPage />} />
      <Route path="predictions" element={<PredictionsPage />} />
      <Route path="emergency" element={<EmergencyResponsePage />} />
      <Route path="reports" element={<CommunityReportsPage />} />
      <Route path="*" element={<Navigate to="/analytics" replace />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes></Suspense>;
}
