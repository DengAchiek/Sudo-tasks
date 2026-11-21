import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronRight, CircleHelp, Clock3, Info, MapPin, RefreshCw, Route, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { isDemoMode, roadlensApi } from "../api/client";
import { useRoadlensData } from "../hooks/useRoadlensData";
import type { AnalyticsContext } from "../layouts/AnalyticsLayout";
import { useAuth } from "../auth/AuthContext";
import { NairobiMap } from "../components/NairobiMap";
import { Badge, Button, Card, DataState, PanelHeading } from "../components/ui";
import type { AnalysisData, CommunityReportInput, Hotspot, Metric, ModelMetric, Period, RiskLevel } from "../types/analytics";

const COLORS = ["#dc2626", "#f59e0b", "#2563eb", "#16a34a", "#8b5cf6", "#64748b"];

interface DetailEntry { label: string; value: string }
interface AnalyticsDetail { title: string; description: string; entries: DetailEntry[]; note: string }

function InteractiveAnalyticsCard({ className = "", label, onOpen, children }: { className?: string; label: string; onOpen: () => void; children: ReactNode }) {
  function handleClick(event: MouseEvent<HTMLElement>) {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("a,button,input,select,textarea,[role='button'],[role='link'],.overview-map,.map-filter-row")) return;
    onOpen();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpen();
  }

  return <Card className={`analytics-detail-card ${className}`} role="group" tabIndex={0} aria-label={`${label}. Press Enter for details.`} aria-haspopup="dialog" title="Click or press Enter to view details" onClick={handleClick} onKeyDown={handleKeyDown}>
    {children}
  </Card>;
}

