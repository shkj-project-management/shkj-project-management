import React, { useState, useEffect } from "react";
import { base44 } from "@/api/appClient";
import KpiCard from "@/components/KpiCard";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import { FolderKanban, DollarSign, AlertCircle, ShieldAlert, Loader2, Activity, TrendingUp } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import moment from "moment";

const CHART_COLORS = ["hsl(199 89% 52%)", "hsl(142 71% 45%)", "hsl(38 92% 50%)", "hsl(280 65% 60%)", "hsl(340 75% 55%)"];

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="text-foreground font-medium">
          <span style={{ color: p.color || p.fill }}>●</span> {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ activeProjects: 0, totalBudget: 0, openIssues: 0, criticalRisks: 0 });
  const [budgetVsSpent, setBudgetVsSpent] = useState([]);
  const [projectStatus, setProjectStatus] = useState([]);
  const [issuesBySeverity, setIssuesBySeverity] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projects, issues, risks] = await Promise.all([
        base44.entities.Project.list("-created_date", 200).catch(() => []),
        base44.entities.IssueLog.list("-created_date", 200).catch(() => []),
        base44.entities.RiskRegister.list("-created_date", 200).catch(() => []),
      ]);

      const activeProjects = projects.filter((p) => p.status === "Active").length;
      const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
      const openIssues = issues.filter((i) => i.status === "Open" || i.status === "In Progress").length;
      const criticalRisks = risks.filter((r) => r.risk_level === "Critical").length;

      setKpis({ activeProjects, totalBudget, openIssues, criticalRisks });

      setBudgetVsSpent(
        projects.slice(0, 6).map((p) => ({
          name: p.code || (p.name || "").slice(0, 12),
          budget: p.budget || 0,
          spent: p.spent || 0,
        }))
      );

      const statuses = {};
      projects.forEach((p) => {
        const s = p.status || "Unknown";
        statuses[s] = (statuses[s] || 0) + 1;
      });
      setProjectStatus(Object.entries(statuses).map(([name, value]) => ({ name, value })));

      const severities = {};
      issues.forEach((i) => {
        const s = i.severity || "Unknown";
        severities[s] = (severities[s] || 0) + 1;
      });
      setIssuesBySeverity(Object.entries(severities).map(([name, value]) => ({ name, value })));

      setRecentIssues(issues.slice(0, 5));
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Hospital renovation project overview" icon={Activity} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={FolderKanban} label="Active Projects" value={kpis.activeProjects} trend={3} trendLabel="in progress" />
        <KpiCard icon={DollarSign} label="Total Budget" value={`Rp ${kpis.totalBudget.toLocaleString("id-ID")}`} trend={8} color="green" trendLabel="allocated" />
        <KpiCard icon={AlertCircle} label="Open Issues" value={kpis.openIssues} trend={5} color="orange" trendLabel="needs attention" />
        <KpiCard icon={ShieldAlert} label="Critical Risks" value={kpis.criticalRisks} trend={2} color="purple" trendLabel="high priority" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Budget vs Spent by Project</h3>
          </div>
          {budgetVsSpent.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={budgetVsSpent}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                <Bar dataKey="budget" fill="hsl(199 89% 52%)" radius={[6, 6, 0, 0]} name="Budget" />
                <Bar dataKey="spent" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No projects yet</div>
          )}
        </GlassCard>

        <GlassCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Project Status</h3>
          {projectStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={projectStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                  {projectStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
          <div className="flex flex-wrap gap-2 mt-2">
            {projectStatus.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                <span className="text-muted-foreground">{s.name} ({s.value})</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <GlassCard className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-foreground mb-4">Issues by Severity</h3>
          {issuesBySeverity.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={issuesBySeverity}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={12} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={12} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {issuesBySeverity.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground">No issues reported</div>
          )}
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Recent Issues</h3>
          </div>
          <div className="space-y-3">
            {recentIssues.length > 0 ? (
              recentIssues.map((issue) => (
                <div key={issue.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/20 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <AlertCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{issue.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{issue.category} • {issue.severity}</p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {issue.date_reported ? moment(issue.date_reported).format("MMM D") : "—"}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No issues reported</p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
