import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown, Info, MapPin, Menu, X } from "lucide-react";
import { BrandMark } from "../components/Brand";
import { NairobiMap } from "../components/NairobiMap";
import { isDemoMode, roadlensApi } from "../api/client";
import { useRoadlensData } from "../hooks/useRoadlensData";
import { useAuth } from "../auth/AuthContext";
import type { Hotspot, Period, RiskLevel } from "../types/analytics";

const countColors: Record<RiskLevel, string> = {
  high: "#167d78",
  moderate: "#e6a23c",
  lower: "#84969a",
};

const periodLabels: Record<Period, string> = {
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
  all: "All available data",
};

function updatedLabel(value?: string) {
  if (!value) return "Update time not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `Updated ${date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}`;
}

function valueOrUnavailable(value: string | number | undefined, mode?: "demo" | "live", loading = false) {
  if (mode === "live") return value ?? "Unavailable";
  if (loading || !mode) return "Loading";
  return "Unavailable";
}

function AnimatedValue({ value }: { value: string | number }) {
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const inView = useInView(elementRef, { once: true, margin: "0px 0px -8% 0px" });
  const reduceMotion = useReducedMotion() ?? false;
  const numericValue = typeof value === "number"
    ? value
    : /^\d[\d,]*$/.test(value)
      ? Number(value.replaceAll(",", ""))
      : null;
  const counter = useMotionValue(0);
  const roundedValue = useTransform(counter, (current) => Math.round(current).toLocaleString());

  useEffect(() => {
    if (!inView || numericValue === null) return;
    if (reduceMotion) {
      counter.set(numericValue);
      return;
    }
    const animation = animate(counter, numericValue, { duration: 0.7, ease: "easeOut" });
    return () => animation.stop();
  }, [counter, inView, numericValue, reduceMotion]);

  return numericValue === null
    ? <span ref={elementRef}>{value}</span>
    : <motion.span ref={elementRef}>{roundedValue}</motion.span>;
}

function countLabel(level: RiskLevel) {
  if (level === "high") return "Higher count";
  if (level === "moderate") return "Medium count";
  return "Lower count";
}

function LocationDetails({ point, onClear }: { point: Hotspot | null; onClear: () => void }) {
  if (!point) {
    return <div className="lp-location-empty">
      <MapPin size={18} />
      <strong>Select a location</strong>
      <span>Choose a marker or a place in the list to see its reported details.</span>
    </div>;
  }

  return <div className="lp-location-detail" role="status" aria-live="polite">
    <div className="lp-location-topline">
      <span className="lp-overline">REPORTED LOCATION</span>
      <button type="button" onClick={onClear} aria-label="Clear selected location"><X size={16} /></button>
    </div>
    <h3>{point.name}</h3>
    <p>{point.summary || "Crash reports were returned for this location."}</p>
    <div className="lp-location-metrics">
      <div><strong>{point.incidents.toLocaleString()}</strong><span>reported crashes</span></div>
      <div><strong>{point.fatalities.toLocaleString()}</strong><span>fatality reports</span></div>
    </div>
    <div className="lp-location-road-user"><span>Largest road-user group</span><strong>{point.mainRoadUser || "Not provided"}</strong></div>
  </div>;
}

