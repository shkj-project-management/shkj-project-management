import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/appClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GlassCard from "@/components/GlassCard";
import PageHeader from "@/components/PageHeader";
import { Activity, Loader2, Save } from "lucide-react";
import moment from "moment";

const fmtCurrency = (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;

export default function ProgressFisik() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressUpdates, setProgressUpdates] = useState({});
  const [saving, setSaving] = useState(false);
  const [reportDate, setReportDate] = useState(moment().format("YYYY-MM-DD"));

  useEffect(() => {
    base44.entities.Project.list("-created_date", 200)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
      })
      .catch(() => {});
  }, []);

  const loadBOQ = useCallback(async () => {
    if (!selectedProject) { setBoqItems([]); return; }
    setLoading(true);
    try {
      const items = await base44.entities.BOQItem.filter({ project_id: selectedProject }, "no", 500);
      setBoqItems(items);
      const updates = {};
      items.forEach((item) => { updates[item.id] = item.progress_percent || 0; });
      setProgressUpdates(updates);
    } catch { setBoqItems([]); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadBOQ(); }, [loadBOQ]);

  const currentProgress = boqItems.reduce((sum, item) => {
    const prog = progressUpdates[item.id] ?? item.progress_percent ?? 0;
    return sum + (item.bobot || 0) * prog / 100;
  }, 0);

  const nilaiSelesai = boqItems.reduce((sum, item) => {
    const prog = progressUpdates[item.id] ?? item.progress_percent ?? 0;
    return sum + (item.total_harga || 0) * prog / 100;
  }, 0);

  const sisaPekerjaan = boqItems.reduce((sum, item) => {
    const prog = progressUpdates[item.id] ?? item.progress_percent ?? 0;
    return sum + (item.total_harga || 0) * (1 - prog / 100);
  }, 0);

  const areaProgress = (() => {
    const areas = {};
    boqItems.forEach((item) => {
      const area = item.area || "Lainnya";
      if (!areas[area]) areas[area] = { bobot: 0, progress: 0 };
      areas[area].bobot += item.bobot || 0;
      const prog = progressUpdates[item.id] ?? item.progress_percent ?? 0;
      areas[area].progress += (item.bobot || 0) * prog / 100;
    });
    return Object.entries(areas).map(([area, data]) => ({
      area,
      progress: data.bobot > 0 ? Number((data.progress / data.bobot * 100).toFixed(2)) : 0,
    }));
  })();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [];
      const progressEntries = [];
      boqItems.forEach((item) => {
        const newProgress = progressUpdates[item.id];
        const oldProgress = item.progress_percent || 0;
        if (newProgress !== undefined && newProgress !== oldProgress) {
          updates.push({ id: item.id, progress_percent: newProgress });
          progressEntries.push({
            project_id: selectedProject,
            boq_item_id: item.id,
            boq_item_name: item.item_name,
            date: reportDate,
            progress_percent: newProgress,
            volume_done: item.volume ? (item.volume * newProgress / 100) : 0,
            notes: `Progress diperbarui dari ${oldProgress}% menjadi ${newProgress}%`,
          });
        }
      });

      if (updates.length > 0) {
        await base44.entities.BOQItem.bulkUpdate(updates);
        if (progressEntries.length > 0) {
          await base44.entities.ProgressDaily.bulkCreate(progressEntries);
        }
        await base44.entities.Project.update(selectedProject, { progress: Number(currentProgress.toFixed(2)) });
        toast.success(`${updates.length} item progress disimpan`);
        loadBOQ();
      } else {
        toast.info("Tidak ada perubahan progress");
      }
    } catch { toast.error("Gagal menyimpan progress"); }
    finally { setSaving(false); }
  };

  const handleProgressChange = (itemId, value) => {
    const val = Math.max(0, Math.min(100, Number(value) || 0));
    setProgressUpdates(prev => ({ ...prev, [itemId]: val }));
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Progress Fisik" subtitle="Input progress lapangan per item BOQ — sistem menghitung progres fisik & keuangan otomatis" icon={Activity}>
        <Button size="sm" onClick={handleSave} disabled={saving || !boqItems.length} className="gap-2 gradient-primary">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Simpan Progress
        </Button>
      </PageHeader>

      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <Label className="mb-2 block">Pilih Proyek</Label>
            <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-background">{p.name} ({p.code})</option>
              ))}
            </select>
          </div>
          <div>
            <Label className="mb-2 block">Tanggal Laporan</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} />
          </div>
        </div>
      </GlassCard>

      {boqItems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{currentProgress.toFixed(2)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Progress Fisik Keseluruhan</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{fmtCurrency(nilaiSelesai)}</p>
            <p className="text-xs text-muted-foreground mt-1">Nilai Pekerjaan Selesai</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{fmtCurrency(sisaPekerjaan)}</p>
            <p className="text-xs text-muted-foreground mt-1">Sisa Pekerjaan</p>
          </GlassCard>
        </div>
      )}

      {areaProgress.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-sm font-semibold mb-4">Progress per Area</h3>
          <div className="space-y-3">
            {areaProgress.map((a) => (
              <div key={a.area} className="flex items-center gap-4">
                <span className="text-sm w-32 shrink-0 truncate">{a.area}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full gradient-primary" style={{ width: `${a.progress}%` }} />
                </div>
                <span className="text-sm font-medium w-16 text-right">{a.progress.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : boqItems.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {selectedProject ? "Belum ada item BOQ. Upload BOQ terlebih dahulu." : "Pilih proyek terlebih dahulu."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 px-3">No.</th>
                  <th className="py-2 px-3">Nama Pekerjaan</th>
                  <th className="py-2 px-3">Area</th>
                  <th className="py-2 px-3 text-right">Bobot (%)</th>
                  <th className="py-2 px-3 text-right">Progress (%)</th>
                  <th className="py-2 px-3">Progress</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map((item) => {
                  const prog = progressUpdates[item.id] ?? item.progress_percent ?? 0;
                  return (
                    <tr key={item.id} className="border-b border-border/50 hover:bg-muted/10">
                      <td className="py-2 px-3 text-muted-foreground">{item.no || "—"}</td>
                      <td className="py-2 px-3 font-medium">{item.item_name}</td>
                      <td className="py-2 px-3 text-muted-foreground">{item.area || "—"}</td>
                      <td className="py-2 px-3 text-right">{(item.bobot || 0).toFixed(2)}%</td>
                      <td className="py-2 px-3">
                        <Input type="number" min="0" max="100" value={prog} onChange={(e) => handleProgressChange(item.id, e.target.value)} className="w-20 h-8 text-right" />
                      </td>
                      <td className="py-2 px-3">
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full gradient-primary" style={{ width: `${prog}%` }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
