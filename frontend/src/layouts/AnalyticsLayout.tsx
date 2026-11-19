import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, BarChart3, ChevronDown, Clock3, FileText, Gauge, Layers3, LogOut, MapPin, Menu, Search, Settings, ShieldCheck, Siren, X, type LucideIcon } from "lucide-react";
import type { Period } from "../types/analytics";
import { Badge } from "../components/ui";
import { isDemoMode } from "../api/client";
import { BrandMark } from "../components/Brand";
import { useAuth } from "../auth/AuthContext";

export interface DashboardDetail { title: string; description: string; entries: Array<{ label: string; value: string }>; note: string }
export interface AnalyticsContext { period: Period; search: string; setPeriod: (period: Period) => void; setSearch: (search: string) => void; showDetail: (detail: DashboardDetail) => void }

function readClickedItem(item: HTMLElement, pageName: string, periodLabel: string, demo: boolean): DashboardDetail | null {
  const compact = (value: string | null | undefined) => value?.replace(/\s+/gu, " ").trim() ?? "";
  const text = compact(item.innerText);
  if (!text) return null;
  const semanticTitle = item.matches(".metric-tile")
    ? compact(item.querySelector(".metric-tile-label")?.textContent).replace(/\s+0\d+$/u, "")
    : item.matches(".analysis-stat-row > div")
      ? compact(item.querySelector("span")?.textContent)
      : item.matches(".matrix-cell")
        ? `${compact(item.closest(".matrix-row")?.querySelector("strong")?.textContent) || "Recorded outcome"} · ${compact(item.innerText)}`
        : item.matches(".panel-heading")
          ? compact(item.querySelector("h2")?.textContent)
          : item.matches(".settings-source-card > strong, .settings-source-card > p, .settings-source-card > small, .proposed-site-list > div, .coverage-gaps > span, .historical-warning, .factor-source-note, .route-auth-note, .method-limitation, .network-map-foot span, .chart-legend > span, .risk-legend > span, .facility-legend > span, .report-demo-note")
            ? compact(item.innerText).slice(0, 90)
            : "";
  const heading = compact(item.querySelector<HTMLElement>(".factor-name, .cluster-info strong, .route-result-metrics > div > span, .route-alternatives > div > span:first-child, .business-value-grid > div > span, .matrix-row > strong, .report-status-item > div > strong, .facility-list-item strong, .finding-row > p, .severity-legend strong, .settings-readonly-row > span, .settings-profile strong, .settings-current strong, .settings-source-card > strong, .prediction-banner strong, .report-disclaimer strong, .historical-warning, .factor-source-note, .route-auth-note, .method-limitation, .panel-heading h2, h2, h3, h4, strong")?.innerText);
  const title = semanticTitle || heading || (item.tagName === "TR" ? compact(item.querySelector("th")?.textContent) : "") || pageName;
  const rawLines = (item.innerText || "").split(/\n+/u).map(compact).filter(Boolean);
  const description = compact(item.querySelector<HTMLElement>(".factor-name small, .cluster-info small, .facility-list-item small, .settings-profile small, .panel-heading p")?.innerText)
    || (item.matches(".finding-row") ? "Dashboard finding" : item.matches(".analysis-stat-row > div, .metric-tile") ? "Summary metric for the selected reporting period" : `Details for ${title}`);
  let entries: DashboardDetail["entries"] = [];

  if (item.matches(".metric-tile")) {
    entries = [
      { label: "Current value", value: compact(item.querySelector(".metric-main-value")?.textContent) || "—" },
      ...(compact(item.querySelector(".metric-change")?.textContent) ? [{ label: "Change", value: compact(item.querySelector(".metric-change")?.textContent) }] : []),
      ...(compact(item.querySelector(".metric-helper")?.textContent) ? [{ label: "Context", value: compact(item.querySelector(".metric-helper")?.textContent) }] : []),
    ];
  } else if (item.matches(".analysis-stat-row > div")) {
    const parts = Array.from(item.children).map((child) => compact(child.textContent)).filter(Boolean);
    entries = [{ label: parts[0] || "Metric", value: parts[1] || "—" }, ...(parts[2] ? [{ label: "Context", value: parts[2] }] : [])];
  } else if (item.matches(".factor-row")) {
    entries = [
      { label: "Factor", value: title },
      { label: "Direction", value: compact(item.querySelector(".factor-name small")?.textContent) || "Not specified" },
      { label: "Influence score", value: compact(item.querySelector(".factor-row > strong")?.textContent) || "Not available" },
    ];
  } else if (item.matches(".cluster-list-item")) {
    entries = [
      { label: "Location", value: title },
      { label: "Road-user group", value: compact(item.querySelector(".cluster-info small")?.textContent) || "Not specified" },
      { label: "Report count", value: compact(item.querySelector(".cluster-count")?.textContent) || "0" },
    ];
  } else if (item.matches(".report-status-item")) {
    entries = [
      { label: "Location", value: compact(item.querySelector("strong")?.textContent) || title },
      { label: "Incident and date", value: compact(item.querySelector("span")?.textContent) || "Not provided" },
      { label: "Review status", value: compact(item.querySelector(".badge")?.textContent) || "Pending" },
    ];
  } else if (item.matches(".facility-list-item")) {
    entries = [
      { label: "Facility", value: compact(item.querySelector("strong")?.textContent) || title },
      { label: "Type", value: compact(item.querySelector("small")?.textContent) || "Not specified" },
    ];
  } else if (item.matches(".settings-readonly-row")) {
    entries = [{ label: compact(item.querySelector("span")?.textContent) || "Workspace setting", value: compact(item.querySelector("strong")?.textContent) || "Not available" }];
  } else if (item.matches(".settings-profile")) {
    entries = [{ label: "Account name", value: compact(item.querySelector("strong")?.textContent) || "Not available" }, { label: "Email", value: compact(item.querySelector("small")?.textContent) || "Not available" }];
  } else if (item.matches(".settings-current")) {
    entries = [{ label: "Current reporting window", value: compact(item.querySelector("strong")?.textContent) || "Not available" }, { label: "Status", value: compact(item.querySelector("small")?.textContent) || "Current setting" }];
  } else if (item.matches(".route-result-metrics > div")) {
    entries = [{ label: compact(item.querySelector("span")?.textContent) || "Route metric", value: compact(item.querySelector("strong")?.textContent) || "Not available" }];
  } else if (item.matches(".route-alternatives > div")) {
    entries = [{ label: "Alternative route", value: rawLines[0] || title }, { label: "Distance and time", value: rawLines.slice(1).join(" · ") || "Not available" }];
  } else if (item.matches(".business-value-grid > div")) {
    entries = [{ label: "Action", value: title }, { label: "Potential use", value: rawLines.slice(1).join(" ") || description }];
  } else if (item.matches(".finding-row")) {
    entries = [{ label: "Finding", value: compact(item.querySelector("p")?.textContent) || text }];
  } else if (item.matches("tbody tr")) {
    const headers = Array.from(item.closest("table")?.querySelectorAll("thead th") ?? []).map((header) => compact(header.textContent));
    const cells = Array.from(item.querySelectorAll("th,td")).map((cell) => compact(cell.textContent));
    entries = cells.map((value, index) => ({ label: headers[index] || `Value ${index + 1}`, value }));
  } else if (item.matches(".matrix-cell")) {
    const row = item.closest(".matrix-row");
    const matrix = item.closest(".confusion-matrix");
    const columns = Array.from(matrix?.querySelectorAll<HTMLElement>(":scope > span") ?? []).map((element) => compact(element.innerText));
    const rowLabel = compact(row?.querySelector("strong")?.textContent) || "Recorded outcome";
    const cells = Array.from(row?.querySelectorAll(".matrix-cell") ?? []);
    const columnIndex = cells.indexOf(item);
    entries = [{ label: `${rowLabel} · ${columns[columnIndex] || "Estimated outcome"}`, value: text }];
  } else if (item.matches(".matrix-row")) {
    const matrix = item.closest(".confusion-matrix");
    const columns = Array.from(matrix?.querySelectorAll<HTMLElement>(":scope > span") ?? []).map((element) => compact(element.innerText));
    const cells = Array.from(item.querySelectorAll<HTMLElement>(".matrix-cell"));
    const rowLabel = compact(item.querySelector("strong")?.textContent) || title;
    entries = cells.map((cell, index) => ({ label: `${rowLabel} · ${columns[index] || `Outcome ${index + 1}`}`, value: compact(cell.innerText) }));
  } else if (item.matches(".coverage-preview, .coverage-time-compare, .proposed-site-list > div, .coverage-gaps > span, .severity-legend > button, .severity-legend > div, .limitations-grid > div, .methodology-grid > div, .evaluation-metric, .settings-source-card > strong, .settings-source-card > p, .settings-source-card > small, .prediction-banner, .report-disclaimer, .historical-warning, .factor-source-note, .route-auth-note, .method-limitation, .report-explainer li, .report-demo-note, .network-map-foot span, .chart-legend > span, .risk-legend > span, .facility-legend > span")) {
    entries = [{ label: "Selected item", value: text }];
  } else if (item.matches(".panel-heading")) {
    const panelTitle = compact(item.querySelector("h2")?.textContent) || title;
    entries = [{ label: "Panel", value: panelTitle }, { label: "Context", value: description }];
  } else {
    entries = [{ label: "Selected item", value: text }];
  }

  return {
    title,
    description,
    entries: [{ label: "Reporting period", value: periodLabel }, ...entries.slice(0, 8)],
    note: demo ? "This is illustrative sample information, not an official statistic." : "Details are limited to the selected item in the connected dashboard data.",
  };
}

