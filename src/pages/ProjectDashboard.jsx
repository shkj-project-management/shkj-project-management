import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import KpiCard from "@/components/KpiCard";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import {
  Activity, DollarSign, AlertCircle, Loader2, TrendingUp, ShieldAlert,
  FolderKanban, BarChart3,
} from "lucide-react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
          <span style={{ color: p.color || p.stroke || p.fill }}>●</span> {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}%
        </p>
      ))}
    </div>
  );
}

function calculateSCurve(items, totalDays) {
  if (!items.length || totalDays <= 0) return [];
  const interval = 7;
  const numWeeks = Math.ceil(totalDays / interval);
  const dailyPlanned = new Array(totalDays).fill(0);
  items.forEach((item) => {
    const start = Math.max(0, (item.start_day || 1) - 1);
    const dur = Math.max(1, item.durasi_hari || 1);
    const bobot = item.bobot || 0;
    const dailyRate = bobot / dur;
    for (let d = start; d < Math.min(start + dur, totalDays); d++) {
      dailyPlanned[d] += dailyRate;
    }
  });
  const data = [];
  let cumulative = 0;
  for (let w = 0; w < numWeeks; w++) {
    const ws = w * interval;
    const we = Math.min(ws + interval, totalDays);
    let weeklyProgress = 0;
    for (let d = ws; d < we; d++) weeklyProgress += dailyPlanned[d] || 0;
    cumulative += weeklyProgress;
    data.push({ week: `W${w + 1}`, planned: Number(Math.min(100, cumulative).toFixed(2)) });
  }
  return data;
}