function AnalyticsDetailPopup({ detail, closeRef, onClose }: { detail: AnalyticsDetail; closeRef: RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  return <div className="analytics-detail-backdrop" role="presentation" onClick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section className="analytics-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="analytics-detail-title" aria-describedby="analytics-detail-description" onClick={(event) => event.stopPropagation()}>
      <div className="analytics-detail-dialog-top"><span>ROADLENS · DASHBOARD DETAILS</span><button ref={closeRef} type="button" className="analytics-detail-close" aria-label="Close details" onClick={onClose}><X size={16} /></button></div>
      <h2 id="analytics-detail-title">{detail.title}</h2>
      <p id="analytics-detail-description">{detail.description}</p>
      <dl className="analytics-detail-values">{detail.entries.map((entry) => <div key={`${entry.label}-${entry.value}`}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>
      <div className="analytics-detail-note">{detail.note}</div>
    </section>
  </div>;
}

function PageTitle({ eyebrow, title, detail, action }: { eyebrow: string; title: string; detail: string; action?: ReactNode }) {
  return <div className="page-title-row">
    <div>
      <div className="page-eyebrow"><span />{eyebrow}</div>
      <h1>{title}</h1><p>{detail}</p></div>{action}</div>;
}

function DemoNote({ mode, updatedAt }: { mode?: "demo" | "live"; updatedAt?: string }) {
  return <div className={`data-mode-note ${mode === "live" ? "mode-live" : ""}`}>
    <Info size={14} />
    <span>{mode === "live" ? "Connected data · confirm coverage before action." : "Illustrative sample · not official statistics."}</span>{updatedAt && <small className="mode-timestamp">UPDATED · {updatedAt}</small>}</div>;
}

function summarizeAnalysis(data: AnalysisData) {
  const yearly = data.annualTrend.filter((point) => Number.isFinite(point.accidents));
  const total = yearly.reduce((sum, point) => sum + point.accidents, 0);
  const firstYear = yearly[0]?.label;
  const lastYear = yearly.at(-1)?.label;
  const weekend = data.weekdayDistribution.filter((point) => /^(sat|sun)/i.test(point.name));
  const weekTotal = data.weekdayDistribution.reduce((sum, point) => sum + point.value, 0);
  const weekendTotal = weekend.reduce((sum, point) => sum + point.value, 0);
  const peak = data.hourlyDistribution.reduce<(typeof data.hourlyDistribution)[number] | null>(
    (current, point) => current === null || point.accidents > current.accidents ? point : current,
    null,
  );
  const hourMatch = peak?.label.trim().match(/^([01]?\d|2[0-3])(?::[0-5]\d)?$/);
  const peakWindow = hourMatch
    ? `${hourMatch[1].padStart(2, "0")}:00–${String((Number(hourMatch[1]) + 2) % 24).padStart(2, "0")}:00`
    : peak?.label ?? "—";

  return {
    reportingWindow: firstYear && lastYear ? firstYear === lastYear ? firstYear : `${firstYear} — ${lastYear}` : "—",
    totalRecords: yearly.length ? total.toLocaleString() : "—",
    peakWindow,
    weekendShare: weekend.length && weekTotal > 0 ? `${Math.round((weekendTotal / weekTotal) * 100)}%` : "—",
  };
}

function clusterLevelLabel(level: RiskLevel) {
  return level === "high" ? "Higher sample count" : level === "moderate" ? "Mid-range sample count" : "Lower sample count";
}

function readerFriendlyMetricLabel(label: string) {
  if (/^detected clusters$/iu.test(label)) return "Nearby report groups";
  if (/^highest cluster count$/iu.test(label)) return "Most reports in one area";
  if (/^clusters with fatal reports$/iu.test(label)) return "Areas with fatal crashes";
  if (/^detected hotspots$/iu.test(label)) return "Possible hotspots";
  return label;
}

function readerFriendlyMetricHelper(helper?: string) {
  if (!helper) return "";
  return helper
    .replace(/illustrative DBSCAN output/giu, "Sample groups of nearby reports")
    .replace(/DBSCAN clusters?/giu, "nearby report groups")
    .replace(/demo records/giu, "sample records")
    .replace(/sample cluster/giu, "sample area");
}

function MetricTile({ label, value, unit, change, helper, index, onOpen }: { label: string; value: string | number; unit?: string; change?: number | null; helper?: string; index: number; onOpen?: () => void }) {
  const good = typeof change === "number" && change < 0;
  const plainHelper = readerFriendlyMetricHelper(helper);
  const contents = <>
    <div className="metric-tile-label">{readerFriendlyMetricLabel(label)}
      <span className="metric-index">0{index + 1}</span></div>
      <div className="metric-main-value">{value}
        <small>{unit}</small></div>
        <div className="metric-tile-foot">{typeof change === "number" ?
          <span className={`metric-change ${good ? "change-good" : "change-warn"}`}>{change < 0 ? <ArrowDownRight size={13} /> : <ArrowUpRight size={13} />}{Math.abs(change).toFixed(1)}%
          <span>vs. previous period</span></span> : null}
          {plainHelper && <span className="metric-helper">{plainHelper}</span>}</div>
  </>;
  return onOpen
    ? <InteractiveAnalyticsCard className={`metric-tile metric-tile-${index}`} label={`${readerFriendlyMetricLabel(label)}: ${value}${unit ? ` ${unit}` : ""}`} onOpen={onOpen}>{contents}</InteractiveAnalyticsCard>
    : <Card className={`metric-tile metric-tile-${index}`}>{contents}</Card>;
}

function MapInsightWindow({ point, demo, link = false }: { point: Hotspot | null; demo: boolean; link?: boolean }) {
  return <aside className="map-insight-window" aria-label="Map location window" aria-live="polite">
    <div className="map-window-heading">
      <span className="map-window-icon"><MapPin size={15} /></span>
      <span><strong>Map details</strong><small>{demo ? "SAMPLE LOCATION" : "LOCATION INSIGHT"}</small></span>
      <span className="map-window-live"><i />OPEN</span>
    </div>
    {point ? <>
      <div className="map-window-title-row"><h3>{point.name}</h3><Badge className={`risk-badge risk-badge-${point.level}`}>{clusterLevelLabel(point.level)}</Badge></div>
      <p className="map-window-summary">{point.summary || "Crash reports grouped near this location."}</p>
      <div className="map-window-stats">
        <div><strong>{point.incidents.toLocaleString()}</strong><span>REPORTS</span></div>
        <div><strong>{point.fatalities.toLocaleString()}</strong><span>FATALITY REPORTS</span></div>
        <div><strong>{point.mainRoadUser}</strong><span>LARGEST ROAD-USER GROUP</span></div>
      </div>
      {link && <Link to="/analytics/hotspots" className="map-window-link">View all locations <ArrowRight size={13} /></Link>}
    </> : <div className="map-window-empty"><strong>No location in view</strong><span>Adjust the filters to show crash report locations.</span></div>}
  </aside>;
}

function ModelScoreTable({ models }: { models: ModelMetric[] }) {
  return <div className="table-scroll"><table className="data-table model-score-table">
    <caption className="visually-hidden">Approaches compared with recorded crash outcomes. Hover over or focus a column title for its meaning.</caption>
    <thead><tr>
      <th scope="col">Approach</th>
      <th scope="col"><abbr title="How often the estimate matched the recorded outcome." tabIndex={0}>Overall match</abbr></th>
      <th scope="col"><abbr title="When the result marked a case, how often that estimate was right." tabIndex={0}>Warnings right</abbr></th>
      <th scope="col"><abbr title="How many recorded cases the result correctly identified." tabIndex={0}>Cases found</abbr></th>
      <th scope="col"><abbr title="A combined score that balances right warnings and cases found." tabIndex={0}>Overall balance</abbr></th>
      <th scope="col"><abbr title="How well it tells different outcomes apart, on a scale of 0 to 100." tabIndex={0}>Outcome separation</abbr></th>
    </tr></thead>
    <tbody>{models.map((model, index) => <tr key={model.model}>
      <td><strong>Approach {index + 1}</strong></td>
      <td>{(model.accuracy * 100).toFixed(1)}%</td>
      <td>{(model.precision * 100).toFixed(1)}%</td>
      <td>{(model.recall * 100).toFixed(1)}%</td>
      <td>{(model.f1 * 100).toFixed(1)}%</td>
      <td>{model.auc == null ? "—" : `${Math.round(model.auc * 100)} / 100`}</td>
    </tr>)}</tbody>
  </table></div>;
}

export function OverviewPage() {
  const { period, search } = useOutletContext<AnalyticsContext>();
  const { data, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.overview(period, isDemoMode ? undefined : search, signal), [period, search]);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all");
  const [roadUserFilter, setRoadUserFilter] = useState("all");
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [detail, setDetail] = useState<AnalyticsDetail | null>(null);
  const detailCloseRef = useRef<HTMLButtonElement | null>(null);
  const visiblePoints = useMemo(() => (data?.hotspots ?? []).filter((point) => (riskFilter === "all" || point.level === riskFilter) && (roadUserFilter === "all" || point.mainRoadUser === roadUserFilter) && (!search.trim() || `${point.name} ${point.mainRoadUser}`.toLowerCase().includes(search.trim().toLowerCase()))), [data, riskFilter, roadUserFilter, search]);
  const visibleSelected = visiblePoints.find((point) => point.id === selected?.id) ?? null;
  const mapPoint = visibleSelected ?? visiblePoints[0] ?? null;
  const reviewMetric = data?.metrics
    .filter((metric) => typeof metric.change === "number" && Number.isFinite(metric.change) && metric.change !== 0)
    .sort((left, right) => Math.abs(right.change ?? 0) - Math.abs(left.change ?? 0))[0];
  const reviewPoint = data?.hotspots.reduce<Hotspot | null>((largest, point) => !largest || point.incidents > largest.incidents ? point : largest, null) ?? null;
  const alertKey = reviewMetric ? `${reviewMetric.label}:${reviewMetric.change}` : reviewPoint?.id ?? "";
  const [dismissedAlert, setDismissedAlert] = useState("");
  const periodLabel = meta?.mode === "demo" ? "sample snapshot" : ({ "30d": "last 30 days", "90d": "last 90 days", "12m": "last 12 months", all: "all available data" } satisfies Record<Period, string>)[period];
  const showDetail = (item: AnalyticsDetail) => setDetail({
    ...item,
    entries: [{ label: "Reporting period", value: periodLabel }, ...item.entries],
  });

  useEffect(() => {
    if (!detail) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleDialogKeys = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setDetail(null);
      } else if (event.key === "Tab") {
        event.preventDefault();
        detailCloseRef.current?.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleDialogKeys);
    detailCloseRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeys);
      previousFocus?.focus();
    };
  }, [detail]);

  const openMetricDetail = (metric: Metric) => {
    const friendlyLabel = readerFriendlyMetricLabel(metric.label);
    const metricValue = `${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`;
    showDetail({
      title: friendlyLabel,
      description: `A summary indicator for ${friendlyLabel.toLowerCase()} in the current RoadLens overview.`,
      entries: [
        { label: "Current value", value: metricValue },
        ...(typeof metric.change === "number" ? [{ label: "Change from previous period", value: `${metric.change > 0 ? "+" : ""}${metric.change.toFixed(1)}%` }] : []),
        ...(readerFriendlyMetricHelper(metric.helper) ? [{ label: "How to read it", value: readerFriendlyMetricHelper(metric.helper) }] : []),
      ],
      note: meta?.mode === "demo" ? "This is illustrative sample information, not an official statistic." : "This indicator reflects the data returned by the connected analytics service.",
    });
  };
  return <>
    <PageTitle eyebrow="ROAD SAFETY · OPERATIONS" title="Decision overview" detail={`Crashes · severity · locations · ${periodLabel}.`} action={<Button variant="secondary" icon={<RefreshCw size={14} />} onClick={reload}>Refresh</Button>} />
    <DataState loading={loading} error={error} retry={reload} title="No overview data available" detail="The analytics service has not returned overview results yet.">
      {data && <>
        <DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} />
        {alertKey && alertKey !== dismissedAlert && <section className={`decision-alert ${reviewMetric && reviewMetric.change! < 0 ? "decision-alert-down" : ""}`} role="status" aria-live="polite" aria-label="Dashboard recommendation. Press Enter for details." tabIndex={0} onClick={(event) => {
          const target = event.target instanceof HTMLElement ? event.target : null;
          if (target?.closest("a,button")) return;
          showDetail({
            title: reviewMetric ? `${readerFriendlyMetricLabel(reviewMetric.label)} ${reviewMetric.change! > 0 ? "increased" : "decreased"}` : "Location to validate",
            description: "A dashboard signal selected for review based on the largest available change or busiest returned location.",
            entries: reviewMetric ? [
              { label: "Change from previous period", value: `${reviewMetric.change! > 0 ? "+" : "−"}${Math.abs(reviewMetric.change!).toFixed(1)}%` },
              { label: "Current value", value: `${reviewMetric.value}${reviewMetric.unit ? ` ${reviewMetric.unit}` : ""}` },
              { label: "Reporting period", value: periodLabel },
            ] : reviewPoint ? [
              { label: "Location", value: reviewPoint.name },
              { label: "Crash reports", value: reviewPoint.incidents.toLocaleString() },
              { label: "Location group", value: clusterLevelLabel(reviewPoint.level) },
            ] : [],
            note: reviewMetric ? reviewMetric.change! > 0 ? "Check location and reporting coverage before shifting teams." : "Verify coverage and severity before calling this an improvement." : "Validate location and traffic information before making operating decisions.",
          });
        }} onKeyDown={(event) => {
          if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          const target = event.currentTarget;
          target.click();
        }}>
          <span className="decision-alert-icon"><TriangleAlert size={17} /></span>
          <div className="decision-alert-main">
            <span className="decision-alert-kicker">{meta?.mode === "demo" ? "SAMPLE SIGNAL" : "MOVEMENT TO REVIEW"}</span>
            <strong>{reviewMetric ? `${reviewMetric.label} ${reviewMetric.change! > 0 ? "increased" : "decreased"}` : "Location to validate"}</strong>
            <small>{reviewMetric ? `${reviewMetric.change! > 0 ? "+" : "−"}${Math.abs(reviewMetric.change!).toFixed(1)}% vs previous period` : reviewPoint ? `${reviewPoint.name} · ${reviewPoint.incidents.toLocaleString()} reports in the busiest returned area` : "No movement data returned"}</small>
          </div>
          <p>{reviewMetric ? reviewMetric.change! > 0 ? "Check location and reporting coverage before shifting teams." : "Verify coverage and severity before calling this an improvement." : "Check the location and traffic volume before assigning resources."}</p>
          <Link to="/analytics/hotspots">Review locations <ArrowRight size={13} /></Link>
          <button type="button" className="decision-alert-dismiss" aria-label="Dismiss recommendation" onClick={() => setDismissedAlert(alertKey)}><X size={15} /></button>
        </section>}
        <div className="metric-grid">{data.metrics.map((metric, index) => <MetricTile key={metric.label} {...metric} index={index} onOpen={() => openMetricDetail(metric)} />)}</div>
        <div className="overview-grid overview-grid-top">
          <InteractiveAnalyticsCard className="chart-panel trend-panel-large" label="Accidents over time chart" onOpen={() => {
            const total = data.monthlyTrend.reduce((sum, point) => sum + point.accidents, 0);
            const peak = data.monthlyTrend.reduce<(typeof data.monthlyTrend)[number] | null>((current, point) => !current || point.accidents > current.accidents ? point : current, null);
            showDetail({
              title: "Accidents over time",
              description: "Monthly accident-record totals returned by the service for the selected reporting period.",
              entries: [
                { label: "Reported records", value: total.toLocaleString() },
                { label: "Months shown", value: data.monthlyTrend.length.toLocaleString() },
                { label: "First month", value: data.monthlyTrend[0]?.label ?? "—" },
                { label: "Most reports", value: peak ? `${peak.label} · ${peak.accidents.toLocaleString()}` : "No monthly records" },
              ],
              note: meta?.mode === "demo" ? "This chart uses illustrative sample data, not official statistics." : "These are reported records returned by the connected service; coverage can vary by place and time.",
            });
          }}>
            <PanelHeading title="Accidents over time" detail="Monthly records" action={<span className="chart-period-label">{data.monthlyTrend.length ? `${data.monthlyTrend[0].label} — ${data.monthlyTrend.at(-1)?.label}` : "NO TREND DATA"}
              <span>·</span> {meta?.mode === "demo" ? "SAMPLE" : "SERVICE"}</span>} />
            <div className="chart-area chart-tall">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart accessibilityLayer data={data.monthlyTrend} onClick={(chartState, event) => {
                  if (typeof chartState.activeTooltipIndex !== "number") return;
                  const point = data.monthlyTrend[chartState.activeTooltipIndex];
                  if (!point) return;
                  event.stopPropagation();
                  showDetail({
                    title: point.label,
                    description: "Accident records for this month in the selected overview period.",
                    entries: [
                      { label: "Accident records", value: point.accidents.toLocaleString() },
                      { label: "Fatality reports", value: (point.fatalities ?? 0).toLocaleString() },
                      { label: "Injury reports", value: (point.injuries ?? 0).toLocaleString() },
                    ],
                    note: meta?.mode === "demo" ? "Monthly values are illustrative sample data." : "Monthly values reflect records returned by the connected service.",
                  });
                }} margin={{ top: 15, right: 16, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={.14} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="#edf1f5" vertical={false} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 11 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 11 }} />
                  <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 12, boxShadow: "0 8px 30px #172b4212" }} />
                  <Area type="monotone" dataKey="accidents" name="Reported accidents" stroke="#2563eb" strokeWidth={2.3} fill="url(#trendFill)" activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-legend">
              <span>
                <i className="legend-line legend-blue" />Reported accident records</span>
                <span>{meta?.mode === "demo" ? "Source: sample API response" : "Source: connected service"}</span>
                </div>
          </InteractiveAnalyticsCard>

          <InteractiveAnalyticsCard className="chart-panel weekday-panel" label="Accidents by day chart" onOpen={() => {
            const total = data.weekdayDistribution.reduce((sum, point) => sum + point.value, 0);
            const peak = data.weekdayDistribution.reduce<(typeof data.weekdayDistribution)[number] | null>((current, point) => !current || point.value > current.value ? point : current, null);
            const weekendTotal = data.weekdayDistribution.filter((point) => /^(sat|sun)/i.test(point.name)).reduce((sum, point) => sum + point.value, 0);
            showDetail({
              title: "Accidents by day",
              description: "Reported records grouped by weekday across the selected reporting period.",
              entries: [
                { label: "Records represented", value: total.toLocaleString() },
                { label: "Highest day", value: peak ? `${peak.name} · ${peak.value.toLocaleString()}` : "No weekday records" },
                { label: "Weekend records", value: weekendTotal.toLocaleString() },
              ],
              note: "The day-of-week grouping shows when records occurred. It does not account for differences in traffic volume.",
            });
          }}>
            <PanelHeading title="Accidents by day" detail="Reported records across the week" action={<span className="panel-icon">
              <Clock3 size={16} /></span>} />
              <div className="chart-area chart-medium">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart accessibilityLayer data={data.weekdayDistribution} onClick={(chartState, event) => {
                    if (typeof chartState.activeTooltipIndex !== "number") return;
                    const point = data.weekdayDistribution[chartState.activeTooltipIndex];
                    if (!point) return;
                    event.stopPropagation();
                    showDetail({
                      title: point.name,
                      description: "Reported records grouped under this day of the week.",
                      entries: [{ label: "Accident records", value: point.value.toLocaleString() }],
                      note: "These are historical counts, not a measure of crash risk per trip or per road user.",
                    });
                  }} margin={{ top: 10, right: 8, left: -23, bottom: 0 }}>
                    <CartesianGrid stroke="#edf1f5" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} dy={8} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} />
                    <Tooltip contentStyle={{ border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 12 }} />
                    <Bar dataKey="value" name="Accidents" fill="#89a9dd" radius={[4, 4, 0, 0]} maxBarSize={26} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
          </InteractiveAnalyticsCard>
        </div>

        <div className="overview-grid overview-grid-bottom">
          <InteractiveAnalyticsCard className="chart-panel map-panel-analytics" label="Past crash locations map" onOpen={() => showDetail({
            title: "Past crash locations",
            description: "Crash report groups currently displayed on the map using your selected filters.",
            entries: [
              { label: "Locations shown", value: visiblePoints.length.toLocaleString() },
              { label: "Report count filter", value: riskFilter === "all" ? "All groups" : clusterLevelLabel(riskFilter) },
              { label: "Road-user filter", value: roadUserFilter === "all" ? "All groups" : roadUserFilter },
              ...(mapPoint ? [{ label: "Selected location", value: mapPoint.name }, { label: "Reports at selected location", value: mapPoint.incidents.toLocaleString() }] : []),
            ],
            note: "Map markers can be selected directly to open location details. The filters only change which returned groups are visible.",
          })}>
            <PanelHeading title="Past crash locations" detail="Select a location for details" action={<Link className="button button-ghost button-sm" to="/analytics/hotspots">Open map
            <ArrowRight size={13} /></Link>} />
            <div className="map-filter-row">
              <label>
                  <span>REPORT COUNT</span>
                <select value={riskFilter} onChange={(event) => { setRiskFilter(event.target.value as RiskLevel | "all"); setSelected(null); }}>
                  <option value="all">All groups</option>
                  <option value="high">High</option>
                  <option value="moderate">Mid</option>
                  <option value="lower">Low</option>
                </select>
              </label>
              <label>
                <span>ROAD USER</span>
                <select value={roadUserFilter} onChange={(event) => { setRoadUserFilter(event.target.value); setSelected(null); }}>
                  <option value="all">All groups</option>{Array.from(new Set(data.hotspots.map((point) => point.mainRoadUser))).map((user) => <option key={user}>{user}</option>)}
                </select>
              </label>
            </div>
            <div className="overview-map">
              <NairobiMap points={visiblePoints} onSelect={setSelected} selectedId={mapPoint?.id} compact sourceLabel={meta?.mode === "demo" ? "DEMO SAMPLE LOCATIONS" : "BACKEND LOCATIONS"} />{visiblePoints.length === 0 &&
              <div className="map-results-empty" role="status">No map locations match these filters.</div>}
              <MapInsightWindow point={mapPoint} demo={meta?.mode === "demo"} link />
              </div>
              <div className="map-panel-footer">
                <div className="risk-legend">
                  <span>
                    <i className="risk-dot risk-high" />High count</span>
                    <span>
                      <i className="risk-dot risk-moderate" />Mid</span>
                      <span>
                        <i className="risk-dot risk-lower" />Low</span></div>{visibleSelected &&
                        <div className="selected-map-point"><MapPin size={13} />
                        <strong>{visibleSelected.name}</strong>
                        <span>{visibleSelected.incidents.toLocaleString()} records</span>
                        </div>}
                      </div>
            </InteractiveAnalyticsCard>
          <div className="overview-side-charts">
            <InteractiveAnalyticsCard className="chart-panel severity-panel" label="Reported severity breakdown" onOpen={() => {
              const total = data.severityDistribution.reduce((sum, item) => sum + item.value, 0);
              const largest = data.severityDistribution.reduce<(typeof data.severityDistribution)[number] | null>((current, item) => !current || item.value > current.value ? item : current, null);
              showDetail({
                title: "Reported severity",
                description: "Crash report counts grouped by the severity categories returned by the service.",
                entries: [
                  { label: "Records represented", value: total.toLocaleString() },
                  { label: "Largest category", value: largest ? `${largest.name} · ${largest.value.toLocaleString()}` : "No severity data" },
                  ...data.severityDistribution.map((item) => ({ label: item.name, value: item.value.toLocaleString() })),
                ],
                note: meta?.mode === "demo" ? "Severity counts are illustrative sample data." : "Severity labels and counts reflect the records returned by the connected service.",
              });
            }}>
              <PanelHeading title="Reported severity" detail={meta?.mode === "demo" ? "Sample response breakdown" : "Connected service breakdown"} />
              <div className="severity-chart-row">
              <div className="severity-donut">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart accessibilityLayer onClick={(chartState, event) => {
                    if (typeof chartState.activeTooltipIndex !== "number") return;
                    const item = data.severityDistribution[chartState.activeTooltipIndex];
                    if (!item) return;
                    event.stopPropagation();
                    const total = data.severityDistribution.reduce((sum, category) => sum + category.value, 0);
                    showDetail({
                      title: item.name,
                      description: "Crash reports in this severity category.",
                      entries: [
                        { label: "Records", value: item.value.toLocaleString() },
                        { label: "Share of displayed records", value: `${total ? Math.round(item.value / total * 1000) / 10 : 0}%` },
                      ],
                      note: "A report count describes records in this response. It is not a forecast or a measure of risk per trip.",
                    });
                  }}>
                    <Pie data={data.severityDistribution} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="92%" paddingAngle={3} stroke="none">{data.severityDistribution.map((item, index) => <Cell key={item.name} fill={item.color ?? COLORS[index % COLORS.length]} />)}</Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /></PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{data.severityDistribution.reduce((sum, item) => sum + item.value, 0).toLocaleString()}</strong>
                  <span>{meta?.mode === "demo" ? "SAMPLE" : "TOTAL"}</span>
                </div>
              </div>

              <div className="severity-legend">{data.severityDistribution.map((item, index) =>
                <button type="button" key={item.name} onClick={(event) => { event.stopPropagation();
                  const total = data.severityDistribution.reduce((sum, category) => sum + category.value, 0);
                  showDetail({
                    title: item.name,
                    description: "Crash reports in this severity category.",
                    entries: [
                      { label: "Records", value: item.value.toLocaleString() },
                      { label: "Share of displayed records", value: `${total ? Math.round(item.value / total * 1000) / 10 : 0}%` },
                    ],
                    note: "A report count describes records in this response. It is not a forecast or a measure of risk per trip.",
                  });
                }}>
                  <i style={{ backgroundColor: item.color ?? COLORS[index % COLORS.length] }} />
                  <span>{item.name}</span>
                  <strong>{item.value.toLocaleString()}</strong>
                </button>)}
              </div>
              </div>
            </InteractiveAnalyticsCard>

            <InteractiveAnalyticsCard className="chart-panel user-panel" label="Road users represented chart" onOpen={() => {
              const total = data.roadUserDistribution.reduce((sum, item) => sum + item.value, 0);
              const largest = data.roadUserDistribution.reduce<(typeof data.roadUserDistribution)[number] | null>((current, item) => !current || item.value > current.value ? item : current, null);
              showDetail({
                title: "Road users represented",
                description: "Crash records grouped by the road-user category in the returned data.",
                entries: [
                  { label: "Records represented", value: total.toLocaleString() },
                  { label: "Largest group", value: largest ? `${largest.name} · ${largest.value.toLocaleString()}` : "No road-user data" },
                  ...data.roadUserDistribution.map((item) => ({ label: item.name, value: item.value.toLocaleString() })),
                ],
                note: "These are record counts; they do not represent each group’s travel volume or risk per journey.",
              });
            }}>
              <PanelHeading title="Road users represented" detail={meta?.mode === "demo" ? "In sample incident records" : "In returned incident records"} />
              <div className="chart-area chart-user">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart accessibilityLayer data={data.roadUserDistribution} layout="vertical" onClick={(chartState, event) => {
                    if (typeof chartState.activeTooltipIndex !== "number") return;
                    const item = data.roadUserDistribution[chartState.activeTooltipIndex];
                    if (!item) return;
                    event.stopPropagation();
                    const total = data.roadUserDistribution.reduce((sum, category) => sum + category.value, 0);
                    showDetail({
                      title: item.name,
                      description: "Crash records attributed to this road-user category.",
                      entries: [
                        { label: "Records", value: item.value.toLocaleString() },
                        { label: "Share of represented records", value: `${total ? Math.round(item.value / total * 1000) / 10 : 0}%` },
                      ],
                      note: "A record count does not account for each group’s traffic volume or exposure on the road.",
                    });
                  }} margin={{ top: 0, right: 15, left: 20, bottom: 0 }}>
                    <CartesianGrid stroke="#edf1f5" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#657284", fontSize: 11 }} width={76} />
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="value" name="Records" radius={[0, 4, 4, 0]} barSize={10}>{data.roadUserDistribution.map((item, index) => <Cell key={item.name} fill={item.color ?? COLORS[index % COLORS.length]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </InteractiveAnalyticsCard>
          </div>
        </div>

        <InteractiveAnalyticsCard className="business-value-panel" label="Potential road safety operating value" onOpen={() => showDetail({
          title: "Potential operating value",
          description: "Ways validated road-safety information could support planning and service measurement.",
          entries: [
            { label: "Prevent", value: "Prioritize corridors after validating local reports and traffic." },
            { label: "Respond", value: "Compare facility placement with expected demand." },
            { label: "Measure", value: "Track outcomes, response time, and cost over time." },
          ],
          note: "These are potential uses. Current models classify severity; they do not forecast future crashes or prove that an intervention caused a change.",
        })}>
          <div className="business-value-heading"><span>BUSINESS VALUE · POTENTIAL</span><strong>Turn risk signals into measurable operating decisions.</strong></div>
          <div className="business-value-grid">
            <div><span>PREVENT</span><p>Target validated corridors before harm occurs.</p></div>
            <div><span>RESPOND</span><p>Place teams closer to expected demand.</p></div>
            <div><span>MEASURE</span><p>Track severe crashes, response time and cost.</p></div>
          </div>
          <small>Benefits require accurate forecasts and outcome data. Current models classify severity; they do not forecast future crashes.</small>
        </InteractiveAnalyticsCard>
        {data.insights.length > 0 && <InteractiveAnalyticsCard className="insights-strip" label="Road safety data note" onOpen={() => showDetail({
          title: "Data note",
          description: "Context returned with the current RoadLens overview data.",
          entries: [
            { label: "Data source", value: meta?.mode === "demo" ? "Illustrative sample response" : "Connected analytics service" },
            { label: "Reporting period", value: periodLabel },
            { label: "Note", value: data.insights[0] },
          ],
          note: meta?.mode === "demo" ? "Sample information is for interface demonstration and is not an official statistic." : "Interpret the result alongside reporting coverage and the connected service’s data definitions.",
        })}>
          <div className="insights-icon"><Activity size={17} /></div>
          <div className="insights-copy">
            <span>DATA NOTES <i>·</i> {meta?.mode === "demo" ? "SAMPLE" : "SERVICE"}</span>
            <div>{data.insights.slice(0, 1).map((insight) => <p key={insight}>{insight}</p>)}</div>
          </div>
          <Link to="/analytics/accidents">Analysis <ArrowRight size={14} /></Link>
        </InteractiveAnalyticsCard>}
      </>}
    </DataState>
    {detail && <AnalyticsDetailPopup detail={detail} closeRef={detailCloseRef} onClose={() => setDetail(null)} />}
  </>;
}

export function AccidentAnalysisPage() {
  const { period, showDetail } = useOutletContext<AnalyticsContext>();
  const { data, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.analysis(period, signal), [period]);
  const summary = data ? summarizeAnalysis(data) : null;
  return <><PageTitle eyebrow="ACCIDENT ANALYSIS" title="Patterns over time." detail="Compare reported accident frequency across time, day, and road context." action={<Badge className="page-count-badge">HISTORICAL VIEW</Badge>} /><DataState loading={loading} error={error} retry={reload} title="No accident analysis available" detail="Connect the trends endpoint to show analyzed results.">{data && <><DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} /><div className="analysis-stat-row"><div><span>REPORTING WINDOW</span><strong>{summary?.reportingWindow ?? "—"}</strong><small>{meta?.mode === "demo" ? "Years in sample response" : "Years returned by service"}</small></div><div><span>RECORDS IN VIEW</span><strong>{summary?.totalRecords ?? "—"}</strong><small>{meta?.mode === "demo" ? "Sum of sample annual counts" : "Sum of returned annual counts"}</small></div><div><span>PEAK TWO-HOUR WINDOW</span><strong>{summary?.peakWindow ?? "—"}</strong><small>{meta?.mode === "demo" ? "Highest sample interval" : "Highest returned interval"}</small></div><div><span>WEEKEND SHARE</span><strong>{summary?.weekendShare ?? "—"}</strong><small>{meta?.mode === "demo" ? "Calculated from sample weekdays" : "Calculated from returned weekdays"}</small></div></div><div className="analysis-chart-grid"><Card className="chart-panel wide-chart"><PanelHeading title="Accident frequency by year" detail={meta?.mode === "demo" ? "Sample records by reporting year" : "Records returned by reporting year"} /><div className="chart-area chart-xl"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer data={data.annualTrend} onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.annualTrend[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.label, description: `Reported accident records for ${point.label}.`, entries: [{ label: "Accident records", value: point.accidents.toLocaleString() }, { label: "Fatality reports", value: (point.fatalities ?? 0).toLocaleString() }, { label: "Injury reports", value: (point.injuries ?? 0).toLocaleString() }], note: meta?.mode === "demo" ? "This is illustrative sample data, not an official statistic." : "These counts are returned by the connected service." }); }} margin={{ top: 15, right: 18, left: -12, bottom: 4 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 11 }} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Line type="monotone" dataKey="accidents" name="Accident records" stroke="#2563eb" strokeWidth={2.5} dot={{ fill: "#fff", stroke: "#2563eb", strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} /><Line type="monotone" dataKey="fatalities" name="Fatality reports" stroke="#f59e0b" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer></div><div className="chart-legend"><span><i className="legend-line legend-blue" />Accident records</span><span><i className="legend-line legend-orange" />Fatality reports</span></div></Card><Card className="chart-panel"><PanelHeading title="By day of week" detail={meta?.mode === "demo" ? "Report counts in sample data" : "Records returned by day of week"} /><div className="chart-area chart-xl"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={data.weekdayDistribution} onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.weekdayDistribution[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.name, description: `Crash reports grouped under ${point.name}.`, entries: [{ label: "Accident records", value: point.value.toLocaleString() }, { label: "Day of week", value: point.name }], note: "Historical counts do not account for differences in traffic volume by day." }); }} margin={{ top: 12, right: 10, left: -17, bottom: 5 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Bar dataKey="value" name="Records" fill="#f5a623" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div></Card><Card className="chart-panel wide-chart"><PanelHeading title="Reported accidents by hour" detail={meta?.mode === "demo" ? "Sample records grouped into two-hour periods" : "Records grouped into two-hour periods"} /><div className="chart-area chart-xl"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={data.hourlyDistribution} onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.hourlyDistribution[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.label, description: `Reported crash activity for the ${point.label} time interval.`, entries: [{ label: "Accident records", value: point.accidents.toLocaleString() }, { label: "Fatality reports", value: (point.fatalities ?? 0).toLocaleString() }, { label: "Injury reports", value: (point.injuries ?? 0).toLocaleString() }], note: "These are historical counts in the displayed two-hour interval, not a live risk forecast." }); }} margin={{ top: 15, right: 18, left: -15, bottom: 4 }}><defs><linearGradient id="hourFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={.22} /><stop offset="100%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient></defs><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Area type="monotone" dataKey="accidents" name="Records" stroke="#f59e0b" fill="url(#hourFill)" strokeWidth={2.5} /></AreaChart></ResponsiveContainer></div></Card><Card className="chart-panel"><PanelHeading title="By road type" detail="Reported location context" /><div className="chart-area chart-xl"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={data.roadTypeDistribution} layout="vertical" onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.roadTypeDistribution[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.name, description: `Crash reports associated with ${point.name.toLowerCase()} locations.`, entries: [{ label: "Accident records", value: point.value.toLocaleString() }, { label: "Road type", value: point.name }], note: "This compares returned record counts and does not adjust for road length or traffic volume." }); }} margin={{ top: 4, right: 10, left: 23, bottom: 3 }}><CartesianGrid stroke="#edf1f5" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#657284", fontSize: 10 }} width={95} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Bar dataKey="value" name="Records" fill="#6c95c9" radius={[0, 4, 4, 0]} barSize={13} /></BarChart></ResponsiveContainer></div></Card></div><Card className="findings-panel"><PanelHeading title="Key findings" detail={meta?.mode === "demo" ? "Generated interpretation · sample response" : "Interpretation returned by the backend"} action={<Badge className="generated-badge">GENERATED</Badge>} /><div className="finding-list">{data.insights.map((insight, index) => <div key={insight} className="finding-row"><span>0{index + 1}</span><p>{insight}</p><ArrowUpRight size={15} /></div>)}</div></Card></>}</DataState></>;
}

