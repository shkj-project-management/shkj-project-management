import React, { useState, useEffect } from "react";
import { base44 } from "@/api/appClient";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import { BarChart3, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { exportToCSV } from "@/lib/export";

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

const REPORT_TABS = [
  "Executive", "Project Progress", "Budget Analysis", "Issues & Risks", "Vendor Performance",
];

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ projects: [], issues: [], risks: [], vendors: [] });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [projects, issues, risks, vendors] = await Promise.all([
        base44.entities.Project.list("-created_date", 200).catch(() => []),
        base44.entities.IssueLog.list("-created_date", 200).catch(() => []),
        base44.entities.RiskRegister.list("-created_date", 200).catch(() => []),
        base44.entities.Vendor.list("-created_date", 200).catch(() => []),
      ]);
      setData({ projects, issues, risks, vendors });
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

  // Summary KPIs
  const totalBudget = data.projects.reduce((s, p) => s + (p.budget || 0), 0);
  const totalSpent = data.projects.reduce((s, p) => s + (p.spent || 0), 0);
  const activeProjects = data.projects.filter((p) => p.status === "Active").length;
  const openIssues = data.issues.filter((i) => i.status === "Open" || i.status === "In Progress").length;
  const criticalRisks = data.risks.filter((r) => r.risk_level === "Critical").length;

  const summaryStats = [
    { label: "Total Projects", value: data.projects.length },
    { label: "Active Projects", value: activeProjects },
    { label: "Total Budget", value: `Rp ${totalBudget.toLocaleString("id-ID")}` },
    { label: "Total Spent", value: `Rp ${totalSpent.toLocaleString("id-ID")}` },
    { label: "Open Issues", value: openIssues },
    { label: "Critical Risks", value: criticalRisks },
    { label: "Total Vendors", value: data.vendors.length },
    { label: "Budget Utilization", value: `${totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%` },
  ];

  // Project progress data
  const progressData = data.projects.map((p) => ({
    name: p.code || (p.name || "").slice(0, 12),
    progress: p.progress || 0,
  }));

  // Budget vs spent by project
  const budgetData = data.projects.slice(0, 8).map((p) => ({
    name: p.code || (p.name || "").slice(0, 12),
    budget: p.budget || 0,
    spent: p.spent || 0,
  }));

  // Project status distribution
  const projectStatusData = (() => {
    const statuses = {};
    data.projects.forEach((p) => {
      const s = p.status || "Unknown";
      statuses[s] = (statuses[s] || 0) + 1;
    });
    return Object.entries(statuses).map(([name, value]) => ({ name, value }));
  })();

  // Issues by severity
  const issueSeverity = {};
  data.issues.forEach((i) => {
    const s = i.severity || "Unknown";
    issueSeverity[s] = (issueSeverity[s] || 0) + 1;
  });
  const issueData = Object.entries(issueSeverity).map(([name, value]) => ({ name, value }));

  // Risks by level
  const riskLevels = {};
  data.risks.forEach((r) => {
    const l = r.risk_level || "Unknown";
    riskLevels[l] = (riskLevels[l] || 0) + 1;
  });
  const riskData = Object.entries(riskLevels).map(([name, value]) => ({ name, value }));

  // Vendor by category
  const vendorCats = {};
  data.vendors.forEach((v) => {
    const c = v.category || "Other";
    vendorCats[c] = (vendorCats[c] || 0) + 1;
  });
  const vendorData = Object.entries(vendorCats).map(([name, value]) => ({ name, value }));

  // Vendor contract values
  const vendorContracts = data.vendors.slice(0, 8).map((v) => ({
    name: (v.name || "").slice(0, 15),
    value: v.contract_value || 0,
  }));

  const handleExportSummary = () => {
    exportToCSV("executive-summary.csv",
      [{ key: "label", label: "Metric" }, { key: "value", label: "Value" }],
      summaryStats
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Construction project analytics and performance dashboards" icon={BarChart3}>
        <Button variant="outline" size="sm" onClick={handleExportSummary} className="gap-2">
          <Download className="w-4 h-4" /> Export Summary
        </Button>
      </PageHeader>

      <Tabs defaultValue="Executive" className="space-y-4">
        <TabsList className="glass-strong p-1 flex flex-wrap h-auto">
          {REPORT_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} className="text-xs data-[state=active]:bg-primary/20 data-[state=active]:text-primary">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Executive */}
        <TabsContent value="Executive" className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {summaryStats.map((stat, i) => (
              <GlassCard key={i} className="text-center">
                <p className="text-2xl font-bold text-primary">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </GlassCard>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Budget vs Spent by Project</h3>
              {budgetData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="budget" fill="hsl(199 89% 52%)" radius={[6, 6, 0, 0]} name="Budget" />
                    <Bar dataKey="spent" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Project Status Distribution</h3>
              {projectStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={projectStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {projectStatusData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
          </div>
        </TabsContent>

        {/* Project Progress */}
        <TabsContent value="Project Progress">
          <GlassCard>
            <h3 className="text-sm font-semibold mb-4">Project Progress (%)</h3>
            {progressData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={progressData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(215 20% 65%)" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="hsl(215 20% 65%)" fontSize={12} width={100} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                  <Bar dataKey="progress" radius={[0, 6, 6, 0]}>
                    {progressData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
          </GlassCard>
        </TabsContent>

        {/* Budget Analysis */}
        <TabsContent value="Budget Analysis">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Budget Allocation by Project</h3>
              {budgetData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="budget" fill="hsl(199 89% 52%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Spending by Project</h3>
              {budgetData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={budgetData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="spent" fill="hsl(38 92% 50%)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
          </div>
        </TabsContent>

        {/* Issues & Risks */}
        <TabsContent value="Issues & Risks">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Issues by Severity</h3>
              {issueData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={issueData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={100} paddingAngle={3}>
                      {issueData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Risks by Level</h3>
              {riskData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={riskData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis dataKey="name" stroke="hsl(215 20% 65%)" fontSize={12} />
                    <YAxis stroke="hsl(215 20% 65%)" fontSize={12} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {riskData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
          </div>
        </TabsContent>

        {/* Vendor Performance */}
        <TabsContent value="Vendor Performance">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Vendors by Category</h3>
              {vendorData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={vendorData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                      {vendorData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
            <GlassCard>
              <h3 className="text-sm font-semibold mb-4">Contract Values by Vendor</h3>
              {vendorContracts.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={vendorContracts} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis type="number" stroke="hsl(215 20% 65%)" fontSize={12} />
                    <YAxis type="category" dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} width={120} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {vendorContracts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No data</div>}
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
