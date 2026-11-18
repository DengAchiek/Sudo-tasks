import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, AlertTriangle, Clock3, Eye, Gauge, RefreshCw, Users, UserPlus } from "lucide-react";
import { loadAdminMetrics } from "../api/admin";
import { Badge, Button, Card, ErrorState, LoadingState, PanelHeading } from "../components/ui";
import type { AdminMetrics, AdminRange } from "../types/analytics";

const ranges: Array<{ value: AdminRange; label: string }> = [
  { value: "24h", label: "24 hours" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatTimelineLabel(timestamp: number, range: AdminRange) {
  const date = new Date(timestamp * 1000);
  return range === "24h"
    ? date.toLocaleTimeString([], { hour: "numeric" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function SummaryCard({ title, value, detail, icon: Icon, tone }: { title: string; value: string; detail: string; icon: typeof Activity; tone: string }) {
  return <Card className={`admin-summary-card ${tone}`}>
    <div className="admin-summary-top"><span>{title}</span><i><Icon size={16} /></i></div>
    <strong>{value}</strong>
    <small>{detail}</small>
  </Card>;
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

  const chartData = (metrics?.timeline ?? []).map((point) => ({
    ...point,
    label: formatTimelineLabel(point.timestamp, range),
  }));
  const summary = metrics?.summary;

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
      <div className="admin-status-strip">
        <span className="admin-status-light" />
        <strong>Live monitoring</strong>
        <span>Minute-level aggregates · no IP addresses or request-level histories are stored</span>
        <small>UPDATED {new Date(metrics.generatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</small>
      </div>

      <div className="admin-summary-grid">
        <SummaryCard title="Worker requests" value={formatCount(summary?.requests ?? 0)} detail="Across the selected window" icon={Activity} tone="admin-tone-blue" />
        <SummaryCard title="Page views" value={formatCount(summary?.pageViews ?? 0)} detail="Client-side route visits" icon={Eye} tone="admin-tone-teal" />
        <SummaryCard title="Active users" value={formatCount(summary?.activeUsers ?? 0)} detail="Signed in and seen in 5 minutes" icon={Users} tone="admin-tone-purple" />
        <SummaryCard title="Average response" value={`${summary?.averageResponseMs ?? 0} ms`} detail={`${summary?.errorRate ?? 0}% requests returned an error`} icon={Gauge} tone="admin-tone-amber" />
      </div>

      <div className="admin-chart-grid">
        <Card className="admin-traffic-card">
          <PanelHeading title="Traffic and application activity" detail="Requests, page views, and newly registered accounts" action={<Badge className="admin-live-badge"><span />LIVE</Badge>} />
          {chartData.some((point) => point.requests || point.pageViews || point.newUsers)
            ? <div className="admin-chart-area"><ResponsiveContainer width="100%" height="100%"><AreaChart accessibilityLayer data={chartData} margin={{ top: 12, right: 16, left: -18, bottom: 0 }}>
              <defs><linearGradient id="adminRequestFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#45b8a7" stopOpacity={.32} /><stop offset="100%" stopColor="#45b8a7" stopOpacity={.02} /></linearGradient></defs>
              <CartesianGrid stroke="#496672" strokeOpacity={.28} vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#c1d0d5", fontSize: 10 }} minTickGap={22} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#c1d0d5", fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ border: "1px solid #3a5b68", borderRadius: 9, background: "#0e2632", color: "#edf5f7", fontSize: 11 }} />
              <Area type="monotone" dataKey="requests" name="Worker requests" stroke="#55cbb6" fill="url(#adminRequestFill)" strokeWidth={2.3} />
              <Line type="monotone" dataKey="pageViews" name="Page views" stroke="#78aef5" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="newUsers" name="New accounts" stroke="#f1bd67" strokeWidth={2} dot={false} />
            </AreaChart></ResponsiveContainer></div>
            : <EmptyPanel>No traffic has been recorded in this window yet.</EmptyPanel>}
          <div className="admin-chart-legend"><span><i className="admin-legend-requests" />Worker requests</span><span><i className="admin-legend-views" />Page views</span><span><i className="admin-legend-users" />New accounts</span></div>
        </Card>

        <Card className="admin-performance-card">
          <PanelHeading title="Performance and users" detail="Current totals for this window" />
          <div className="admin-performance-list">
            <div><span className="admin-performance-icon admin-performance-red"><AlertTriangle size={15} /></span><span><strong>Error responses</strong><small>HTTP 4xx and 5xx</small></span><b>{formatCount(summary?.errors ?? 0)}</b></div>
            <div><span className="admin-performance-icon admin-performance-blue"><Clock3 size={15} /></span><span><strong>Peak response time</strong><small>Slowest Worker request</small></span><b>{summary?.maxResponseMs ?? 0} ms</b></div>
            <div><span className="admin-performance-icon admin-performance-green"><UserPlus size={15} /></span><span><strong>New accounts</strong><small>Created in this window</small></span><b>{formatCount(summary?.newUsers ?? 0)}</b></div>
            <div><span className="admin-performance-icon admin-performance-purple"><Users size={15} /></span><span><strong>Unique signed-in users</strong><small>Seen during this window</small></span><b>{formatCount(summary?.uniqueUsers ?? 0)}</b></div>
            <div><span className="admin-performance-icon admin-performance-teal"><Activity size={15} /></span><span><strong>Total accounts</strong><small>Registered accounts</small></span><b>{formatCount(summary?.totalUsers ?? 0)}</b></div>
          </div>
        </Card>

        <Card className="admin-routes-card">
          <PanelHeading title="Most viewed pages" detail="Route views in the selected window" />
          {metrics.topPages.length ? <div className="admin-top-pages">{metrics.topPages.map((page, index) => {
            const width = Math.max(8, Math.round((page.views / Math.max(...metrics.topPages.map((item) => item.views), 1)) * 100));
            return <div className="admin-page-row" key={page.path}><span className="admin-page-rank">{String(index + 1).padStart(2, "0")}</span><div className="admin-page-info"><strong>{page.path}</strong><div><i style={{ width: `${width}%` }} /></div></div><b>{formatCount(page.views)}</b></div>;
          })}</div> : <EmptyPanel>No page views recorded yet.</EmptyPanel>}
        </Card>

        <Card className="admin-endpoints-card">
          <PanelHeading title="Endpoint response times" detail="Routes with the highest average response time" />
          {metrics.slowRoutes.length ? <div className="admin-table-scroll"><table className="admin-endpoints-table">
            <thead><tr><th scope="col">ROUTE</th><th scope="col">REQUESTS</th><th scope="col">AVG</th><th scope="col">PEAK</th><th scope="col">ERRORS</th></tr></thead>
            <tbody>{metrics.slowRoutes.map((route) => <tr key={route.route}><td><code>{route.route}</code></td><td>{formatCount(route.requests)}</td><td>{route.averageResponseMs} ms</td><td>{route.maxResponseMs} ms</td><td className={route.errors ? "admin-errors-present" : ""}>{formatCount(route.errors)}</td></tr>)}</tbody>
          </table></div> : <EmptyPanel>No endpoint requests recorded yet.</EmptyPanel>}
        </Card>

        <Card className="admin-status-codes-card">
          <PanelHeading title="HTTP response codes" detail="Share of requests by status" />
          {metrics.statusCodes.length ? <div className="admin-status-code-list">{metrics.statusCodes.map((item) => {
            const total = metrics.statusCodes.reduce((count, status) => count + status.requests, 0);
            const percent = total ? Math.round((item.requests / total) * 100) : 0;
            const category = item.status >= 500 ? "server" : item.status >= 400 ? "client" : item.status >= 300 ? "redirect" : "success";
            return <div className="admin-status-code-row" key={item.status}>
              <strong className={`admin-status-code admin-code-${category}`}>{item.status}</strong>
              <div className="admin-status-code-track"><i className={`admin-code-fill-${category}`} style={{ width: `${percent}%` }} /></div>
              <b>{formatCount(item.requests)}</b>
              <small>{percent}%</small>
            </div>;
          })}</div> : <EmptyPanel>No responses recorded yet.</EmptyPanel>}
        </Card>
      </div>
      <div className="admin-footnote"><span>Metrics are grouped by minute and retained for 90 days.</span><span>Signed-in activity is grouped by account and minute; IP addresses and request-level histories are not stored.</span><span>Active users are signed-in accounts seen in the past 5 minutes.</span><span>Response times measure application request handling; external analytics API time is not included.</span></div>
    </>}
  </div>;
}