function isCardInteractionExcluded(target: Element): boolean {
  if (target.closest(".cluster-list-item")) return false;
  return Boolean(target.closest("a,button,input,select,textarea,form,label,[role='button'],[role='link'],.admin-dashboard,.admin-interactive-card,.analytics-detail-card,.overview-map,.hotspot-large-map,.nairobi-map,.map-layer-switch,.map-filter-row,.recharts-wrapper"));
}

const navGroups: Array<{ label: string; items: Array<{ label: string; path: string; icon: LucideIcon }> }> = [
  { label: "INSIGHTS", items: [
    { label: "Overview", path: "/analytics", icon: Activity },
    { label: "Accident analysis", path: "/analytics/accidents", icon: BarChart3 },
    { label: "Hotspots", path: "/analytics/hotspots", icon: MapPin },
    { label: "Severity", path: "/analytics/severity", icon: AlertTriangle },
    { label: "Risk factors", path: "/analytics/risk-factors", icon: Layers3 },
    { label: "Estimate results", path: "/analytics/predictions", icon: ShieldCheck },
  ] },
  { label: "RESPONSE", items: [
    { label: "Emergency response", path: "/analytics/emergency", icon: Siren },
    { label: "Community reports", path: "/analytics/reports", icon: FileText },
  ] },
  { label: "WORKSPACE", items: [
    { label: "Settings", path: "/analytics/settings", icon: Settings },
  ] },
];

