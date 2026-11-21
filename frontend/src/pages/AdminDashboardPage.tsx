import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Clock3, Eye, Gauge, RefreshCw, Users, UserPlus, X } from "lucide-react";
import { loadAdminMetrics } from "../api/admin";
import { Badge, Button, Card, ErrorState, LoadingState, PanelHeading } from "../components/ui";
import type { AdminMetrics, AdminRange } from "../types/analytics";

const ranges: Array<{ value: AdminRange; label: string }> = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

interface DetailEntry { label: string; value: string }
interface DashboardDetail {
  title: string;
  description: string;
  entries: DetailEntry[];
  note: string;
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatTimelineLabel(timestamp: number, range: AdminRange) {
  const date = new Date(timestamp * 1000);
  return range === "24h"
    ? date.toLocaleTimeString([], { hour: "numeric" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function InteractiveCard({ className = "", label, onOpen, children }: { className?: string; label: string; onOpen: () => void; children: ReactNode }) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onOpen();
  }

  return <Card className={`admin-interactive-card ${className}`} role="group" tabIndex={0} aria-label={`${label}. Press Enter for details.`} aria-haspopup="dialog" title="Click or press Enter to view details" onClick={onOpen} onKeyDown={handleKeyDown}>
    {children}
  </Card>;
}

function SummaryCard({ title, value, detail, icon: Icon, tone, onOpen }: { title: string; value: string; detail: string; icon: typeof Activity; tone: string; onOpen: () => void }) {
  return <InteractiveCard className={`admin-summary-card ${tone}`} label={`${title}: ${value}`} onOpen={onOpen}>
    <div className="admin-summary-top"><span>{title}</span><i><Icon size={16} /></i></div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </InteractiveCard>;
}

function EmptyPanel({ children }: { children: string }) {
  return <div className="admin-panel-empty">{children}</div>;
}

export function AdminDashboardPage() {
  const [range, setRange] = useState<AdminRange>("24h");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedDetail, setSelectedDetail] = useState<DashboardDetail | null>(null);
  const closePopupRef = useRef<HTMLButtonElement | null>(null);
  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    loadAdminMetrics(range, controller.signal)
      .then(setMetrics)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Application metrics are unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [range, refreshToken]);

