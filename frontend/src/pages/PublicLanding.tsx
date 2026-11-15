import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowDown, ArrowRight, ArrowUpRight, BarChart3, Check, ChevronDown, Clock3, Crosshair, FileText, HeartPulse, Layers3, MapPin, Menu, Route, Shield, ShieldCheck, Siren, Users, X } from "lucide-react";
import { BrandMark } from "../components/Brand";
import { NairobiMap } from "../components/NairobiMap";
import { Badge } from "../components/ui";
import { roadlensApi } from "../api/client";
import { useRoadlensData } from "../hooks/useRoadlensData";
import { useAuth } from "../auth/AuthContext";

const capabilities = [
  { icon: BarChart3, title: "Accident trends", detail: "Understand how reported crashes change over time, by location, and across road users." },
  { icon: Crosshair, title: "Geospatial hotspots", detail: "Explore historical incident clusters and the places that need closer attention." },
  { icon: ShieldCheck, title: "Severity analysis", detail: "Review reported outcomes and compare analytical model performance." },
  { icon: Layers3, title: "Risk factors", detail: "See which conditions are associated with patterns in the available records." },
  { icon: Activity, title: "Predictive insights", detail: "Inspect model results with clear limits around what the available data supports." },
  { icon: Route, title: "Emergency response", detail: "Explore route and coverage recommendations from road-network analysis." },
];

const challenges = [
  { icon: AlertMark, number: "01", title: "Risk is unevenly distributed", detail: "A citywide total can hide the corridors and communities facing the greatest burden." },
  { icon: Users, number: "02", title: "People face different risks", detail: "Pedestrians, passengers, cyclists, and motorcyclists experience the road differently." },
  { icon: Clock3, number: "03", title: "Patterns are hard to see", detail: "Fragmented reports make trends, timing, and environmental factors difficult to compare." },
  { icon: Siren, number: "04", title: "Response time matters", detail: "Emergency teams need useful location and route information when every minute counts." },
];

const processSteps = [
  { number: "01", icon: FileText, title: "Bring evidence together", detail: "Accident reports, road networks, weather, and relevant contextual data." },
  { number: "02", icon: Layers3, title: "Apply data intelligence", detail: "Careful preprocessing, exploratory analysis, and geospatial methods." },
  { number: "03", icon: Crosshair, title: "Find where attention is needed", detail: "Historical hotspots, severity patterns, and factors associated with outcomes." },
  { number: "04", icon: ArrowUpRight, title: "Make findings useful", detail: "Clear visual evidence and response-planning insights for decision-makers." },
];

function AlertMark() { return <Shield size={20} strokeWidth={1.7} />; }

function SectionKicker({ children }: { children: string }) { return <div className="section-kicker"><span />{children}</div>; }