export function AnalyticsLayout() {
  const [period, setPeriod] = useState<Period>("all");
  const [search, setSearch] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [cardDetail, setCardDetail] = useState<DashboardDetail | null>(null);
  const contentRef = useRef<HTMLElement | null>(null);
  const cardDetailCloseRef = useRef<HTMLButtonElement | null>(null);
  const { user, signOut } = useAuth();
  const displayedGroups = user?.role === "admin" ? [...navGroups, { label: "ADMIN", items: [{ label: "Application health", path: "/analytics/admin", icon: Gauge }] }] : navGroups;
  const navigate = useNavigate();
  const location = useLocation();
  const pageName = location.pathname.endsWith("/accidents") ? "Accident analysis" : location.pathname.endsWith("/hotspots") ? "Accident hotspots" : location.pathname.endsWith("/severity") ? "Severity analysis" : location.pathname.endsWith("/risk-factors") ? "Risk factors" : location.pathname.endsWith("/predictions") ? "Estimate results" : location.pathname.endsWith("/emergency") ? "Emergency response" : location.pathname.endsWith("/reports") ? "Community reports" : location.pathname.endsWith("/settings") ? "Settings" : location.pathname.endsWith("/admin") ? "Application health" : "Overview";
  const searchable = location.pathname === "/analytics" || location.pathname === "/analytics/hotspots";
  const periodRelevant = !location.pathname.endsWith("/emergency");
  const periodLabel = isDemoMode ? "Sample snapshot" : ({ "30d": "Last 30 days", "90d": "Last 90 days", "12m": "Last 12 months", all: "All available data" } satisfies Record<Period, string>)[period];

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const decorateCards = () => {
      content.querySelectorAll<HTMLElement>(".card").forEach((card) => {
        if (card.closest(".admin-dashboard") || card.classList.contains("admin-interactive-card") || card.classList.contains("analytics-detail-card")) return;
        card.tabIndex = 0;
        if (!card.hasAttribute("role")) card.setAttribute("role", "group");
        card.setAttribute("aria-haspopup", "dialog");
        if (!card.hasAttribute("aria-label")) {
          const title = card.querySelector<HTMLElement>(".panel-heading h2, h2, h3, h4")?.innerText.trim()
            || card.querySelector<HTMLElement>(".metric-tile-label")?.innerText.replace(/\s+0\d+$/u, "").trim()
            || "Dashboard card";
          card.setAttribute("aria-label", `${title}. Press Enter for details.`);
        }
        card.title ||= "Click or press Enter to view details";
      });
    };
    decorateCards();
    const observer = new MutationObserver(decorateCards);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [location.pathname]);

  useEffect(() => {
    if (!cardDetail) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleDialogKeys = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setCardDetail(null);
      } else if (event.key === "Tab") {
        event.preventDefault();
        cardDetailCloseRef.current?.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleDialogKeys);
    cardDetailCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeys);
      previousFocus?.focus();
    };
  }, [cardDetail]);

  const openCardDetail = (card: HTMLElement) => {
    const heading = card.querySelector<HTMLElement>(".panel-heading");
    if (heading) {
      const title = heading.querySelector("h2")?.textContent?.trim() || pageName;
      const description = heading.querySelector("p")?.textContent?.trim() || `Dashboard panel in ${pageName}.`;
      setCardDetail({ title, description, entries: [{ label: "Reporting period", value: periodLabel }], note: isDemoMode ? "This section is showing illustrative sample information, not official statistics." : "Select a specific value or chart point to inspect its individual details." });
      return;
    }
    const metricLabel = card.querySelector<HTMLElement>(".metric-tile-label")?.innerText.replace(/\s+0\d+$/u, "").trim();
    const value = card.querySelector<HTMLElement>(".metric-main-value")?.innerText.replace(/\s+/gu, " ").trim();
    if (metricLabel) {
      setCardDetail({ title: metricLabel, description: `Summary metric shown on ${pageName}.`, entries: [{ label: "Value", value: value || "—" }, { label: "Reporting period", value: periodLabel }], note: isDemoMode ? "This is illustrative sample information, not an official statistic." : "This value reflects the currently connected dashboard data." });
    }
  };
  const openSpecificItem = (item: HTMLElement) => {
    const detail = readClickedItem(item, pageName, periodLabel, isDemoMode);
    if (detail) setCardDetail(detail);
  };
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || isCardInteractionExcluded(target)) return;
    const item = target.closest<HTMLElement>(".metric-tile, .analysis-stat-row > div, .factor-row, .finding-row, .cluster-list-item, .facility-list-item, .report-status-item, .route-result-metrics > div, .route-alternatives > div, .business-value-grid > div, .limitations-grid > div, .methodology-grid > div, .confusion-matrix .matrix-row, .confusion-matrix .matrix-cell, .proposed-site-list > div, .coverage-gaps > span, .coverage-preview, .coverage-time-compare, .severity-legend > button, .severity-legend > div, .settings-readonly-row, .settings-profile, .settings-current, .settings-source-card > strong, .settings-source-card > p, .settings-source-card > small, .prediction-banner, .report-disclaimer, .historical-warning, .factor-source-note, .route-auth-note, .method-limitation, .report-explainer li, .report-demo-note, .network-map-foot span, .chart-legend > span, .risk-legend > span, .facility-legend > span, tbody tr, .panel-heading, .interpretation-card > p, .data-mode-note, .decision-alert, .insights-strip");
    if (item && !item.closest(".admin-dashboard")) {
      openSpecificItem(item);
      return;
    }
    const card = target.closest<HTMLElement>(".analytics-content .card");
    if (card && !card.closest(".admin-dashboard") && !target.closest(".recharts-wrapper")) openCardDetail(card);
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !target.matches(".analytics-content .card") || isCardInteractionExcluded(target)) return;
    event.preventDefault();
    openCardDetail(target as HTMLElement);
  };
  const showDetail = (detail: DashboardDetail) => setCardDetail({ ...detail, entries: [{ label: "Reporting period", value: periodLabel }, ...detail.entries].slice(0, 9) });
  return <div className="analytics-shell">
    <aside className={`analytics-sidebar ${mobileOpen ? "sidebar-open" : ""}`} aria-label="RoadLens workspace">
      <Link className="brand brand-analytics" to="/" aria-label="RoadLens home"><BrandMark /><span><strong>RoadLens</strong><small>NAIROBI ROAD INTELLIGENCE</small></span></Link>
      <div className="sidebar-location"><span className="location-dot" />NAIROBI COUNTY <span>↗</span></div>
      <nav id="analytics-navigation" aria-label="Analytics navigation">{displayedGroups.map((group) => <div className="nav-group" key={group.label}><div className="nav-label">{group.label}</div>{group.items.map(({ label, path, icon: Icon }) => <NavLink key={path} to={path} end={path === "/analytics"} onClick={() => setMobileOpen(false)} className={({ isActive }) => `analytics-nav-link ${isActive ? "active" : ""}`}><Icon size={16} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</div>)}</nav>
      <div className="sidebar-bottom"><div className="sidebar-foot"><div className="sidebar-foot-avatar">{user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</div><div className="sidebar-account"><strong>{user?.name}</strong><span>{user?.email}</span></div><button className="sidebar-signout" type="button" onClick={async () => { setSigningOut(true); try { await signOut(); navigate("/"); } finally { setSigningOut(false); } }} disabled={signingOut} aria-label="Sign out" title="Sign out"><LogOut size={15} /></button></div></div>
    </aside>
    {mobileOpen && <button className="sidebar-scrim" type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <div className="analytics-main">
      <header className="analytics-topbar"><div className="topbar-left"><button className="mobile-menu-button" type="button" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="analytics-navigation" onClick={() => setMobileOpen(true)}><Menu size={19} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{pageName}</strong></div></div><div className="topbar-right">{searchable && <label className="global-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search map locations" aria-label="Search map locations" /></label>}{periodRelevant && !isDemoMode && <label className="period-select"><Clock3 size={14} /><select value={period} onChange={(event) => setPeriod(event.target.value as Period)} aria-label="Reporting period"><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="12m">Last 12 months</option><option value="all">All available</option></select><ChevronDown size={13} /></label>}{isDemoMode && periodRelevant && <span className="period-data-note" title="Time filters activate when a connected analytics API is configured"><Clock3 size={14} />Sample snapshot</span>}<Badge className={isDemoMode ? "demo-badge" : "live-data-badge"}><span />{isDemoMode ? "DEMO DATA" : "BACKEND DATA"}</Badge></div></header>
      <main ref={contentRef} className="analytics-content" onClick={handleCardClick} onKeyDown={handleCardKeyDown}><Outlet context={{ period, search, setPeriod, setSearch, showDetail } satisfies AnalyticsContext} /></main>
      {cardDetail && <div className="analytics-detail-backdrop" role="presentation" onClick={(event) => {
        if (event.target === event.currentTarget) setCardDetail(null);
      }}>
        <section className="analytics-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="section-card-detail-title" aria-describedby="section-card-detail-description" onClick={(event) => event.stopPropagation()}>
          <div className="analytics-detail-dialog-top"><span>ROADLENS · {pageName.toUpperCase()} DETAILS</span><button ref={cardDetailCloseRef} type="button" className="analytics-detail-close" aria-label="Close details" onClick={() => setCardDetail(null)}><X size={16} /></button></div>
          <h2 id="section-card-detail-title">{cardDetail.title}</h2>
          <p id="section-card-detail-description">{cardDetail.description}</p>
          <dl className="analytics-detail-values">{cardDetail.entries.map((entry) => <div key={`${entry.label}-${entry.value}`}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>
          <div className="analytics-detail-note">{cardDetail.note}</div>
        </section>
      </div>}
    </div>
  </div>;
}

export function AnalyticsBackLink() { return <Link className="back-link" to="/"><ArrowLeft size={15} />Public RoadLens</Link>; }