export function HotspotsPage() {
  const { period, search } = useOutletContext<AnalyticsContext>();
  const { data, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.hotspots(period, isDemoMode ? undefined : search, signal), [period, search]);
  const [selected, setSelected] = useState<Hotspot | null>(null);
  const [level, setLevel] = useState<RiskLevel | "all">("all");
  const [mapLayer, setMapLayer] = useState<"uniform" | "count">("uniform");
  const points = useMemo(() => (data?.locations ?? []).filter((point) => (level === "all" || point.level === level) && (!search.trim() || `${point.name} ${point.mainRoadUser}`.toLowerCase().includes(search.trim().toLowerCase()))), [data, level, search]);
  const visibleSelected = points.find((point) => point.id === selected?.id) ?? null;
  const mapPoint = visibleSelected ?? points[0] ?? null;
      return <><PageTitle eyebrow="LOCATION PATTERNS" title="Crash reports by location." detail="See where past reports are grouped." action={<Badge className="page-count-badge">PAST REPORTS</Badge>} /><DataState loading={loading} error={error} retry={reload} title="No location results yet" detail="Location groups appear when enough crash records are available.">{data && <><DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} /><div className="summary-tiles">{data.summary.map((metric, index) => <MetricTile key={metric.label} {...metric} index={index} />)}</div><div className="hotspot-explorer"><Card className="hotspot-map-card"><PanelHeading title="Past crash reports" detail="Choose a point to see details" action={<label className="compact-select"><span>REPORT COUNT</span><select value={level} onChange={(event) => { setLevel(event.target.value as RiskLevel | "all"); setSelected(null); }}><option value="all">All locations</option><option value="high">High</option><option value="moderate">Medium</option><option value="lower">Low</option></select></label>} /><div className="map-layer-switch" role="group" aria-label="Map marker size"><button type="button" aria-pressed={mapLayer === "uniform"} className={mapLayer === "uniform" ? "selected" : ""} onClick={() => setMapLayer("uniform")}>Same size</button><button type="button" aria-pressed={mapLayer === "count"} className={mapLayer === "count" ? "selected" : ""} onClick={() => setMapLayer("count")}>Size by reports</button></div><div className="hotspot-large-map"><NairobiMap points={points} onSelect={setSelected} selectedId={mapPoint?.id} scaleMarkers={mapLayer === "count"} sourceLabel={meta?.mode === "demo" ? "DEMO SAMPLE LOCATIONS" : "BACKEND LOCATIONS"} />{points.length === 0 && <div className="map-results-empty" role="status">No locations match the current search and count.</div>}<MapInsightWindow point={mapPoint} demo={meta?.mode === "demo"} /></div><div className="map-panel-footer"><div className="risk-legend"><span><i className="risk-dot risk-high" />High count</span><span><i className="risk-dot risk-moderate" />Medium</span><span><i className="risk-dot risk-lower" />Low</span></div></div></Card><Card className="cluster-list-card"><PanelHeading title="Locations in view" detail={`${points.length} ${meta?.mode === "demo" ? "sample locations" : "locations returned"}`} /><div className="cluster-list">{points.length ? points.map((point) => <button type="button" key={point.id} onClick={() => setSelected(point)} className={`cluster-list-item ${mapPoint?.id === point.id ? "cluster-selected" : ""}`}><span className={`cluster-dot cluster-${point.level}`} /><span className="cluster-info"><strong>{point.name}</strong><small>{point.mainRoadUser} · {clusterLevelLabel(point.level)}</small></span><span className="cluster-count">{point.incidents.toLocaleString()}<small>reports</small></span></button>) : <div className="cluster-search-empty"><strong>No locations match.</strong><span>Adjust the search or report count.</span></div>}<div className="historical-warning"><Info size={14} />Past report counts do not predict where the next crash will happen.</div></div></Card></div></>}</DataState></>;
}