export function PublicLanding() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const { data: overview, meta: overviewMeta } = useRoadlensData(() => roadlensApi.overview("all"), []);
  const { data: hotspotData, meta: hotspotMeta } = useRoadlensData(() => roadlensApi.hotspots("all"), []);
  const previewPoints = hotspotData?.locations.slice(0, 4) ?? [];
  const accidentMetric = overview?.metrics.find((metric) => metric.label.toLowerCase().includes("accident")) ?? overview?.metrics[0];
  const fatalityMetric = overview?.metrics.find((metric) => metric.label.toLowerCase().includes("fatal"));
  const clusterMetric = hotspotData?.summary.find((metric) => metric.label.toLowerCase().includes("cluster")) ?? hotspotData?.summary[0];
  const dataLabel = overviewMeta?.mode === "live" ? "BACKEND DATA" : "SAMPLE RESPONSE";
  const navItems = [{ label: "About", href: "#about" }, { label: "Our approach", href: "#approach" }, { label: "Insights", href: "#insights" }, { label: "Emergency response", href: "#emergency" }, { label: "Contact", href: "#contact" }];

  const closeMenu = () => setMenuOpen(false);
  return <div className="public-page" id="home">
    <header className="public-header"><div className="public-header-inner"><Link className="brand brand-public" to="/" aria-label="RoadLens home" onClick={closeMenu}><BrandMark /><span><strong>RoadLens</strong><small>NAIROBI ROAD INTELLIGENCE</small></span></Link>
      <nav className={`public-nav ${menuOpen ? "public-nav-open" : ""}`} aria-label="Main navigation">{navItems.map((item) => <a href={item.href} key={item.href} onClick={closeMenu}>{item.label}</a>)}<Link className="nav-mobile-auth" to={user ? "/analytics" : "/login"} onClick={closeMenu}>{user ? "Open dashboard" : "Sign in"} <ArrowUpRight size={15} /></Link><Link className="nav-mobile-explore" to={user ? "/analytics" : "/register"} onClick={closeMenu}>{user ? "Continue to analytics" : "Create account"} <ArrowUpRight size={15} /></Link></nav>
      <div className="public-nav-actions"><Link className="public-signin-link" to={user ? "/analytics" : "/login"}>{user ? `Hi, ${user.name.split(" ")[0]}` : "Sign in"}</Link><Link className="public-analytics-button" to="/analytics">{user ? "Open dashboard" : "Explore analytics"} <ArrowUpRight size={15} /></Link><button className="mobile-nav-toggle" type="button" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((value) => !value)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
    </div></header>

    <main>
      <section className="hero-section">
        <div className="hero-backdrop" aria-hidden="true"><div className="hero-orbit orbit-a" /><div className="hero-orbit orbit-b" /><div className="hero-spark spark-a" /><div className="hero-spark spark-b" /></div>
        <div className="hero-inner">
          <motion.div className="hero-copy" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, ease: "easeOut" }}>
            <div className="hero-eyebrow"><span className="eyebrow-pill"><span /> NAIROBI, KENYA</span><span>ROAD SAFETY INTELLIGENCE</span></div>
            <h1>Making Nairobi’s roads safer <em>through data intelligence.</em></h1>
            <p className="hero-description">RoadLens transforms road accident data into actionable insights. Discover reported hotspots, understand patterns, and support faster emergency response with geospatial intelligence.</p>
            <div className="hero-actions"><Link className="button button-primary button-lg" to="/analytics">Explore road safety insights <ArrowRight size={16} /></Link><a className="button button-hero-quiet button-lg" href="#approach">Discover our approach <ArrowDown size={15} /></a></div>
            <div className="hero-social-proof"><div className="avatar-stack"><span>R</span><span>N</span><span>+</span></div><div><strong>Built for a safer Nairobi</strong><small>Research · public health · emergency response</small></div></div>
          </motion.div>
          <motion.div className="hero-visual" initial={{ opacity: 0, scale: .96, x: 12 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ duration: .8, delay: .12 }}>
            <div className="hero-map-shell"><div className="hero-map-top"><div><span className="map-live-dot" />NAIROBI ROAD NETWORK</div><span className="map-top-tag">LIVE VIEW <i>DEMO</i></span></div>
              <div className="hero-map-art">
                <svg viewBox="0 0 540 410" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Illustrative Nairobi road network with sample incident markers">
                  <defs><pattern id="hero-grid" width="27" height="27" patternUnits="userSpaceOnUse"><path d="M27 0H0V27" fill="none" stroke="#294057" strokeWidth=".7" /></pattern><radialGradient id="hero-glow"><stop stopColor="#1a6b58" stopOpacity=".4" /><stop offset="1" stopColor="#14273b" stopOpacity="0" /></radialGradient></defs>
                  <rect width="540" height="410" fill="#14273b" /><rect width="540" height="410" fill="url(#hero-grid)"/><ellipse cx="275" cy="204" rx="225" ry="175" fill="url(#hero-glow)" />
                  <g fill="none" stroke="#496277" strokeWidth="2" strokeLinecap="round">{["M-10 88C98 123 125 74 219 114S370 177 550 91", "M-20 179C82 207 145 159 231 205S386 267 570 180", "M-10 300C104 266 153 316 244 284S399 237 560 321", "M76 -10C126 99 87 157 140 240S184 337 126 430", "M236 -20C184 85 268 137 232 230S274 335 226 430", "M382 -30C322 83 405 151 364 235S398 348 353 435", "M506 -20C433 62 515 162 470 237S488 350 460 427", "M-20 355C86 303 139 215 243 182S390 120 570 38", "M24 30C110 114 131 143 237 246S391 326 525 395"].map((path) => <path key={path} d={path} />)}</g>
                  <g fill="none" stroke="#d7e1e8" strokeWidth=".8" strokeDasharray="1 5" opacity=".8"><path d="M-10 179C82 207 145 159 231 205S386 267 570 180" /><path d="M-10 300C104 266 153 316 244 284S399 237 560 321" /></g>
                  <g className="hero-map-labels"><text x="195" y="188">NAIROBI CBD</text><text x="85" y="115">WESTLANDS</text><text x="400" y="210">EASTLANDS</text><text x="320" y="344">INDUSTRIAL AREA</text><text x="400" y="87">THIKA ROAD</text></g>
                  <path d="M91 258C151 220 182 235 239 204S340 168 423 107" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="5 6" strokeLinecap="round" />
                  <g className="hero-marker marker-1"><circle cx="160" cy="221" r="15" /><circle cx="160" cy="221" r="4" /></g><g className="hero-marker marker-2"><circle cx="324" cy="168" r="12" /><circle cx="324" cy="168" r="3" /></g><g className="hero-marker marker-3"><circle cx="410" cy="273" r="11" /><circle cx="410" cy="273" r="3" /></g><g className="hero-route-pin" transform="translate(420 106)"><path d="M0 15s-12-10-12-17a12 12 0 1 1 24 0c0 7-12 17-12 17Z"/><circle cy="-2" r="3.5" /></g>
                </svg>
                <div className="map-coordinate coordinate-top">01°17′S&nbsp; 36°49′E</div><div className="map-coordinate coordinate-bottom">N 01°20′ <span>●</span> 36°48′ E</div>
              </div>
              <div className="hero-map-footer"><span><i className="legend-dot legend-red" />High sample cluster</span><span><i className="legend-dot legend-orange" />Moderate sample cluster</span><span><i className="legend-dot legend-green" />Lower sample cluster</span></div>
            </div>
            <div className="floating-insight"><div className="floating-insight-icon"><Activity size={16} /></div><div><span>ILLUSTRATIVE SAMPLE</span><strong>Historic cluster preview</strong><small>Not an official risk ranking</small></div><ArrowUpRight size={15} /></div>
            <div className="hero-accent-square" />
          </motion.div>
        </div>
        <a className="scroll-cue" href="#insights"><span>SCROLL TO EXPLORE</span><ChevronDown size={15} /></a>
      </section>

      <section className="proof-strip" aria-label="RoadLens principles"><div><span className="proof-icon"><ShieldCheck size={18} /></span><span><strong>Evidence first</strong><small>Transparent data and methods</small></span></div><div><span className="proof-icon"><MapPin size={18} /></span><span><strong>Built for Nairobi</strong><small>Local context, spatial insight</small></span></div><div><span className="proof-icon"><HeartPulse size={18} /></span><span><strong>People centered</strong><small>Safer journeys for everyone</small></span></div><div><span className="proof-icon"><Route size={18} /></span><span><strong>Made for action</strong><small>Insights with practical value</small></span></div></section>

      <section className="stats-section" id="insights"><div className="section-shell"><div className="stats-head"><div><SectionKicker>THE PICTURE IN CONTEXT</SectionKicker><h2>See the patterns behind<br />the <span>road safety challenge.</span></h2></div><div className={`demo-disclaimer ${overviewMeta?.mode === "live" ? "connected-disclaimer" : ""}`}><span className="demo-indicator" />{dataLabel} <span>·</span> {overviewMeta?.mode === "live" ? "CHECK SOURCE COVERAGE AND DEFINITIONS" : "VALUES ARE ILLUSTRATIVE, NOT VERIFIED FIGURES"}</div></div>
        <div className="landing-stats-grid">{[
          { value: accidentMetric?.value ?? "—", label: "Reported accident records", note: accidentMetric?.helper ?? "Not provided by the connected service", icon: FileText },
          { value: fatalityMetric?.value ?? "—", label: "Fatality reports", note: fatalityMetric?.helper ?? "Not provided by the connected service", icon: AlertMark },
          { value: overview?.roadUserDistribution.length ?? "—", label: "Road-user groups", note: overviewMeta?.mode === "demo" ? "Categories in sample response" : "Categories returned by backend", icon: Users },
          { value: clusterMetric?.value ?? "—", label: "Detected historical clusters", note: clusterMetric?.helper ?? (hotspotMeta?.mode === "demo" ? "Illustrative DBSCAN output" : "Backend hotspot response"), icon: Crosshair },
        ].map(({ value, label, note, icon: Icon }) => <div className="landing-stat" key={label}><div className="stat-icon"><Icon size={17} /></div><strong>{value}</strong><span>{label}</span><small>{note}</small></div>)}</div>
        <div className="stats-source"><span><span className="source-mark">i</span> {overviewMeta?.mode === "live" ? "Figures are returned by the connected service. See source metadata and coverage before interpretation." : "Sample values are generated examples, not official Nairobi road safety statistics."}</span><Link to="/analytics" className="stats-explore-link">Explore analytics <ArrowUpRight size={13} /></Link></div>
      </div></section>

      <section className="challenge-section" id="about"><div className="section-shell challenge-layout"><div className="section-intro"><SectionKicker>WHY ROADLENS</SectionKicker><h2>Understanding the<br /><span>road safety challenge.</span></h2><p>Good decisions start with a clearer picture. RoadLens helps turn scattered records into a view of where attention, research, and response may be needed.</p><Link to="/analytics/accidents" className="inline-link">See what the data can reveal <ArrowRight size={15} /></Link><div className="challenge-photo-illustration"><div className="night-road"><span /><span /><span /></div><div className="illustration-caption"><span>01</span><div><strong>One city. Many journeys.</strong><small>A systems view of road safety</small></div></div></div></div>
        <div className="challenge-cards">{challenges.map(({ icon: Icon, number, title, detail }) => <article className="challenge-card" key={number}><div className="challenge-card-top"><span>{number}</span><Icon size={19} /></div><h3>{title}</h3><p>{detail}</p><div className="challenge-card-line" /></article>)}</div></div></section>

      <section className="approach-section" id="approach"><div className="section-shell"><div className="centered-heading"><SectionKicker>FROM DATA TO DECISIONS</SectionKicker><h2>How RoadLens <span>works.</span></h2><p>A transparent process keeps the evidence, analytical methods, and decisions connected.</p></div>
        <div className="process-grid">{processSteps.map(({ number, icon: Icon, title, detail }, index) => <article className="process-step" key={number}><div className="process-step-top"><span className="process-number">{number}</span><span className="process-icon"><Icon size={19} /></span>{index < processSteps.length - 1 && <span className="process-connector" />}</div><h3>{title}</h3><p>{detail}</p></article>)}</div>
        <div className="approach-note"><ShieldCheck size={17} /><span>Methods reveal patterns and associations. They do not, on their own, prove cause or establish a future crash probability.</span></div>
      </div></section>

      <section className="capabilities-section"><div className="section-shell"><div className="capabilities-heading"><div><SectionKicker>ONE PLATFORM · MULTIPLE LENSES</SectionKicker><h2>Clarity for the <span>road ahead.</span></h2></div><p>Explore a connected set of tools built around the questions that matter to road safety teams and communities.</p></div><div className="capability-grid">{capabilities.map(({ icon: Icon, title, detail }, index) => <Link className="capability-card" key={title} to={index === 5 ? "/analytics/emergency" : index === 1 ? "/analytics/hotspots" : index === 2 ? "/analytics/severity" : index === 3 ? "/analytics/risk-factors" : index === 4 ? "/analytics/predictions" : "/analytics/accidents"}><span className="capability-icon"><Icon size={18} /></span><span className="capability-title">{title}</span><span className="capability-detail">{detail}</span><span className="capability-link">Explore capability <ArrowUpRight size={14} /></span></Link>)}</div></div></section>

      <section className="hotspot-section"><div className="section-shell hotspot-layout"><div className="hotspot-copy"><SectionKicker>GEOSPATIAL INTELLIGENCE</SectionKicker><h2>Every location has<br />a <span>story to tell.</span></h2><p>Explore a citywide picture of historical accident clusters and reported locations. Zoom into the places where a closer look can make a difference.</p><div className="hotspot-callout"><span className="hotspot-callout-icon"><MapPin size={17} /></span><span><strong>Historical concentration ≠ future prediction</strong><small>Clusters describe sample reports, not official risk levels.</small></span></div><Link to="/analytics/hotspots" className="button button-primary">Explore the Nairobi accident map <ArrowRight size={15} /></Link><div className="map-source-note"><span className="source-mark">i</span>{hotspotMeta?.mode === "live" ? "Backend hotspot results · schematic coordinate view" : "Illustrative sample locations · no official basemap or verified hotspot data"}</div></div><div className="hotspot-map-wrap"><div className="hotspot-map-heading"><div><span className="map-status-dot" />NAIROBI · LOCATION PREVIEW</div><Badge className="map-demo-badge">{hotspotMeta?.mode === "live" ? "BACKEND" : "DEMO"}</Badge></div><NairobiMap points={previewPoints} preview sourceLabel={hotspotMeta?.mode === "live" ? "BACKEND HOTSPOT RESULTS" : "DEMO SAMPLE LOCATIONS"} /><div className="hotspot-map-legend"><span><i className="legend-dot legend-red" />Higher sample count</span><span><i className="legend-dot legend-orange" />Mid-range sample count</span><span><i className="legend-dot legend-green" />Lower sample count</span></div></div></div></section>

      <section className="emergency-section" id="emergency"><div className="section-shell emergency-layout"><div className="emergency-copy"><SectionKicker>EMERGENCY RESPONSE</SectionKicker><h2>Every minute matters.<br /><span>Find smarter routes.</span></h2><p>RoadLens explores how road network data and route optimization can support emergency response planning, connect facilities with demand, and highlight potential coverage gaps.</p><ul><li><Check size={15} />Compare route options from available network data</li><li><Check size={15} />Explore Dijkstra and A* routing outputs</li><li><Check size={15} />Review facility coverage and model-generated suggestions</li></ul><Link to="/analytics/emergency" className="button button-light">Explore emergency response <ArrowRight size={15} /></Link><small className="emergency-disclaimer">Model suggestions are not dispatch instructions. Route performance depends on backend road and traffic data.</small></div>
        <div className="route-visual"><div className="route-visual-map"><NairobiMap points={previewPoints.slice(0, 3)} preview /><div className="route-dash route-dash-one" /><div className="route-dash route-dash-two"/><div className="route-stop stop-start"><MapPin size={16} /></div><div className="route-stop stop-end"><Siren size={16} /></div></div><div className="route-detail-float"><div className="route-detail-symbol"><Route size={16} /></div><div><small>DEMO ROUTE RESPONSE</small><strong>5.8 km <span>·</span> 14 min</strong></div><Badge className="route-algorithm-badge">A*</Badge></div></div></div></section>

      <section className="cta-section" id="contact"><div className="cta-shell"><div className="cta-pattern" aria-hidden="true"><span /><span /><span /><span /><span /></div><SectionKicker>ROADLENS · NAIROBI</SectionKicker><h2>Explore the data.<br /><span>Understand the risk.</span></h2><p>See how a connected view of road safety can support better questions, stronger evidence, and safer journeys.</p><div className="cta-actions"><Link to="/analytics" className="button button-white button-lg">Explore RoadLens analytics <ArrowRight size={16} /></Link><Link to="/analytics/reports" className="button button-cta-quiet button-lg">Community reporting <ArrowUpRight size={15} /></Link></div><div className="cta-footnote"><span /> DEMO MODE <span>·</span> Analysis data is illustrative until a backend is connected</div></div></section>
    </main>

    <footer className="public-footer">
      <div className="section-shell footer-simple">
        <div className="footer-simple-brand">
          <Link className="brand brand-public" to="/" aria-label="RoadLens home"><BrandMark /><span><strong>RoadLens</strong><small>NAIROBI ROAD INTELLIGENCE</small></span></Link>
          <p>Turning road safety data into a clearer path forward for Nairobi.</p>
        </div>
        <div className="footer-simple-meta">
          <span>© 2026 RoadLens · Nairobi Road Safety Intelligence</span>
          <span>For research and decision support <i /> Not official guidance</span>
        </div>
      </div>
    </footer>
  </div>;
}
