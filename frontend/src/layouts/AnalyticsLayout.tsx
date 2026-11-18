import { useEffect, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Activity, AlertTriangle, ArrowLeft, BarChart3, ChevronDown, Clock3, FileText, Gauge, Layers3, LogOut, MapPin, Menu, Search, Settings, ShieldCheck, Siren, X, type LucideIcon } from "lucide-react";
import type { Period } from "../types/analytics";
import { Badge } from "../components/ui";
import { isDemoMode } from "../api/client";
import { BrandMark } from "../components/Brand";
import { useAuth } from "../auth/AuthContext";

export interface AnalyticsContext { period: Period; search: string; setPeriod: (period: Period) => void; setSearch: (search: string) => void }

interface SectionCardDetail { title: string; description: string; entries: Array<{ label: string; value: string }>; note: string }

function readSectionCard(card: HTMLElement, pageName: string, periodLabel: string, demo: boolean): SectionCardDetail {
  const title = card.querySelector<HTMLElement>(".panel-heading h2, .route-form-heading strong, .page-card-heading, h2, h3, h4")?.innerText.trim()
    || card.querySelector<HTMLElement>(".metric-tile-label")?.innerText.replace(/\s+0\d+$/u, "").trim()
    || card.getAttribute("aria-label")
    || pageName;
  const description = card.querySelector<HTMLElement>(".panel-heading p, .route-form-heading small, .card-description, .interpretation-card p")?.innerText.trim()
    || `More context from this ${pageName.toLowerCase()} panel.`;
  const structuredItems = Array.from(card.querySelectorAll<HTMLElement>(
    ".analysis-stat-row > div, .severity-legend > button, .severity-legend > div, .factor-row, .finding-row, .cluster-list-item, .facility-list-item, .coverage-preview, .coverage-time-compare, .route-result-metrics > div, .route-alternatives > div, .business-value-grid > div, .limitations-grid > div, .methodology-grid > div, tbody tr",
  )).map((item) => item.innerText.replace(/\s+/gu, " ").trim()).filter(Boolean);
  const visibleLines = (card.innerText || "").split(/\n+/u).map((line) => line.replace(/\s+/gu, " ").trim())
    .filter((line) => line && line !== title && line !== description && !/^\d+$/u.test(line));
  const detailLines = (structuredItems.length ? structuredItems : visibleLines).slice(0, 7);
  const entries = detailLines.map((line, index) => ({ label: structuredItems.length ? `Panel item ${index + 1}` : `Visible detail ${index + 1}`, value: line }));
  return {
    title,
    description,
    entries: [{ label: "Dashboard section", value: pageName }, { label: "Reporting period", value: periodLabel }, ...entries],
    note: demo ? "This section is showing illustrative sample information, not official statistics." : "Details reflect the currently visible content returned by the connected service.",
  };
}

function isCardInteractionExcluded(target: Element): boolean {
  return Boolean(target.closest("a,button,input,select,textarea,form,label,[role='button'],[role='link'],.admin-dashboard,.admin-interactive-card,.analytics-detail-card,.overview-map,.hotspot-large-map,.nairobi-map,.cluster-list-item,.map-layer-switch,.map-filter-row"));
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
  const [cardDetail, setCardDetail] = useState<SectionCardDetail | null>(null);
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

  const openCardDetail = (card: HTMLElement) => setCardDetail(readSectionCard(card, pageName, periodLabel, isDemoMode));
  const handleCardClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || isCardInteractionExcluded(target)) return;
    const card = target.closest<HTMLElement>(".analytics-content .card");
    if (card && !card.closest(".admin-dashboard")) openCardDetail(card);
  };
  const handleCardKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target instanceof Element ? event.target : null;
    if (!target || !target.matches(".analytics-content .card") || isCardInteractionExcluded(target)) return;
    event.preventDefault();
    openCardDetail(target as HTMLElement);
  };
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
      <main ref={contentRef} className="analytics-content" onClick={handleCardClick} onKeyDown={handleCardKeyDown}><Outlet context={{ period, search, setPeriod, setSearch } satisfies AnalyticsContext} /></main>
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