export function SeverityPage() {
  const { period, showDetail } = useOutletContext<AnalyticsContext>();
  const { data, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.severity(period, signal), [period]);
  return <><PageTitle eyebrow="CRASH OUTCOMES" title="Understand crash outcomes." detail="See reported outcomes by road-user group and compare example results with past records." action={<Badge className="page-count-badge">OUTCOME COMPARISON</Badge>} /><DataState loading={loading} error={error} retry={reload} title="No outcome details available" detail="Crash outcome details have not been returned yet.">{data && <><DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} /><div className="severity-layout-grid"><Card className="chart-panel"><PanelHeading title="Fatal crash reports by road user" detail={meta?.mode === "demo" ? "Example counts" : "Counts returned by the service"} /><div className="chart-area chart-xl"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={data.byRoadUser} layout="vertical" onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.byRoadUser[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.name, description: `Fatal crash reports represented for ${point.name.toLowerCase()}.`, entries: [{ label: "Fatality reports", value: point.value.toLocaleString() }, { label: "Road-user group", value: point.name }], note: "Counts reflect the records returned by the service and are not adjusted for travel exposure." }); }} margin={{ top: 14, right: 18, left: 20, bottom: 4 }}><CartesianGrid stroke="#edf1f5" horizontal={false} /><XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#657284", fontSize: 11 }} width={84} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Bar dataKey="value" name="Fatality reports" radius={[0, 4, 4, 0]} barSize={18}>{data.byRoadUser.map((item, index) => <Cell key={item.name} fill={item.color ?? COLORS[index % COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div></Card><Card className="severity-dist-card"><PanelHeading title="Reported crash outcomes" detail={meta?.mode === "demo" ? "Example counts" : "Counts returned by the service"} /><div className="severity-chart-row severity-chart-large"><div className="severity-donut"><ResponsiveContainer width="100%" height="100%"><PieChart accessibilityLayer onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.byRoadUser[index]; if (!point) return; event.stopPropagation(); const total = data.byRoadUser.reduce((sum, item) => sum + item.value, 0); showDetail({ title: point.name, description: "Share of recorded crash outcomes represented by this road-user group.", entries: [{ label: "Records", value: point.value.toLocaleString() }, { label: "Share of displayed records", value: `${total ? Math.round(point.value / total * 1000) / 10 : 0}%` }], note: meta?.mode === "demo" ? "This chart uses illustrative sample data." : "This chart uses the outcome records returned by the connected service." }); }}><Pie data={data.byRoadUser} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="92%" paddingAngle={3} stroke="none">{data.byRoadUser.map((item, index) => <Cell key={item.name} fill={item.color ?? COLORS[index % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /></PieChart></ResponsiveContainer></div><div className="severity-legend">{data.byRoadUser.map((item, index) => <div key={item.name}><i style={{ backgroundColor: item.color ?? COLORS[index % COLORS.length] }} /><span>{item.name}</span><strong>{item.value}</strong></div>)}</div></div><p className="chart-caption">These example counts may not reflect all reported crashes.</p></Card><Card className="chart-panel wide-chart"><PanelHeading title="How example results compared" detail="Sample results compared with recorded crash outcomes" /><ModelScoreTable models={data.models} /></Card><Card className="confusion-card"><PanelHeading title="Reported vs estimated outcomes" detail="See where example results matched or differed from recorded outcomes." /><div className="confusion-matrix"><div /><span>Estimated fatal</span><span>Estimated serious</span><span>Estimated minor</span>{["Recorded fatal", "Recorded serious", "Recorded minor"].map((label, row) => <div className="matrix-row" key={label}><strong>{label}</strong>{data.confusionMatrix[row]?.map((value, col) => <span key={col} className={`matrix-cell matrix-${row}-${col}`}>{value}</span>)}</div>)}</div><div className="data-mode-note"><Info size={14} />{meta?.mode === "demo" ? "These example counts are for illustration only." : "Counts are grouped by recorded and estimated outcome."}</div></Card></div></>}</DataState></>;
}