export function PublicLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [level, setLevel] = useState<RiskLevel | "all">("all");
  const [roadUser, setRoadUser] = useState("all");
  const [scaleMarkers, setScaleMarkers] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Hotspot | null>(null);
  const { user } = useAuth();
  const reduceMotion = useReducedMotion() ?? false;
  const { data: overview, meta: overviewMeta, loading: overviewLoading } = useRoadlensData(
    (signal) => roadlensApi.overview("all", undefined, signal),
    [],
  );
  const { data: hotspotData, meta: hotspotMeta, loading: hotspotsLoading, error: hotspotsError, reload: reloadHotspots } = useRoadlensData(
    (signal) => roadlensApi.hotspots(period, undefined, signal),
    [period],
  );
  const { data: riskData, meta: riskMeta, loading: riskLoading } = useRoadlensData(
    (signal) => roadlensApi.riskFactors("all", signal),
    [],
  );

  const liveLocations = hotspotMeta?.mode === "live" ? hotspotData?.locations ?? [] : [];
  const roadUsers = useMemo(() => [...new Set(liveLocations.map((location) => location.mainRoadUser).filter(Boolean))].sort(), [liveLocations]);
  const filteredLocations = useMemo(() => liveLocations.filter((location) =>
    (level === "all" || location.level === level) &&
    (roadUser === "all" || location.mainRoadUser === roadUser),
  ), [level, liveLocations, roadUser]);
  const visibleSelected = filteredLocations.find((location) => location.id === selectedLocation?.id) ?? null;

  const accidentMetric = overview?.metrics.find((metric) => /accident|crash/i.test(metric.label));
  const liveOverview = overviewMeta?.mode === "live";
  const liveHotspots = hotspotMeta?.mode === "live";
  const liveRisk = riskMeta?.mode === "live";
  const accidentValue = valueOrUnavailable(accidentMetric?.value, overviewMeta?.mode, overviewLoading);
  const riskValue = valueOrUnavailable(riskData?.factors.length, riskMeta?.mode, riskLoading);
  const dataUpdatedAt = hotspotMeta?.mode === "live" ? hotspotMeta.updatedAt : overviewMeta?.mode === "live" ? overviewMeta.updatedAt : riskMeta?.mode === "live" ? riskMeta.updatedAt : undefined;
  const openDashboard = user ? "/analytics" : "/login";

  const closeMenu = () => setMenuOpen(false);
  const fadeInitial = reduceMotion ? false : { opacity: 0, y: 14 };
  const fadeTransition = { duration: reduceMotion ? 0 : 0.55, ease: "easeOut" as const };

  return <div className="redesign-landing">
    <header className="lp-header">
      <div className="lp-header-inner">
        <Link className="lp-brand" to="/" aria-label="RoadLens home" onClick={closeMenu}>
          <BrandMark />
          <span><strong>RoadLens</strong><small>NAIROBI ROAD SAFETY</small></span>
        </Link>
        <nav className={`lp-nav ${menuOpen ? "lp-nav-open" : ""}`} aria-label="Main navigation">
          <a href="#about" onClick={closeMenu}>About</a>
          <a href="#insights" onClick={closeMenu}>Insights</a>
          <a className="lp-mobile-map" href="#map" onClick={closeMenu}>Explore Map <ArrowUpRight size={14} /></a>
        </nav>
        <div className="lp-header-actions">
          <Link className="lp-signin" to={openDashboard}>{user ? "Dashboard" : "Sign in"}</Link>
          <a className="lp-header-cta" href="#map" onClick={closeMenu}>Explore Map <ArrowUpRight size={15} /></a>
          <button className="lp-menu-button" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
    </header>

    <main>
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        <div className="lp-hero-inner">
          <motion.div className="lp-hero-copy" initial={fadeInitial} animate={{ opacity: 1, y: 0 }} transition={fadeTransition}>
            <span className="lp-eyebrow"><i /> NAIROBI ROAD SAFETY INTELLIGENCE</span>
            <h1 id="lp-hero-title">Making Nairobi’s roads safer, <em>one insight at a time.</em></h1>
            <p>RoadLens transforms road accident data into meaningful insights, helping identify dangerous locations, understand accident patterns and support safer roads across Nairobi.</p>
            <div className="lp-hero-actions">
              <Link className="lp-button lp-button-primary" to={user ? "/analytics/accidents" : "/login"}>Explore Road Data <ArrowRight size={16} /></Link>
              <a className="lp-button lp-button-secondary" href="#about">Learn More <ChevronDown size={15} /></a>
            </div>
            <div className="lp-hero-note"><MapPin size={15} /><span>Built for better road safety decisions in Nairobi County.</span></div>
          </motion.div>

          <motion.div className="lp-hero-visual" initial={reduceMotion ? false : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...fadeTransition, delay: reduceMotion ? 0 : 0.08 }}>
            <div className="lp-map-preview-card">
              <div className="lp-map-preview-heading">
                <div><span className="lp-map-status-dot" /> NAIROBI, KENYA</div>
                <span>{liveHotspots ? "CONNECTED DATA" : "ROAD NETWORK"}</span>
              </div>
              <div className="lp-hero-map">
                <NairobiMap points={liveLocations.slice(0, 5)} preview scaleMarkers sourceLabel={liveHotspots ? "CONNECTED CRASH LOCATIONS" : "OPENSTREETMAP ROAD NETWORK"} />
                {!liveHotspots && <div className="lp-hero-map-note"><MapPin size={15} /><span>{isDemoMode ? "Live crash locations are not connected" : "Live location data is unavailable"}</span></div>}
              </div>
              <div className="lp-map-preview-foot"><span>OpenStreetMap road context</span><span>Crash markers require connected data</span></div>
            </div>
            <div className="lp-map-callout"><span><ArrowDownRight size={17} /></span><div><strong>Evidence for safer roads</strong><small>Location · timing · road users</small></div><Check size={16} /></div>
          </motion.div>
        </div>
        <a className="lp-scroll-link" href="#map">Explore the map <ChevronDown size={14} /></a>
      </section>

      <section className="lp-map-section" id="map" aria-labelledby="lp-map-title">
        <div className="lp-section-shell">
          <div className="lp-section-intro" id="about">
            <div>
              <span className="lp-section-kicker">A CLEARER VIEW OF NAIROBI</span>
              <h2 id="lp-map-title">Explore reported crash locations.</h2>
            </div>
            <p>Use the map to review locations returned by the connected road safety service. Past reports describe what happened; they do not predict the next crash.</p>
          </div>

          <div className="lp-map-workspace">
            <div className="lp-map-toolbar" aria-label="Map filters">
              <label><span>REPORTING PERIOD</span><select value={period} onChange={(event) => { setPeriod(event.target.value as Period); setSelectedLocation(null); }} aria-label="Reporting period">
                {(Object.keys(periodLabels) as Period[]).map((key) => <option key={key} value={key}>{periodLabels[key]}</option>)}
              </select></label>
              <label><span>ROAD-USER GROUP</span><select value={roadUser} onChange={(event) => setRoadUser(event.target.value)} aria-label="Road-user group" disabled={!roadUsers.length}>
                <option value="all">All groups</option>
                {roadUsers.map((name) => <option key={name} value={name}>{name}</option>)}
              </select></label>
              <label><span>REPORTED LEVEL</span><select value={level} onChange={(event) => setLevel(event.target.value as RiskLevel | "all")} aria-label="Reported location level">
                <option value="all">All locations</option><option value="high">Higher</option><option value="moderate">Medium</option><option value="lower">Lower</option>
              </select></label>
              <button className={`lp-marker-toggle ${scaleMarkers ? "active" : ""}`} type="button" aria-pressed={scaleMarkers} onClick={() => setScaleMarkers((value) => !value)}>
                {scaleMarkers ? "Larger = more reports" : "Equal marker size"}
              </button>
            </div>

            <div className="lp-map-content">
              <div className="lp-map-canvas">
                <NairobiMap points={filteredLocations} onSelect={setSelectedLocation} selectedId={visibleSelected?.id} scaleMarkers={scaleMarkers} sourceLabel={liveHotspots ? "CONNECTED CRASH LOCATIONS" : "OPENSTREETMAP ROAD NETWORK"} />
                {!liveHotspots && <div className="lp-map-empty" role="status">
                  <Info size={18} />
                  <strong>{hotspotsError ? "Crash locations could not be loaded" : "Live crash locations are not connected"}</strong>
                  <span>{hotspotsError ? "Try again to request the latest location data." : "The map shows OpenStreetMap roads. Connect the road safety service to display reports."}</span>
                  {hotspotsError && <button type="button" onClick={reloadHotspots}>Retry</button>}
                </div>}
                {liveHotspots && !hotspotsLoading && filteredLocations.length === 0 && <div className="lp-map-empty lp-map-empty-compact" role="status">
                  <Info size={17} /><strong>No locations returned for these filters.</strong><span>Try another reporting period or location level.</span>
                </div>}
                <div className="lp-map-attribution-note">Map tiles © OpenStreetMap contributors</div>
              </div>
              <aside className="lp-location-panel" aria-label="Location details">
                <LocationDetails point={visibleSelected} onClear={() => setSelectedLocation(null)} />
                <div className="lp-location-list-heading"><span>LOCATIONS IN VIEW</span><strong>{liveHotspots ? filteredLocations.length : "—"}</strong></div>
                <div className="lp-location-list">
                  {filteredLocations.slice(0, 6).map((point) => <button key={point.id} type="button" className={visibleSelected?.id === point.id ? "selected" : ""} onClick={() => setSelectedLocation(point)}>
                    <i style={{ background: countColors[point.level] }} /><span><strong>{point.name}</strong><small>{countLabel(point.level)} · {point.mainRoadUser || "Road users not specified"}</small></span><b>{point.incidents.toLocaleString()}</b>
                  </button>)}
                  {!filteredLocations.length && <p>{liveHotspots ? "No matching locations." : "Location details appear here when data is connected."}</p>}
                </div>
                <Link className="lp-full-map-link" to={user ? "/analytics/hotspots" : "/login"}>Explore full map <ArrowUpRight size={15} /></Link>
              </aside>
            </div>
            <div className="lp-map-legend" aria-label="Map legend">
              <span><i style={{ background: countColors.high }} />Higher reported level</span>
              <span><i style={{ background: countColors.moderate }} />Medium reported level</span>
              <span><i style={{ background: countColors.lower }} />Lower reported level</span>
              <small>Marker size follows report count when enabled.</small>
            </div>
          </div>
        </div>
      </section>

      <section className="lp-impact-section" id="insights" aria-labelledby="lp-impact-title">
        <div className="lp-section-shell">
          <div className="lp-impact-heading">
            <div><span className="lp-section-kicker">ROAD SAFETY IMPACT</span><h2 id="lp-impact-title">A useful picture starts with reliable records.</h2></div>
            <p>These indicators summarize what the connected service has returned. They are not forecasts or official totals unless the source confirms them.</p>
          </div>
          <div className="lp-impact-grid">
            <article><span>01</span><strong><AnimatedValue value={valueOrUnavailable(liveHotspots ? liveLocations.length : undefined, hotspotMeta?.mode, hotspotsLoading)} /></strong><h3>Accident hotspots</h3><p>{liveHotspots ? "Locations returned for the selected reporting period." : "Live location data will appear when the service is connected."}</p></article>
            <article><span>02</span><strong><AnimatedValue value={accidentValue} /></strong><h3>Recorded road incidents</h3><p>{liveOverview ? accidentMetric?.helper || "Reported incidents in the connected data." : "Live incident totals will appear when the service is connected."}</p></article>
            <article><span>03</span><strong><AnimatedValue value={riskValue} /></strong><h3>Road risk analysis</h3><p>{liveRisk ? "Conditions returned for review in the connected analysis." : "Risk details will appear when analysis data is connected."}</p></article>
          </div>
          <div className="lp-impact-source"><Info size={15} /><span>{liveOverview || liveHotspots || liveRisk ? "Source: connected RoadLens data service and OpenStreetMap road tiles." : "Source: OpenStreetMap road tiles. RoadLens incident data is not connected."}</span><small>{updatedLabel(dataUpdatedAt)}</small></div>
        </div>
      </section>
    </main>

    <footer className="lp-footer">
      <div className="lp-footer-main">
        <div className="lp-footer-brand">
          <Link className="lp-brand" to="/" aria-label="RoadLens home"><BrandMark /><span><strong>RoadLens</strong><small>NAIROBI ROAD SAFETY</small></span></Link>
          <p>Clearer road safety information for better decisions across Nairobi.</p>
        </div>
        <nav aria-label="Footer navigation"><a href="#about">About</a><a href="#insights">Insights</a><a href="#map">Explore Map</a></nav>
        <div className="lp-footer-sources"><span>MAP DATA</span><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors <ArrowUpRight size={13} /></a><small>{updatedLabel(dataUpdatedAt)}</small></div>
      </div>
      <div className="lp-footer-bottom"><span>© {new Date().getFullYear()} RoadLens Nairobi</span><span>Road safety decisions start with good evidence.</span></div>
    </footer>
  </div>;
}
