import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, BarChart3, ChevronDown, Clock3, FileText, Layers3, MapPin, Menu, Search, ShieldCheck, Siren, type LucideIcon } from "lucide-react";
import type { Period } from "../types/analytics";
import { Badge } from "../components/ui";
import { isDemoMode } from "../api/client";
import { BrandMark } from "../components/Brand";

export interface AnalyticsContext { period: Period; search: string }

const navGroups: Array<{ label: string; items: Array<{ label: string; path: string; icon: LucideIcon }> }> = [
  { label: "INSIGHTS", items: [
    { label: "Overview", path: "/analytics", icon: Activity },
    { label: "Accident analysis", path: "/analytics/accidents", icon: BarChart3 },
    { label: "Hotspots", path: "/analytics/hotspots", icon: MapPin },
    { label: "Severity", path: "/analytics/severity", icon: AlertTriangle },
    { label: "Risk factors", path: "/analytics/risk-factors", icon: Layers3 },
    { label: "Predictive insights", path: "/analytics/predictions", icon: ShieldCheck },
  ] },
  { label: "RESPONSE", items: [
    { label: "Emergency response", path: "/analytics/emergency", icon: Siren },
    { label: "Community reports", path: "/analytics/reports", icon: FileText },
  ] },
];

export function AnalyticsLayout() {
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const pageName = location.pathname.endsWith("/accidents") ? "Accident analysis" : location.pathname.endsWith("/hotspots") ? "Accident hotspots" : location.pathname.endsWith("/severity") ? "Severity analysis" : location.pathname.endsWith("/risk-factors") ? "Risk factors" : location.pathname.endsWith("/predictions") ? "Predictive insights" : location.pathname.endsWith("/emergency") ? "Emergency response" : location.pathname.endsWith("/reports") ? "Community reports" : "Overview";
  const searchable = location.pathname === "/analytics" || location.pathname === "/analytics/hotspots";
  const periodRelevant = !location.pathname.endsWith("/emergency");
  return <div className="analytics-shell">
    <aside className={`analytics-sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <Link className="brand brand-analytics" to="/" aria-label="RoadLens home"><BrandMark /><span><strong>RoadLens</strong><small>NAIROBI ROAD INTELLIGENCE</small></span></Link>
      <div className="sidebar-location"><span className="location-dot" />NAIROBI COUNTY <span>↗</span></div>
      {navGroups.map((group) => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === "/analytics"} onClick={() => setMobileOpen(false)} className={({ isActive }) => `analytics-nav-link ${isActive ? "active" : ""}`}><Icon size={16} strokeWidth={1.8} /><span>{label}</span>{label === "Hotspots" && <span className="nav-sample">18</span>}</NavLink>)}</div>)}
      <div className="sidebar-bottom"><div className="sidebar-foot"><div className="sidebar-foot-avatar">RL</div><div><strong>RoadLens workspace</strong><span>Public research view</span></div><ChevronDown size={14} /></div></div>
    </aside>
    {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className="analytics-main">
      <header className="analytics-topbar"><div className="topbar-left"><button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{pageName}</strong></div></div><div className="topbar-right">{searchable && <label className="global-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={location.pathname.endsWith("hotspots") ? "Search sample locations" : "Search locations or findings"} aria-label="Search analytics results" /></label>}{periodRelevant && <label className="period-select"><Clock3 size={14} /><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Reporting period"><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="12m">Last 12 months</option><option value="all">All available</option></select><ChevronDown size={13} /></label>}<Badge className={isDemoMode ? "demo-badge" : "live-data-badge"}><span />{isDemoMode ? "DEMO DATA" : "BACKEND DATA"}</Badge></div></header>
      <div className="analytics-content"><Outlet context={{ period, search } satisfies AnalyticsContext} /></div>
    </div>
  </div>;
}

export function AnalyticsBackLink() { return <Link className="back-link" to="/"><ArrowLeft size={15} />Public RoadLens</Link>; }