export function RiskFactorsPage() {
  const { period, showDetail } = useOutletContext<AnalyticsContext>();
  const { data, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.riskFactors(period, signal), [period]);
  return <><PageTitle eyebrow="CRASH RECORDS" title="Patterns in the crash records." detail="Review details that appear alongside different reported outcomes." action={<Badge className="page-count-badge">WHAT WE SEE</Badge>} /><DataState loading={loading} error={error} retry={reload} title="No related details available" detail="More crash records are needed to show patterns here.">{data && <><DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} /><div className="risk-factors-layout"><Card className="factor-ranking-card"><PanelHeading title="Details linked to outcomes" detail="How much each detail influenced these results" action={<CircleHelp size={16} className="subtle-icon" />} /><div className="factor-list">{data.factors.map((item, index) => <div className="factor-row" key={item.factor}><span className="factor-rank">0{index + 1}</span><span className="factor-name">{item.factor}<small>{item.direction}</small></span><div className="factor-track"><span style={{ width: `${Math.min(100, item.importance * 100)}%` }} /></div><strong>{(item.importance * 100).toFixed(0)}<small>%</small></strong></div>)}</div><div className="factor-source-note"><Info size={14} />These scores compare how much each detail influenced these results. They are not the chance of a crash and do not show what caused one.</div></Card><div className="risk-side-col"><Card className="chart-panel"><PanelHeading title="Patterns in the records" detail={meta?.mode === "demo" ? "Example relationships" : "Relationships in the returned records"} /><div className="chart-area chart-medium"><ResponsiveContainer width="100%" height="100%"><BarChart accessibilityLayer data={data.associations} layout="vertical" onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.associations[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.name, description: `Observed relationship score for ${point.name.toLowerCase()} in these records.`, entries: [{ label: "Relationship score", value: `${(point.value * 100).toFixed(1)}%` }, { label: "Factor", value: point.name }], note: "An observed relationship does not show that one factor caused a crash." }); }} margin={{ top: 8, right: 20, left: 17, bottom: 4 }}><CartesianGrid stroke="#edf1f5" horizontal={false} /><XAxis type="number" domain={[0, 1]} axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#657284", fontSize: 10 }} width={94} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Bar dataKey="value" name="Relationship strength" fill="#7b9ace" radius={[0, 4, 4, 0]} barSize={13} /></BarChart></ResponsiveContainer></div></Card><Card className="interpretation-card"><span className="interpretation-icon"><ShieldCheck size={19} /></span><span className="card-overline">READ WITH CARE</span><h3>A pattern is not proof.</h3><p>Seeing two details together does not mean one caused the crash. Missing reports and uneven data can also affect these results.</p></Card></div></div><Card className="findings-panel"><PanelHeading title="What stands out" detail={meta?.mode === "demo" ? "Notes from the example records" : "Notes from the returned records"} />{data.insights.map((insight, index) => <div className="finding-row" key={insight}><span>0{index + 1}</span><p>{insight}</p><ArrowUpRight size={15} /></div>)}</Card></>}</DataState></>;
}

