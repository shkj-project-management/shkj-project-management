import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import KpiCard from "@/components/KpiCard";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import {
  FolderKanban, DollarSign, AlertCircle, ShieldAlert, Loader2, Activity, TrendingUp,
  BarChart3, ListChecks, Camera, CalendarClock, ClipboardCheck,
} from "lucide-react";
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
          <span style={{ color: p.color || p.fill }}>●</span> {p.name}: {typeof p.value === "number" ? (p.name.includes("Rp") ? `Rp ${p.value.toLocaleString("id-ID")}` : p.value.toLocaleString()) : p.value}
        </p>
      ))}
    </div>
  );
}

const fmtCurrency = (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
const fmtNumber = (val) => Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 1 });

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({ activeProjects: 0, totalBudget: 0, openIssues: 0, criticalRisks: 0 });
  const [budgetVsSpent, setBudgetVsSpent] = useState([]);
  const [projectStatus, setProjectStatus] = useState([]);
  const [issuesBySeverity, setIssuesBySeverity] = useState([]);
  const [recentIssues, setRecentIssues] = useState([]);
  const [boqKpis, setBoqKpis] = useState({ totalBOQ: 0, completedValue: 0, physicalProgress: 0, totalItems: 0 });
  const [dailyProgressStats, setDailyProgressStats] = useState({ total: 0, approved: 0, weeklyEntries: 0, photoCount: 0 });
  const [projectProgress, setProjectProgress] = useState([]);
  const [boqCategoryData, setBoqCategoryData] = useState([]);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [projects, issues, risks] = await Promise.all([
        appClient.entities.Project.list("-created_date", 200).catch(() => []),
        appClient.entities.IssueLog.list("-created_date", 200).catch(() => []),
        appClient.entities.RiskRegister.list("-created_date", 200).catch(() => []),
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
      projects.forEach((p) => { const s = p.status || "Unknown"; statuses[s] = (statuses[s] || 0) + 1; });
      setProjectStatus(Object.entries(statuses).map(([name, value]) => ({ name, value })));

      const severities = {};
      issues.forEach((i) => { const s = i.severity || "Unknown"; severities[s] = (severities[s] || 0) + 1; });
      setIssuesBySeverity(Object.entries(severities).map(([name, value]) => ({ name, value })));

      setRecentIssues(issues.slice(0, 5));

      // Load BOQ & Progress KPIs from active projects
      const activeProjectIds = projects.filter((p) => p.status === "Active").map((p) => p.id);
      let totalBOQ = 0, totalCompleted = 0, totalItems = 0, totalPhysical = 0;
      let totalDaily = 0, totalApproved = 0, totalWeekly = 0, totalPhotos = 0;
      const progressData = [];

      for (const pid of activeProjectIds.slice(0, 10)) {
        try {
          const boqItems = await appClient.boq.getItems(pid);
          const dailyEntries = await appClient.dailyProgress.list(pid);
          const photos = await appClient.photoProgress.list(pid);
          const project = projects.find((p) => p.id === pid);

          const pTotalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
          const pCompleted = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
          const pPhysical = pTotalBOQ > 0 ? (pCompleted / pTotalBOQ * 100) : 0;

          totalBOQ += pTotalBOQ;
          totalCompleted += pCompleted;
          totalItems += boqItems.length;
          totalPhysical += pPhysical;
          totalDaily += dailyEntries.length;
          totalApproved += dailyEntries.filter((e) => e.approval_status === "Approved").length;
          totalWeekly += dailyEntries.filter((e) => {
            const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
            return e.created_date >= weekAgo;
          }).length;
          totalPhotos += photos.length;

          if (project && boqItems.length > 0) {
            progressData.push({
              name: project.code || project.name?.slice(0, 10) || "Project",
              physical: Math.round(pPhysical * 10) / 10,
              financial: Math.round(pPhysical * 10) / 10,
            });
          }

          if (boqCategoryData.length === 0 && boqItems.length > 0) {
            const categories = {};
            boqItems.forEach((item) => {
              const cat = item.work_category || item.kelompok || "Other";
              if (!categories[cat]) categories[cat] = 0;
              categories[cat] += Number(item.total_price || item.total_harga || 0);
            });
            setBoqCategoryData(Object.entries(categories).map(([name, value]) => ({ name, value })));
          }
        } catch { /* skip */ }
      }

      setBoqKpis({
        totalBOQ,
        completedValue: totalCompleted,
        physicalProgress: activeProjectIds.length > 0 ? totalPhysical / activeProjectIds.length : 0,
        totalItems,
      });

      setDailyProgressStats({ total: totalDaily, approved: totalApproved, weeklyEntries: totalWeekly, photoCount: totalPhotos });
      setProjectProgress(progressData);
    } catch { /* silent */ } finally { setLoading(false); }
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

      {/* BOQ & Progress KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={ListChecks} label="Total BOQ Items" value={boqKpis.totalItems} color="blue" />
        <KpiCard icon={DollarSign} label="Total BOQ Value" value={fmtCurrency(boqKpis.totalBOQ)} color="green" />
        <KpiCard icon={TrendingUp} label="Avg Physical Progress" value={`${fmtNumber(boqKpis.physicalProgress)}%`} color="blue" />
        <KpiCard icon={BarChart3} label="Completed Value" value={fmtCurrency(boqKpis.completedValue)} color="emerald" />
      </div>

      {/* Daily Progress & Photo KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={CalendarClock} label="Daily Entries" value={dailyProgressStats.total} color="blue" />
        <KpiCard icon={ClipboardCheck} label="Approved Entries" value={dailyProgressStats.approved} color="green" />
        <KpiCard icon={Activity} label="Weekly Activity" value={dailyProgressStats.weeklyEntries} color="orange" />
        <KpiCard icon={Camera} label="Progress Photos" value={dailyProgressStats.photoCount} color="purple" />
      </div>

      {/* Project Progress Chart */}
      {projectProgress.length > 0 && (
        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Project Progress</h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={projectProgress}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
              <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} />
              <YAxis stroke="hsl(215 20% 65%)" fontSize={12} unit="%" />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
              <Bar dataKey="physical" fill="hsl(199 89% 52%)" radius={[6, 6, 0, 0]} name="Physical Progress" />
              <Bar dataKey="financial" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} name="Financial Progress" />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

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
            <>
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
              <div className="flex flex-wrap gap-2 mt-2">
                {projectStatus.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name} ({s.value})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[260px] flex items-center justify-center text-sm text-muted-foreground">No data</div>
          )}
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
          {boqCategoryData.length > 0 ? (
            <>
              <h3 className="text-sm font-semibold text-foreground mb-4">BOQ by Category</h3>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={boqCategoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {boqCategoryData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 mt-2">
                {boqCategoryData.map((s, i) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground">{s.name} ({fmtCurrency(s.value)})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </GlassCard>
      </div>
    </div>
  );
}