export default function ProjectDashboard() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [project, setProject] = useState(null);
  const [boqItems, setBoqItems] = useState([]);
  const [issues, setIssues] = useState([]);
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Project.list("-created_date", 200)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProject) return;
    setLoading(true);
    try {
      const [proj, items, issueList, riskList] = await Promise.all([
        base44.entities.Project.get(selectedProject).catch(() => null),
        base44.entities.BOQItem.filter({ project_id: selectedProject }, "no", 500).catch(() => []),
        base44.entities.IssueLog.list("-created_date", 5).catch(() => []),
        base44.entities.RiskRegister.list("-created_date", 5).catch(() => []),
      ]);
      setProject(proj);
      setBoqItems(items);
      setIssues(issueList);
      setRisks(riskList);
    } catch {} finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadData(); }, [loadData]);

  // Calculations
  const totalDays = project?.durasi_hari || Math.max(30, ...boqItems.map(i => (i.start_day || 1) + (i.durasi_hari || 1) - 1));
  const curveData = calculateSCurve(boqItems, totalDays);

  const progressFisik = boqItems.reduce((sum, item) => sum + (item.bobot || 0) * (item.progress_percent || 0) / 100, 0);
  const nilaiKontrak = project?.budget || 0;
  const nilaiSelesai = boqItems.reduce((sum, item) => sum + (item.total_harga || 0) * (item.progress_percent || 0) / 100, 0);
  const totalBobot = boqItems.reduce((s, i) => s + (i.bobot || 0), 0);
  const progressKeuangan = nilaiKontrak > 0 ? (project?.spent || 0) / nilaiKontrak * 100 : 0;

  const currentPlanned = (() => {
    const today = new Date();
    const startDate = project?.start_date ? new Date(project.start_date) : null;
    if (!startDate) return curveData[curveData.length - 1]?.planned || 0;
    const elapsedDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
    const periodIdx = Math.floor(elapsedDays / 7);
    return curveData[Math.min(periodIdx, curveData.length - 1)]?.planned || 0;
  })();
  const deviation = Number((progressFisik - currentPlanned).toFixed(2));

  // Progress by area
  const areaProgress = (() => {
    const areas = {};
    boqItems.forEach((item) => {
      const area = item.area || "Lainnya";
      if (!areas[area]) areas[area] = { bobot: 0, progress: 0 };
      areas[area].bobot += item.bobot || 0;
      areas[area].progress += (item.bobot || 0) * (item.progress_percent || 0) / 100;
    });
    return Object.entries(areas).map(([name, data]) => ({
      name: name.slice(0, 12),
      progress: data.bobot > 0 ? Number((data.progress / data.bobot * 100).toFixed(2)) : 0,
    }));
  })();

  // Progress by kelompok
  const kelompokProgress = (() => {
    const groups = {};
    boqItems.forEach((item) => {
      const g = item.kelompok || "Lainnya";
      if (!groups[g]) groups[g] = { bobot: 0, progress: 0 };
      groups[g].bobot += item.bobot || 0;
      groups[g].progress += (item.bobot || 0) * (item.progress_percent || 0) / 100;
    });
    return Object.entries(groups).map(([name, data]) => ({
      name: name.slice(0, 12),
      progress: data.bobot > 0 ? Number((data.progress / data.bobot * 100).toFixed(2)) : 0,
    }));
  })();

  if (loading && selectedProject) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Project Dashboard" subtitle="Monitoring progres proyek konstruksi real-time" icon={BarChart3} />

      {/* Project selector */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-2 block">Pilih Proyek</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
          {project && (
            <div className="flex gap-4 text-sm">
              <div><span className="text-muted-foreground">Owner: </span><span className="font-medium">{project.owner || "—"}</span></div>
              <div><span className="text-muted-foreground">Kontraktor: </span><span className="font-medium">{project.kontraktor || "—"}</span></div>
              <div><span className="text-muted-foreground">PM: </span><span className="font-medium">{project.manager || "—"}</span></div>
            </div>
          )}
        </div>
      </GlassCard>

      {!selectedProject || !boqItems.length ? (
        <GlassCard className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {selectedProject ? "Belum ada data BOQ untuk proyek ini. Upload BOQ terlebih dahulu." : "Pilih proyek untuk melihat dashboard."}
          </p>
        </GlassCard>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Activity} label="Progress Fisik" value={`${progressFisik.toFixed(2)}%`} trend={deviation >= 0 ? 1 : -1} trendLabel={`deviasi ${deviation >= 0 ? "+" : ""}${deviation.toFixed(1)}%`} />
            <KpiCard icon={DollarSign} label="Progress Keuangan" value={`${progressKeuangan.toFixed(2)}%`} trend={2} color="green" trendLabel="dari nilai kontrak" />
            <KpiCard icon={TrendingUp} label="Planned Progress" value={`${currentPlanned.toFixed(2)}%`} trend={0} color="orange" trendLabel="sesuai jadwal" />
            <KpiCard icon={AlertCircle} label="Deviasi" value={`${deviation >= 0 ? "+" : ""}${deviation.toFixed(2)}%`} trend={deviation >= 0 ? 1 : -1} color="purple" trendLabel={deviation >= 0 ? "ahead of schedule" : "behind schedule"} />
          </div>

          {/* S-Curve */}
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Kurva S — Planned vs Actual</h3>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={curveData}>
                <defs>
                  <linearGradient id="colorPlannedDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199 89% 52%)" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(199 89% 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                <XAxis dataKey="week" stroke="hsl(215 20% 65%)" fontSize={11} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="planned" name="Planned" stroke="hsl(199 89% 52%)" strokeWidth={2} fill="url(#colorPlannedDash)" />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Progress by Area & Kelompok */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-4">Progress per Area</h3>
              {areaProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={areaProgress} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(215 20% 65%)" fontSize={11} unit="%" />
                    <YAxis type="category" dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} width={80} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="progress" name="Progress" radius={[0, 6, 6, 0]} fill="hsl(199 89% 52%)" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No data</div>}
            </GlassCard>
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-4">Progress per Kelompok</h3>
              {kelompokProgress.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <ComposedChart data={kelompokProgress} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                    <XAxis type="number" domain={[0, 100]} stroke="hsl(215 20% 65%)" fontSize={11} unit="%" />
                    <YAxis type="category" dataKey="name" stroke="hsl(215 20% 65%)" fontSize={11} width={80} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(199 89% 52% / 0.05)" }} />
                    <Bar dataKey="progress" name="Progress" radius={[0, 6, 6, 0]} fill="hsl(142 71% 45%)" />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">No data</div>}
            </GlassCard>
          </div>

          {/* Issues & Risks */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Recent Issues</h3>
              </div>
              <div className="space-y-2">
                {issues.length > 0 ? issues.map((issue) => (
                  <div key={issue.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20">
                    <AlertCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{issue.title}</p>
                      <p className="text-xs text-muted-foreground">{issue.category} • {issue.severity}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{issue.status}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No issues</p>}
              </div>
            </GlassCard>
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Recent Risks</h3>
              </div>
              <div className="space-y-2">
                {risks.length > 0 ? risks.map((risk) => (
                  <div key={risk.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20">
                    <ShieldAlert className="w-3.5 h-3.5 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{risk.title}</p>
                      <p className="text-xs text-muted-foreground">{risk.category} • {risk.risk_level}</p>
                    </div>
                    <span className="text-xs text-muted-foreground">{risk.status}</span>
                  </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No risks</p>}
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}