export function PredictionsPage() {
  const { period, showDetail } = useOutletContext<AnalyticsContext>();
  const { data, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.predictions(period, signal), [period]);
  return <><PageTitle eyebrow="ESTIMATES & LIMITS" title="What these estimates can tell us." detail="See how example results match past records and where better data is needed." action={<Badge className="page-count-badge">SAMPLE ESTIMATES</Badge>} /><DataState loading={loading} error={error} retry={reload} title="No estimates available" detail="No results have been returned yet.">{data && <><DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} /><div className="prediction-banner"><div className="prediction-icon"><ShieldCheck size={20} /></div><div><strong>Past hotspots show where crashes were reported, not where the next crash will happen.</strong><span>To estimate future crash locations, RoadLens needs reliable traffic counts and records from roads and times both with and without crashes.</span></div></div><div className="prediction-layout"><Card className="wide-chart"><PanelHeading title="How results matched past records" detail="Example approaches compared with recorded crash outcomes" /><ModelScoreTable models={data.models} /></Card><Card className="chart-panel"><PanelHeading title={meta?.mode === "demo" ? "Crash reports by year" : "Results by year"} detail={meta?.mode === "demo" ? "Sample yearly totals · not a test of future estimates" : "Yearly totals returned by the service"} /><div className="chart-area chart-xl"><ResponsiveContainer width="100%" height="100%"><LineChart accessibilityLayer data={data.validation} onClick={(chartState, event) => { const index = chartState.activeTooltipIndex; if (typeof index !== "number") return; const point = data.validation[index]; if (!point) return; event.stopPropagation(); showDetail({ title: point.label, description: `Validation records for ${point.label}.`, entries: [{ label: "Accident records", value: point.accidents.toLocaleString() }, { label: "Fatality reports", value: (point.fatalities ?? 0).toLocaleString() }, { label: "Injury reports", value: (point.injuries ?? 0).toLocaleString() }], note: "Past validation records do not establish how future crashes will occur." }); }} margin={{ top: 15, right: 14, left: -12, bottom: 4 }}><CartesianGrid stroke="#edf1f5" vertical={false} /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: "#8491a0", fontSize: 10 }} /><Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} /><Line type="monotone" dataKey="accidents" name="Records" stroke="#2563eb" strokeWidth={2.3} dot={false} /></LineChart></ResponsiveContainer></div></Card><Card className="factor-ranking-card"><PanelHeading title="Details considered" detail="Details that had more influence on these example results" /><div className="factor-list">{data.featureImportance.slice(0, 5).map((item, index) => <div className="factor-row" key={item.factor}><span className="factor-rank">0{index + 1}</span><span className="factor-name">{item.factor}</span><div className="factor-track"><span style={{ width: `${item.importance * 100}%` }} /></div><strong>{(item.importance * 100).toFixed(0)}<small>%</small></strong></div>)}</div></Card></div><Card className="findings-panel"><PanelHeading title="About these results" detail="What they can and cannot tell us" />{data.notes.map((note, index) => <div className="finding-row" key={note}><span>0{index + 1}</span><p>{note}</p><Info size={14} /></div>)}</Card></>}</DataState></>;
}

