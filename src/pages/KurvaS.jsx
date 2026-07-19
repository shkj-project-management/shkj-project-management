import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import { TrendingUp, Loader2 } from "lucide-react";
import {
  ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg px-3 py-2 text-xs">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-foreground font-medium">
          <span style={{ color: p.color || p.stroke || p.fill }}>●</span> {p.name}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}%
        </p>
      ))}
    </div>
  );
}

function calculateSCurve(items, totalDays, grouping) {
  if (!items.length || totalDays <= 0) return [];
  const interval = grouping === "weekly" ? 7 : 30;
  const numPeriods = Math.ceil(totalDays / interval);
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
  for (let p = 0; p < numPeriods; p++) {
    const ps = p * interval;
    const pe = Math.min(ps + interval, totalDays);
    let periodProgress = 0;
    for (let d = ps; d < pe; d++) periodProgress += dailyPlanned[d] || 0;
    cumulative += periodProgress;
    data.push({
      period: grouping === "weekly" ? `W${p + 1}` : `M${p + 1}`,
      daily: Number(periodProgress.toFixed(2)),
      planned: Number(Math.min(100, cumulative).toFixed(2)),
    });
  }
  return data;
}

export default function KurvaS() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [boqItems, setBoqItems] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [grouping, setGrouping] = useState("weekly");

  useEffect(() => {
    base44.entities.Project.list("-created_date", 200)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
      })
      .catch(() => {});
  }, []);

  const loadData = useCallback(async () => {
    if (!selectedProject) { setBoqItems([]); setProject(null); return; }
    setLoading(true);
    try {
      const [proj, items] = await Promise.all([
        base44.entities.Project.get(selectedProject).catch(() => null),
        base44.entities.BOQItem.filter({ project_id: selectedProject }, "no", 500).catch(() => []),
      ]);
      setProject(proj);
      setBoqItems(items);
    } catch {} finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalDays = project?.durasi_hari || Math.max(30, ...boqItems.map(i => (i.start_day || 1) + (i.durasi_hari || 1) - 1));
  const curveData = calculateSCurve(boqItems, totalDays, grouping);

  const currentActual = boqItems.reduce((sum, item) => sum + (item.bobot || 0) * (item.progress_percent || 0) / 100, 0);

  const currentPlanned = (() => {
    const today = new Date();
    const startDate = project?.start_date ? new Date(project.start_date) : null;
    if (!startDate) return curveData[curveData.length - 1]?.planned || 0;
    const elapsedDays = Math.max(0, Math.floor((today - startDate) / (1000 * 60 * 60 * 24)));
    const periodIdx = Math.floor(elapsedDays / (grouping === "weekly" ? 7 : 30));
    return curveData[Math.min(periodIdx, curveData.length - 1)]?.planned || 0;
  })();

  const deviation = Number((currentActual - currentPlanned).toFixed(2));

  return (
    <div className="space-y-6">
      <PageHeader title="Kurva S" subtitle="Kurva progres rencana (Planned Progress) otomatis dari bobot BOQ dan durasi" icon={TrendingUp} />

      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <label className="text-sm font-medium mb-2 block">Pilih Proyek</label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Periode</label>
            <div className="flex gap-2">
              <Button variant={grouping === "weekly" ? "default" : "outline"} size="sm" onClick={() => setGrouping("weekly")} className={grouping === "weekly" ? "gradient-primary" : ""}>
                Mingguan
              </Button>
              <Button variant={grouping === "monthly" ? "default" : "outline"} size="sm" onClick={() => setGrouping("monthly")} className={grouping === "monthly" ? "gradient-primary" : ""}>
                Bulanan
              </Button>
            </div>
          </div>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : !boqItems.length ? (
        <GlassCard className="p-12 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Belum ada data BOQ. Upload BOQ terlebih dahulu pada halaman BOQ Management untuk menghasilkan Kurva S.</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{totalDays}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Hari</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{currentPlanned.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Planned Progress</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{currentActual.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground mt-1">Actual Progress</p>
            </GlassCard>
            <GlassCard className="p-4 text-center">
              <p className={`text-2xl font-bold ${deviation >= 0 ? "text-green-400" : "text-red-400"}`}>
                {deviation >= 0 ? "+" : ""}{deviation.toFixed(2)}%
              </p>
              <p className="text-xs text-muted-foreground mt-1">Deviasi</p>
            </GlassCard>
          </div>

          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-4">Kurva S — Planned ({grouping === "weekly" ? "Mingguan" : "Bulanan"})</h3>
            <ResponsiveContainer width="100%" height={350}>
              <ComposedChart data={curveData}>
                <defs>
                  <linearGradient id="colorPlanned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(199 89% 52%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(199 89% 52%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(215 28% 17%)" />
                <XAxis dataKey="period" stroke="hsl(215 20% 65%)" fontSize={11} />
                <YAxis stroke="hsl(215 20% 65%)" fontSize={12} domain={[0, 100]} unit="%" />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="planned" name="Kumulatif Planned" stroke="hsl(199 89% 52%)" strokeWidth={2} fill="url(#colorPlanned)" />
                <Bar dataKey="daily" name="Progres Periode" fill="hsl(280 65% 60%)" radius={[4, 4, 0, 0]} barSize={20} />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="p-4">
            <h3 className="text-sm font-semibold mb-4">Tabel Progres Rencana</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 px-3">Periode</th>
                    <th className="py-2 px-3 text-right">Progres Periode (%)</th>
                    <th className="py-2 px-3 text-right">Kumulatif Planned (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {curveData.map((row, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="py-2 px-3 font-medium">{row.period}</td>
                      <td className="py-2 px-3 text-right">{row.daily.toFixed(2)}%</td>
                      <td className="py-2 px-3 text-right font-medium text-primary">{row.planned.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}
    </div>
  );
}