  useEffect(() => {
    const timer = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (!selectedDetail) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const handleDialogKeys = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedDetail(null);
      } else if (event.key === "Tab") {
        event.preventDefault();
        closePopupRef.current?.focus();
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleDialogKeys);
    closePopupRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDialogKeys);
      previousFocus?.focus();
    };
  }, [selectedDetail]);

  const chartData = (metrics?.timeline ?? []).map((point) => ({
    ...point,
    label: formatTimelineLabel(point.timestamp, range),
  }));
  const summary = metrics?.summary;
  const rangeLabel = ranges.find((item) => item.value === range)?.label ?? "24 hours";
  const showDetail = (title: string, description: string, entries: DetailEntry[], note: string) => {
    setSelectedDetail({
      title,
      description,
      entries: [{ label: "Reporting window", value: rangeLabel }, ...entries],
      note,
    });
  };

  return <div className="admin-dashboard">
    <div className="page-title-row admin-title-row">
      <div>
        <div className="page-eyebrow"><span />APPLICATION ADMINISTRATION</div>
        <h1>Application health</h1>
        <p>Request performance, page traffic, and account activity from the RoadLens application.</p>
      </div>
      <div className="admin-toolbar">
        <div className="admin-range-switch" role="group" aria-label="Metrics time range">
          {ranges.map((item) => <button key={item.value} type="button" aria-pressed={range === item.value} onClick={() => setRange(item.value)}>{item.label}</button>)}
        </div>
        <Button variant="secondary" icon={<RefreshCw size={14} className={loading ? "spin" : ""} />} onClick={refresh} disabled={loading}>Refresh</Button>
      </div>
    </div>

    {error ? <ErrorState message={error} retry={refresh} /> : loading && !metrics ? <LoadingState label="Loading application metrics" /> : metrics && <>
      <button className="admin-status-strip admin-status-strip-button" type="button" onClick={() => showDetail(
        "Monitoring status",
        "How RoadLens collects and refreshes application health data.",
        [
          { label: "Last updated", value: new Date(metrics.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) },
          { label: "Refresh cadence", value: "Every 60 seconds" },
          { label: "Retention", value: "90 days" },
        ],
        "Request counts and response times are stored as minute-level aggregates. No IP addresses or request-level histories are stored.",
      )}>
        <span className="admin-status-light" />
        <strong>Live monitoring</strong>
        <span>Minute-level aggregates · no IP addresses or request-level histories are stored</span>
        <small>UPDATED {new Date(metrics.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
      </button>

      <div className="admin-summary-grid">
        <SummaryCard title="Worker requests" value={formatCount(summary?.requests ?? 0)} detail="Across the selected window" icon={Activity} tone="admin-tone-blue" onOpen={() => showDetail(
          "Worker requests",
          "Total requests handled by the RoadLens Worker during this reporting window.",
          [
            { label: "Requests", value: formatCount(summary?.requests ?? 0) },
            { label: "Error responses", value: formatCount(summary?.errors ?? 0) },
            { label: "Error rate", value: `${summary?.errorRate ?? 0}%` },
            { label: "Average response", value: `${summary?.averageResponseMs ?? 0} ms` },
            { label: "Peak response", value: `${summary?.maxResponseMs ?? 0} ms` },
          ],
          "Requests are grouped by route and minute. The admin metrics fetch itself is excluded from these totals.",
        )} />
        <SummaryCard title="Page views" value={formatCount(summary?.pageViews ?? 0)} detail="Client-side route visits" icon={Eye} tone="admin-tone-teal" onOpen={() => showDetail(
          "Page views",
          "Client-side route visits recorded while people move through RoadLens.",
          [
            { label: "Page views", value: formatCount(summary?.pageViews ?? 0) },
            { label: "Top routes listed", value: formatCount(metrics.topPages.length) },
            { label: "Most visited page", value: metrics.topPages[0]?.path ?? "No page visits yet" },
            { label: "Top page visits", value: formatCount(metrics.topPages[0]?.views ?? 0) },
          ],
          "A page view is recorded when a visitor opens a route or navigates to another route in the app. It is not a count of unique people.",
        )} />
        <SummaryCard title="Active users" value={formatCount(summary?.activeUsers ?? 0)} detail="Signed in and seen in 5 minutes" icon={Users} tone="admin-tone-purple" onOpen={() => showDetail(
          "Active users",
          "Signed-in accounts that opened a RoadLens route during the last five minutes.",
          [
            { label: "Active in last 5 minutes", value: formatCount(summary?.activeUsers ?? 0) },
            { label: "Unique in selected window", value: formatCount(summary?.uniqueUsers ?? 0) },
            { label: "New accounts", value: formatCount(summary?.newUsers ?? 0) },
            { label: "Registered accounts", value: formatCount(summary?.totalUsers ?? 0) },
          ],
          "Signed-in activity is grouped by account and minute. Visitors who are not signed in contribute page views but are not counted as users.",
        )} />
        <SummaryCard title="Average response" value={`${summary?.averageResponseMs ?? 0} ms`} detail={`${summary?.errorRate ?? 0}% requests returned an error`} icon={Gauge} tone="admin-tone-amber" onOpen={() => showDetail(
          "Response performance",
          "Average application request handling time and error rate over the selected window.",
          [
            { label: "Average response", value: `${summary?.averageResponseMs ?? 0} ms` },
            { label: "Slowest response", value: `${summary?.maxResponseMs ?? 0} ms` },
            { label: "Error responses", value: formatCount(summary?.errors ?? 0) },
            { label: "Error rate", value: `${summary?.errorRate ?? 0}%` },
          ],
          "Response time is measured while the application handles each request. External analytics services are outside this measurement.",
        )} />
      </div>

      <div className="admin-chart-grid">
        <InteractiveCard className="admin-traffic-card" label="Traffic and application activity chart" onOpen={() => {
          const busiest = chartData.reduce<(typeof chartData)[number] | null>((current, point) => !current || point.requests > current.requests ? point : current, null);
          showDetail(
            "Traffic and application activity",
            "Hourly or daily totals for requests, page views, and new accounts.",
            [
              { label: "Worker requests", value: formatCount(summary?.requests ?? 0) },
              { label: "Page views", value: formatCount(summary?.pageViews ?? 0) },
              { label: "New accounts", value: formatCount(summary?.newUsers ?? 0) },
              { label: "Busiest interval", value: busiest && busiest.requests ? `${busiest.label} · ${formatCount(busiest.requests)} requests` : "No requests recorded" },
            ],
            "The chart uses hourly buckets for 24 hours and daily buckets for 7 or 30 days. Click a chart point to inspect that interval.",
          );
        }}>
          <PanelHeading title="Traffic and application activity" detail="Requests, page views, and newly registered accounts" action={<Badge className="admin-live-badge"><span />LIVE</Badge>} />
          {chartData.some((point) => point.requests || point.pageViews || point.newUsers)
            ? <div className="admin-chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={chartData} onClick={(chartState, event) => {
              const index = chartState.activeTooltipIndex;
              if (typeof index !== "number") return;
              const point = chartData[index];
              if (!point) return;
              event.stopPropagation();
              showDetail(
                `Traffic interval · ${point.label}`,
                "Requests, page views, and new accounts recorded in this chart interval.",
                [
                  { label: "Worker requests", value: formatCount(point.requests) },
                  { label: "Page views", value: formatCount(point.pageViews) },
                  { label: "Error responses", value: formatCount(point.errors) },
                  { label: "Average response", value: `${point.averageResponseMs} ms` },
                  { label: "New accounts", value: formatCount(point.newUsers) },
                ],
                "This interval is one hour for the 24 hour view and one day for the 7 and 30 day views.",
              );
            }} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
              <defs><linearGradient id="adminRequestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45b8a7" stopOpacity={.32} /><stop offset="100%" stopColor="#45b8a7" stopOpacity={.02} /></linearGradient></defs>
              <CartesianGrid stroke="#496672" strokeOpacity={.28} vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#c1d0d5", fontSize: 13 }} minTickGap={22} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#c1d0d5", fontSize: 13 }} allowDecimals={false} />
              <Tooltip contentStyle={{ border: "1px solid #3a5b68", borderRadius: 9, background: "#0e2632", color: "#edf5f7", fontSize: 14 }} />
              <Area type="monotone" dataKey="requests" name="Worker requests" stroke="#55cbb6" fill="url(#adminRequestFill)" strokeWidth={2.3} />
              <Line type="monotone" dataKey="pageViews" name="Page views" stroke="#78aef5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="newUsers" name="New accounts" stroke="#f1bd67" strokeWidth={2} dot={false} />
            </AreaChart></ResponsiveContainer></div>
            : <EmptyPanel>No traffic has been recorded in this window yet.</EmptyPanel>}
          <div className="admin-chart-legend"><span><i className="admin-legend-requests" />Worker requests</span><span><i className="admin-legend-views" />Page views</span><span><i className="admin-legend-users" />New accounts</span></div>
        </InteractiveCard>

        <InteractiveCard className="admin-performance-card" label="Performance and users details" onOpen={() => showDetail(
          "Performance and users",
          "Summary of request health and account activity in the selected window.",
          [
            { label: "Error responses", value: formatCount(summary?.errors ?? 0) },
            { label: "Peak response time", value: `${summary?.maxResponseMs ?? 0} ms` },
            { label: "New accounts", value: formatCount(summary?.newUsers ?? 0) },
            { label: "Unique signed-in users", value: formatCount(summary?.uniqueUsers ?? 0) },
            { label: "Registered accounts", value: formatCount(summary?.totalUsers ?? 0) },
          ],
          "This panel combines application response health with privacy-preserving account-level activity totals.",
        )}>
          <PanelHeading title="Performance and users" detail="Current totals for this window" />
          <div className="admin-performance-list">
            <button className="admin-performance-row" type="button" onClick={(event) => { event.stopPropagation(); showDetail("Error responses", "HTTP responses with a 4xx or 5xx status during the selected window.", [{ label: "Error responses", value: formatCount(summary?.errors ?? 0) }, { label: "Share of requests", value: `${summary?.errorRate ?? 0}%` }], "The response code breakdown below shows how these errors divide between client and server errors."); }}><span className="admin-performance-icon admin-performance-red"><AlertTriangle size={15} /></span><span><strong>Error responses</strong><small>HTTP 4xx and 5xx</small></span><b>{formatCount(summary?.errors ?? 0)}</b></button>
            <button className="admin-performance-row" type="button" onClick={(event) => { event.stopPropagation(); showDetail("Peak response time", "The slowest measured application request in the selected window.", [{ label: "Peak response", value: `${summary?.maxResponseMs ?? 0} ms` }, { label: "Average response", value: `${summary?.averageResponseMs ?? 0} ms` }], "A single slow response may reflect temporary network or database load. Use the endpoint table to inspect slow route averages."); }}><span className="admin-performance-icon admin-performance-blue"><Clock3 size={15} /></span><span><strong>Peak response time</strong><small>Slowest application request</small></span><b>{summary?.maxResponseMs ?? 0} ms</b></button>
            <button className="admin-performance-row" type="button" onClick={(event) => { event.stopPropagation(); showDetail("New accounts", "Accounts created during the selected reporting window.", [{ label: "New accounts", value: formatCount(summary?.newUsers ?? 0) }, { label: "Registered accounts", value: formatCount(summary?.totalUsers ?? 0) }], "Account creation times are grouped into the same hourly or daily buckets shown in the activity chart."); }}><span className="admin-performance-icon admin-performance-green"><UserPlus size={15} /></span><span><strong>New accounts</strong><small>Created in this window</small></span><b>{formatCount(summary?.newUsers ?? 0)}</b></button>
            <button className="admin-performance-row" type="button" onClick={(event) => { event.stopPropagation(); showDetail("Unique signed-in users", "Distinct signed-in accounts that opened at least one page in this window.", [{ label: "Unique users", value: formatCount(summary?.uniqueUsers ?? 0) }, { label: "Active in last 5 minutes", value: formatCount(summary?.activeUsers ?? 0) }], "An account is counted once in the selected window, regardless of how many pages it opened."); }}><span className="admin-performance-icon admin-performance-purple"><Users size={15} /></span><span><strong>Unique signed-in users</strong><small>Seen during this window</small></span><b>{formatCount(summary?.uniqueUsers ?? 0)}</b></button>
            <button className="admin-performance-row" type="button" onClick={(event) => { event.stopPropagation(); showDetail("Registered accounts", "All accounts registered in the RoadLens user database.", [{ label: "Total accounts", value: formatCount(summary?.totalUsers ?? 0) }, { label: "New in this window", value: formatCount(summary?.newUsers ?? 0) }], "This total includes regular and administrator accounts."); }}><span className="admin-performance-icon admin-performance-teal"><Activity size={15} /></span><span><strong>Total accounts</strong><small>Registered accounts</small></span><b>{formatCount(summary?.totalUsers ?? 0)}</b></button>
          </div>
        </InteractiveCard>

        <InteractiveCard className="admin-routes-card" label="Most viewed pages" onOpen={() => showDetail(
          "Most viewed pages",
          "Routes ranked by client-side visits during the selected reporting window.",
          [
            { label: "Total page views", value: formatCount(summary?.pageViews ?? 0) },
            { label: "Routes with visits", value: formatCount(metrics.topPages.length) },
            { label: "Top route", value: metrics.topPages[0]?.path ?? "No page visits yet" },
          ],
          "Page views count route visits and do not identify or deduplicate anonymous visitors.",
        )}>
          <PanelHeading title="Most viewed pages" detail="Route views in the selected window" />
          {metrics.topPages.length ? <div className="admin-top-pages">{metrics.topPages.map((page, index) => {
            const width = Math.max(8, Math.round((page.views / Math.max(...metrics.topPages.map((item) => item.views), 1)) * 100));
            const share = summary?.pageViews ? Math.round(page.views / summary.pageViews * 1000) / 10 : 0;
            return <button className="admin-page-row" type="button" key={page.path} onClick={(event) => { event.stopPropagation(); showDetail(
              page.path,
              "Page traffic for this route in the selected reporting window.",
              [
                { label: "Page views", value: formatCount(page.views) },
                { label: "Share of all page views", value: `${share}%` },
                { label: "Rank", value: `${index + 1} of ${metrics.topPages.length}` },
              ],
              "A visit is counted when the route loads or changes in the RoadLens app.",
            ); }}><span className="admin-page-rank">{String(index + 1).padStart(2, "0")}</span><span className="admin-page-info"><strong>{page.path}</strong><span><i style={{ width: `${width}%` }} /></span></span><b>{formatCount(page.views)}</b></button>;
          })}</div> : <EmptyPanel>No page views recorded yet.</EmptyPanel>}
        </InteractiveCard>

        <InteractiveCard className="admin-endpoints-card" label="Endpoint response times" onOpen={() => showDetail(
          "Endpoint response times",
          "Routes ranked by average application request time for this reporting window.",
          [
            { label: "Slow routes listed", value: formatCount(metrics.slowRoutes.length) },
            { label: "Slowest average", value: metrics.slowRoutes[0] ? `${metrics.slowRoutes[0].averageResponseMs} ms · ${metrics.slowRoutes[0].route}` : "No routes recorded" },
            { label: "Total requests", value: formatCount(metrics.slowRoutes.reduce((total, route) => total + route.requests, 0)) },
          ],
          "The list shows up to eight routes with the highest average response time. Asset file names are grouped by type.",
        )}>
          <PanelHeading title="Endpoint response times" detail="Routes with the highest average response time" />
          {metrics.slowRoutes.length ? <div className="admin-table-scroll"><table className="admin-endpoints-table">
            <thead><tr><th scope="col">ROUTE</th><th scope="col">REQUESTS</th><th scope="col">AVG</th><th scope="col">PEAK</th><th scope="col">ERRORS</th></tr></thead>
            <tbody>{metrics.slowRoutes.map((route) => {
              const errorRate = route.requests ? Math.round(route.errors / route.requests * 1000) / 10 : 0;
              return <tr key={route.route} className="admin-endpoint-row"><td><button className="admin-route-button" type="button" onClick={(event) => { event.stopPropagation(); showDetail(
                route.route,
                "Request performance and errors for this route.",
                [
                  { label: "Requests", value: formatCount(route.requests) },
                  { label: "Average response", value: `${route.averageResponseMs} ms` },
                  { label: "Peak response", value: `${route.maxResponseMs} ms` },
                  { label: "Error responses", value: formatCount(route.errors) },
                  { label: "Error rate", value: `${errorRate}%` },
                ],
                "Route averages include the full request handling time measured by the application.",
              ); }}><code>{route.route}</code></button></td><td>{formatCount(route.requests)}</td><td>{route.averageResponseMs} ms</td><td>{route.maxResponseMs} ms</td><td className={route.errors ? "admin-errors-present" : ""}>{formatCount(route.errors)}</td></tr>;
            })}</tbody>
          </table></div> : <EmptyPanel>No endpoint requests recorded yet.</EmptyPanel>}
        </InteractiveCard>

        <InteractiveCard className="admin-status-codes-card" label="HTTP response codes" onOpen={() => {
          const total = metrics.statusCodes.reduce((count, status) => count + status.requests, 0);
          const errors = metrics.statusCodes.filter((status) => status.status >= 400).reduce((count, status) => count + status.requests, 0);
          showDetail(
            "HTTP response codes",
            "Distribution of HTTP outcomes returned by RoadLens during this window.",
            [
              { label: "All responses", value: formatCount(total) },
              { label: "Successful responses", value: formatCount(total - errors) },
              { label: "4xx and 5xx errors", value: formatCount(errors) },
              { label: "Error share", value: `${total ? Math.round(errors / total * 1000) / 10 : 0}%` },
            ],
            "HTTP codes are grouped by exact status code. Responses in the 4xx and 5xx ranges count toward the error rate.",
          );
        }}>
          <PanelHeading title="HTTP response codes" detail="Share of requests by status" />
          {metrics.statusCodes.length ? <div className="admin-status-code-list">{metrics.statusCodes.map((item) => {
            const total = metrics.statusCodes.reduce((count, status) => count + status.requests, 0);
            const percent = total ? Math.round((item.requests / total) * 100) : 0;
            const category = item.status >= 500 ? "server" : item.status >= 400 ? "client" : item.status >= 300 ? "redirect" : "success";
            const categoryLabel = category === "server" ? "Server error" : category === "client" ? "Client error" : category === "redirect" ? "Redirect" : "Successful response";
            return <button className="admin-status-code-row" type="button" key={item.status} onClick={(event) => { event.stopPropagation(); showDetail(
              `HTTP ${item.status}`,
              `${categoryLabel} responses recorded in this reporting window.`,
              [
                { label: "Response count", value: formatCount(item.requests) },
                { label: "Share of responses", value: `${percent}%` },
                { label: "Response category", value: categoryLabel },
              ],
              item.status >= 400 ? "These responses are included in the dashboard error rate." : "This response code does not count as an error in the dashboard.",
            ); }}>
              <strong className={`admin-status-code admin-code-${category}`}>{item.status}</strong>
              <span className="admin-status-code-track"><i className={`admin-code-fill-${category}`} style={{ width: `${percent}%` }} /></span>
              <b>{formatCount(item.requests)}</b>
              <small>{percent}%</small>
            </button>;
          })}</div> : <EmptyPanel>No responses recorded yet.</EmptyPanel>}
        </InteractiveCard>
      </div>
      <div className="admin-footnote"><span>Metrics are grouped by minute and retained for 90 days.</span><span>Signed-in activity is grouped by account and minute; IP addresses and request-level histories are not stored.</span><span>Active users are signed-in accounts seen in the past 5 minutes.</span><span>Response times measure application request handling; external analytics API time is not included.</span></div>
    </>}

    {selectedDetail && <div className="admin-detail-backdrop" role="presentation" onClick={(event) => {
      if (event.target === event.currentTarget) setSelectedDetail(null);
    }}>
      <section className="admin-detail-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-detail-title" aria-describedby="admin-detail-description" onClick={(event) => event.stopPropagation()}>
        <div className="admin-detail-dialog-top"><span>ROADLENS · ADMIN DETAILS</span><button ref={closePopupRef} type="button" className="admin-detail-close" aria-label="Close details" onClick={() => setSelectedDetail(null)}><X size={16} /></button></div>
        <h2 id="admin-detail-title">{selectedDetail.title}</h2>
        <p id="admin-detail-description">{selectedDetail.description}</p>
        <dl className="admin-detail-values">{selectedDetail.entries.map((entry) => <div key={`${entry.label}-${entry.value}`}><dt>{entry.label}</dt><dd>{entry.value}</dd></div>)}</dl>
        <div className="admin-detail-note">{selectedDetail.note}</div>
      </section>
    </div>}
  </div>;
}