export function EmergencyResponsePage() {
  const { data: facilities, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.facilities(signal), []);
  const { data: coverage, meta: coverageMeta, loading: coverageLoading } = useRoadlensData((signal) => roadlensApi.coverage(signal), []);
  const [incident, setIncident] = useState(isDemoMode ? "Sample incident · Ngara" : "");
  const [facilityId, setFacilityId] = useState("");
  const [algorithm, setAlgorithm] = useState<"dijkstra" | "astar">("astar");
  const [route, setRoute] = useState<Awaited<ReturnType<typeof roadlensApi.requestRoute>>["data"] | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const selectedFacilityId = facilities?.some((facility) => facility.id === facilityId) ? facilityId : facilities?.[0]?.id ?? "";
  const requestRoute = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setRequesting(true); setRouteError(null);
    try { const result = await roadlensApi.requestRoute({ incident, facilityId: selectedFacilityId, algorithm }); setRoute(result.data); }
    catch (reason) { setRouteError(reason instanceof Error ? reason.message : "Route service is unavailable."); }
    finally { setRequesting(false); }
  };
  return <><PageTitle eyebrow="EMERGENCY RESPONSE" title="Every minute matters." detail="Explore route and facility-coverage responses from the available road network." action={<Badge className="page-count-badge"><span className="route-status-dot" /> ROUTE EXPLORER</Badge>} /><DataState loading={loading} error={error} retry={reload} title="Emergency facilities are unavailable" detail="Facility locations will appear when the backend response is available.">{facilities && <><DemoNote mode={meta?.mode} updatedAt={meta?.updatedAt} /><div className="emergency-workspace"><Card className="route-map-card"><PanelHeading title="Nairobi response network" detail="Facility locations and route geometry are returned by the backend." action={<div className="facility-legend"><span><i className="facility-dot hospital-dot" />Hospital</span><span><i className="facility-dot station-dot" />Response station</span><span><i className="facility-dot proposed-dot" />Proposed site</span></div>} /><div className="response-map"><NairobiMap points={[]} route={route} facilities={[...facilities, ...(coverage?.proposedFacilities ?? [])]} sourceLabel={meta?.mode === "demo" ? "DEMO FACILITY LOCATIONS" : "BACKEND FACILITY LOCATIONS"} /></div><div className="network-map-foot"><span>OPENSTREETMAP ROAD CONTEXT</span><span>NO LIVE TRAFFIC OR DISPATCH DATA</span></div></Card><div className="route-control-column"><Card className="route-form-card"><div className="route-form-heading"><span className="route-form-icon"><Route size={18} /></span><span><strong>Find a route</strong><small>Request an optimized route response</small></span></div><form onSubmit={requestRoute}><label className="form-field"><span>INCIDENT LOCATION</span>{meta?.mode === "demo" ? <select value={incident} onChange={(event) => setIncident(event.target.value)}><option>Sample incident · Ngara</option><option>Sample incident · Westlands</option><option>Sample incident · Industrial Area</option></select> : <input value={incident} onChange={(event) => setIncident(event.target.value)} placeholder="Enter a road, place, or coordinate" required />}<small>{meta?.mode === "demo" ? "Illustrative locations · route is not for dispatch" : "Enter an incident location supported by your routing service."}</small></label><label className="form-field"><span>DESTINATION FACILITY</span><select value={selectedFacilityId} onChange={(event) => setFacilityId(event.target.value)} required>{facilities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.type}</option>)}</select></label><label className="form-field"><span>ROUTING ALGORITHM</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as "dijkstra" | "astar")}><option value="astar">A* search</option><option value="dijkstra">Dijkstra’s algorithm</option></select><small>Backend road network and weights determine results.</small></label><Button type="submit" className="route-submit" disabled={requesting || !selectedFacilityId || !incident.trim()} icon={requesting ? <RefreshCw size={15} className="spin" /> : <ArrowRight size={15} />}>{requesting ? "Requesting route" : "Request recommended route"}</Button>{routeError && <p className="form-error">{routeError}</p>}</form><div className="route-auth-note"><ShieldCheck size={14} /> Planning interface only · not dispatch software</div></Card><Card className="facility-coverage-card"><PanelHeading title="Facilities in response" detail={`${facilities.length} locations returned by service`} />{facilities.map((facility) => <div className="facility-list-item" key={facility.id}><span className={`facility-dot ${facility.type === "hospital" ? "hospital-dot" : "station-dot"}`} /><span><strong>{facility.name}</strong><small>{facility.type === "hospital" ? "Hospital" : "Emergency response station"}</small></span><ChevronRight size={14} /></div>)}<div className="coverage-section-heading"><span>FACILITY COVERAGE SCENARIO</span><Badge className="route-demo-badge">{coverageMeta?.mode === "live" ? "BACKEND" : "DEMO"}</Badge></div>{coverageLoading && <div className="coverage-inline-state">Loading coverage results…</div>}{coverage && <><div className="coverage-preview"><div><span>{coverageMeta?.mode === "demo" ? "P-MEDIAN SAMPLE SCENARIO" : "P-MEDIAN SCENARIO"}</span><strong>{coverage.demandCoveragePercent}% demand coverage</strong><small>Model-generated recommendations · not actual stations</small></div><span className="coverage-ring">{coverage.demandCoveragePercent}%</span></div><div className="coverage-time-compare"><span>AVERAGE TRAVEL TIME</span><div><strong>{coverage.averageTravelMinutesExisting.toFixed(1)} <small>min</small></strong><ArrowRight size={13} /><strong>{coverage.averageTravelMinutesProposed.toFixed(1)} <small>min</small></strong></div><small>{coverageMeta?.mode === "demo" ? "Existing → proposed sample scenario" : "Existing → proposed service scenario"}</small></div><div className="proposed-site-list"><strong>PROPOSED MODEL SITES</strong>{coverage.proposedFacilities.map((site) => <div key={site.id}><i />{site.name}<small>MODEL SUGGESTION</small></div>)}</div><div className="coverage-gaps"><strong>{coverageMeta?.mode === "demo" ? "ILLUSTRATIVE COVERAGE GAPS" : "COVERAGE GAPS RETURNED BY SERVICE"}</strong>{coverage.coverageGaps.map((gap) => <span key={gap}><MapPin size={11} />{gap}</span>)}</div></>}</Card></div></div>{route && <Card className="route-result"><div className="route-result-check"><Check size={17} /></div><div className="route-result-main"><div className="route-result-top"><span>ROUTE SERVICE RESPONSE {route.demo && <Badge className="route-demo-badge">DEMO</Badge>}</span><strong>{route.facilityName}</strong></div><div className="route-result-metrics"><div><span>ESTIMATED DISTANCE</span><strong>{route.distanceKm.toFixed(1)} <small>km</small></strong></div><div><span>ESTIMATED TIME</span><strong>{route.travelMinutes} <small>min</small></strong></div><div><span>ALGORITHM</span><strong>{route.algorithm}</strong></div></div><div className="route-alternatives">{route.alternatives.map((alt) => <div key={alt.name}><span>{alt.name}</span><span>{alt.distanceKm.toFixed(1)} km <i>·</i> {alt.travelMinutes} min</span></div>)}</div></div></Card>}<div className="method-limitation"><TriangleAlert size={15} /><span>{meta?.mode === "demo" ? "Route estimates shown here are examples." : "Route recommendations depend on service coverage and network data."} Actual travel time depends on validated road-network weights and live conditions.</span></div></>}</DataState></>;
}

export function CommunityReportsPage() {
  const { period } = useOutletContext<AnalyticsContext>();
  const { data: reports, meta, loading, error, reload } = useRoadlensData((signal) => roadlensApi.communityReports(period, signal), [period]);
  const [location, setLocation] = useState("");
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const photo = formData.get("photo");
    const body: CommunityReportInput = {
      location: String(formData.get("location")),
      occurredAt: String(formData.get("occurredAt")),
      incidentType: String(formData.get("incidentType")),
      roadUsers: formData.getAll("roadUsers").map(String),
      description: String(formData.get("description")),
      contact: String(formData.get("contact") ?? "") || undefined,
      photo: photo instanceof File && photo.size ? photo : undefined,
      ...(selectedCoordinates ? { latitude: selectedCoordinates[0], longitude: selectedCoordinates[1] } : {}),
    };
    setSubmitting(true);
    setSubmitted(null);
    setFormError(null);
    try {
      const result = await roadlensApi.submitReport(body);
      const demoNotice = result.meta.mode === "demo" ? " · Demo only; not transmitted or stored" : "";
      setSubmitted(`${result.data.id} · ${result.data.status}${demoNotice}`);
      form.reset();
      setLocation("");
      setSelectedCoordinates(null);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : "The report service is unavailable.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageTitle eyebrow="COMMUNITY CONTRIBUTIONS" title="Share an incident report." detail="Community submissions are separate from official accident datasets and require verification." action={<Badge className="page-count-badge">MODERATED REPORTS</Badge>} />
      <div className="report-disclaimer">
        <ShieldCheck size={17} />
        <div>
          <strong>A community report is not a confirmed accident.</strong>
          <span>Reports remain pending until reviewed. Personal contact details are private and are not shown in the public report list.</span>
        </div>
      </div>

      <div className="report-layout">
        <Card className="report-form-card">
          <PanelHeading title="Report a road incident" detail="Share only what you know. Fields with * are required." />
          <form className="report-form" onSubmit={submit}>
            <label className="form-field">
              <span>INCIDENT LOCATION *</span>
              <input name="location" required value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Road, landmark, or area" /></label>

            <div className="report-location-picker">
              <div className="report-location-picker-head">
                <strong>Or select a point on the map</strong>
                <span>Click to set approximate coordinates</span>
              </div>

              <div className="report-location-map">
                <NairobiMap points={[]} onMapChoose={(latitude, longitude) => { setSelectedCoordinates([latitude, longitude]); setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`); }} chosenCoordinate={selectedCoordinates} sourceLabel="MAP CLICK LOCATION" /></div>
            </div>
            <div className="form-row">
              <label className="form-field">
                <span>DATE AND TIME *</span>
                <input type="datetime-local" name="occurredAt" required />
              </label>

              <label className="form-field">
                <span>INCIDENT TYPE *</span>
                <select name="incidentType" required defaultValue="">
                  <option value="" disabled>Select category</option>
                  <option>Collision</option>
                  <option>Pedestrian incident</option>
                  <option>Motorcycle incident</option>
                  <option>Single-vehicle incident</option>
                  <option>Other road incident</option>
                </select>
              </label>

            </div>
            <fieldset className="form-field">
              <legend>ROAD USERS INVOLVED</legend>
              <div className="checkbox-group">{["Pedestrian", "Motorcyclist", "Cyclist", "Passenger", "Driver"].map((user) => <label key={user}>
                <input type="checkbox" name="roadUsers" value={user} /><span>{user}</span></label>)}</div>
            </fieldset>

            <label className="form-field">
              <span>BRIEF DESCRIPTION *</span>
              <textarea name="description" rows={4} required maxLength={800} placeholder="Describe what happened without including private details about other people." /></label>

            <div className="form-row">
              <label className="form-field">
                <span>PHOTO <small>OPTIONAL</small></span>
                <input className="file-input" type="file" name="photo" accept="image/*" /></label>
              <label className="form-field">
                <span>CONTACT FOR FOLLOW-UP <small>OPTIONAL · PRIVATE</small></span>
                <input name="contact" autoComplete="off" placeholder="Email or phone number" />
              </label>
            </div>

            <label className="privacy-consent">
              <input type="checkbox" required />
              <span>I understand this report will be reviewed and may be shared with authorized responders. My contact details will not be displayed publicly.</span>
            </label>

            <Button type="submit" disabled={submitting} icon={submitting ? <RefreshCw size={14} className="spin" /> : <ArrowRight size={15} />}>{submitting ? "Submitting report" : "Submit for verification"}</Button>
            {submitted && <div className="success-message"><Check size={15} /><span><strong>Report received.</strong> {submitted}</span></div>}
            {formError && <p className="form-error">{formError}</p>}
          </form>
        </Card>
        <div className="report-side">
          <Card className="report-status-card">
            <PanelHeading title="Submission status" detail="Available report records" />
            <DataState loading={loading} error={error} retry={reload} title="No reports returned" detail="No report records are currently available.">
              {reports && <>{meta?.mode === "demo" &&
              <div className="report-demo-note">Sample report records for interface preview</div>}
              <div className="report-status-list">{reports.map((report) =>
              <div className="report-status-item" key={report.id}>
              <div>
                <strong>{report.location}</strong>
                <span>{report.incidentType} <i>·</i> {report.submittedAt}</span></div>
                <Badge className={`report-badge report-${report.status === "Verified" ? "verified" : report.status === "Rejected" ? "rejected" : "pending"}`}>{report.status}</Badge>
                </div>)}
                </div>
              </>}
            </DataState>
          </Card>
          <Card className="report-explainer">
            <span className="explainer-icon">
              <Info size={16} />
            </span>
            <strong>What happens after submission?</strong>
            <ol>
              <li>
                <span>1</span>
                <div>
                  <b>Review</b>
                  <small>An authorized reviewer checks the report.</small>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <b>Verification</b>
                  <small>Additional information may be requested.</small>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <b>Status update</b>
                  <small>Pending, verified, or rejected.</small>
                </div>
              </li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}

export function SettingsPage() {
  const { period, search, setPeriod, setSearch } = useOutletContext<AnalyticsContext>();
  const { user } = useAuth();
  const periodNames: Record<Period, string> = {
    "30d": "Last 30 days",
    "90d": "Last 90 days",
    "12m": "Last 12 months",
    all: "All available data",
  };

  return <>
    <PageTitle eyebrow="WORKSPACE PREFERENCES" title="Dashboard settings." detail="Choose the reporting window and location search used across your workspace." action={<Badge className="page-count-badge">SESSION SETTINGS</Badge>} />
    <div className="settings-layout">
      <Card className="settings-card settings-primary-card">
        <PanelHeading title="Dashboard preferences" detail="Changes apply immediately to the analytics workspace." />
        <div className="settings-fields">
          <label className="form-field">
            <span>REPORTING WINDOW</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value as Period)}>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="12m">Last 12 months</option>
              <option value="all">All available data</option>
            </select>
            <small>Updates the time filter used by analytics tabs.</small>
          </label>
          <label className="form-field">
            <span>LOCATION SEARCH</span>
            <div className="settings-search-wrap"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search a road, area, or road-user group" /><button type="button" onClick={() => setSearch("")} disabled={!search} aria-label="Clear location search"><X size={15} /></button></div>
            <small>Filters matching locations on the overview and hotspot map.</small>
          </label>
        </div>
        <div className="settings-current"><span className="settings-current-icon"><Clock3 size={17} /></span><div><strong>{periodNames[period]}</strong><small>Current reporting window</small></div><Badge className={isDemoMode ? "demo-badge" : "live-data-badge"}><span />{isDemoMode ? "SAMPLE" : "CONNECTED"}</Badge></div>
      </Card>
      <div className="settings-side-column">
        <Card className="settings-card">
          <PanelHeading title="Your workspace" detail="Signed-in account" />
          <div className="settings-profile"><span className="settings-avatar">{user?.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><div><strong>{user?.name}</strong><small>{user?.email}</small></div></div>
          <div className="settings-readonly-row"><span>Workspace</span><strong>Nairobi County</strong></div>
          <div className="settings-readonly-row"><span>Account access</span><strong>Authenticated</strong></div>
        </Card>
        <Card className="settings-card settings-source-card">
          <span className="settings-source-icon"><Activity size={17} /></span>
          <strong>Data source</strong>
          <p>{isDemoMode ? "This workspace is showing illustrative sample responses." : "Analytics are connected to the configured RoadLens service."}</p>
          <small>{isDemoMode ? "Sample figures are not official statistics." : "Coverage depends on the connected service."}</small>
        </Card>
      </div>
    </div>
  </>;
}
