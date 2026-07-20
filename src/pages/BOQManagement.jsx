import React, { useState, useEffect, useCallback } from "react";
import { appClient } from "@/api/appClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import {
  Database, Upload, Loader2, FileSpreadsheet, Calculator, Trash2, Edit3, Download,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

const fmtCurrency = (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
const fmtNumber = (val) => Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

export default function BOQManagement() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  useEffect(() => {
    appClient.entities.Project.list("-created_date", 200)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) setSelectedProject(data[0].id);
      })
      .catch(() => {});
  }, []);

  const loadBOQ = useCallback(async () => {
    if (!selectedProject) { setBoqItems([]); setLoading(false); return; }
    setLoading(true);
    try {
      const items = await appClient.entities.BOQItem.filter({ project_id: selectedProject }, "no", 500);
      setBoqItems(items);
    } catch { setBoqItems([]); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadBOQ(); }, [loadBOQ]);

  const totalNilai = boqItems.reduce((s, i) => s + (i.total_harga || 0), 0);
  const totalBobot = boqItems.reduce((s, i) => s + (i.bobot || 0), 0);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;
    setUploading(true);
    try {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      setUploading(false);
      setExtracting(true);

      const result = await appClient.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  no: { type: "string" },
                  item_name: { type: "string" },
                  kelompok: { type: "string" },
                  volume: { type: "number" },
                  satuan: { type: "string" },
                  harga_satuan: { type: "number" },
                  total_harga: { type: "number" },
                },
              },
            },
          },
        },
      });

      const extractedItems = Array.isArray(result.output)
        ? result.output
        : (result.output?.items || []);

      if (!extractedItems.length) {
        toast.error("Tidak ada item yang dapat diekstrak dari file");
        return;
      }

      const total = extractedItems.reduce((sum, item) => sum + (item.total_harga || 0), 0);

      const itemsWithBobot = extractedItems.map((item, idx) => ({
        project_id: selectedProject,
        no: item.no || String(idx + 1),
        item_name: item.item_name || `Item ${idx + 1}`,
        kelompok: item.kelompok || "",
        volume: item.volume || 0,
        satuan: item.satuan || "",
        harga_satuan: item.harga_satuan || 0,
        total_harga: item.total_harga || 0,
        bobot: total > 0 ? Number(((item.total_harga || 0) / total * 100).toFixed(4)) : 0,
        durasi_hari: 1,
        start_day: 1,
        progress_percent: 0,
      }));

      await appClient.entities.BOQItem.bulkCreate(itemsWithBobot);
      toast.success(`${itemsWithBobot.length} item BOQ berhasil diekstrak dan disimpan`);
      loadBOQ();
    } catch (err) {
      toast.error("Gagal memproses file BOQ");
    } finally {
      setUploading(false);
      setExtracting(false);
      e.target.value = "";
    }
  };

  const recalculateBobot = async () => {
    if (!boqItems.length) return;
    const total = boqItems.reduce((s, i) => s + (i.total_harga || 0), 0);
    if (total === 0) { toast.error("Total nilai BOQ adalah 0"); return; }
    const updates = boqItems.map((item) => ({
      id: item.id,
      bobot: Number(((item.total_harga || 0) / total * 100).toFixed(4)),
    }));
    try {
      await appClient.entities.BOQItem.bulkUpdate(updates);
      toast.success("Bobot berhasil dihitung ulang");
      loadBOQ();
    } catch { toast.error("Gagal menghitung ulang bobot"); }
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setEditForm({
      durasi_hari: item.durasi_hari || 1,
      start_day: item.start_day || 1,
      area: item.area || "",
      vendor: item.vendor || "",
      kelompok: item.kelompok || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      await appClient.entities.BOQItem.update(editItem.id, editForm);
      toast.success("Item BOQ diperbarui");
      setEditItem(null);
      loadBOQ();
    } catch { toast.error("Gagal memperbarui item"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await appClient.entities.BOQItem.delete(deleteItem.id);
      toast.success("Item BOQ dihapus");
      setDeleteItem(null);
      loadBOQ();
    } catch { toast.error("Gagal menghapus item"); }
  };

  const handleExportCSV = () => {
    const cols = [
      { key: "no", label: "No." },
      { key: "item_name", label: "Nama Pekerjaan" },
      { key: "kelompok", label: "Kelompok" },
      { key: "volume", label: "Volume" },
      { key: "satuan", label: "Satuan" },
      { key: "harga_satuan", label: "Harga Satuan" },
      { key: "total_harga", label: "Total Harga" },
      { key: "bobot", label: "Bobot (%)" },
      { key: "durasi_hari", label: "Durasi (Hari)" },
      { key: "start_day", label: "Hari Mulai" },
    ];
    exportToCSV("boq-items.csv", cols, boqItems);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="BOQ Management" subtitle="Upload dan kelola Bill of Quantities dengan ekstraksi AI" icon={Database}>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" disabled={!boqItems.length}>
          <Download className="w-4 h-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={recalculateBobot} className="gap-2" disabled={!boqItems.length}>
          <Calculator className="w-4 h-4" /> Hitung Bobot
        </Button>
      </PageHeader>

      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <Label className="mb-2 block">Pilih Proyek</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger><SelectValue placeholder="Pilih proyek..." /></SelectTrigger>
              <SelectContent className="glass-strong">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="mb-2 block">Upload BOQ (CSV)</Label>
            <label>
              <input type="file" accept=".csv,text/csv" onChange={handleUpload} className="hidden" disabled={!selectedProject || uploading || extracting} />
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={!selectedProject || uploading || extracting} asChild>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : extracting ? "AI Extracting..." : "Upload BOQ"}
                </span>
              </Button>
            </label>
          </div>
        </div>
        {extracting && (
          <div className="mt-3 flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            AI sedang membaca struktur BOQ dan mengekstrak item pekerjaan beserta volume, satuan, harga, dan bobot...
          </div>
        )}
      </GlassCard>

      {boqItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{boqItems.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Item</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{fmtCurrency(totalNilai)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Nilai</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{fmtNumber(totalBobot)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Total Bobot</p>
          </GlassCard>
          <GlassCard className="p-4 text-center">
            <p className="text-2xl font-bold text-primary">{new Set(boqItems.map(i => i.kelompok).filter(Boolean)).size}</p>
            <p className="text-xs text-muted-foreground mt-1">Kelompok</p>
          </GlassCard>
        </div>
      )}

      <GlassCard className="p-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : boqItems.length === 0 ? (
          <div className="text-center py-12">
            <FileSpreadsheet className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {selectedProject ? "Belum ada item BOQ. Upload file CSV untuk memulai." : "Pilih proyek terlebih dahulu."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 px-3">No.</th>
                  <th className="py-2 px-3">Nama Pekerjaan</th>
                  <th className="py-2 px-3">Kelompok</th>
                  <th className="py-2 px-3 text-right">Volume</th>
                  <th className="py-2 px-3">Satuan</th>
                  <th className="py-2 px-3 text-right">Harga Satuan</th>
                  <th className="py-2 px-3 text-right">Total Harga</th>
                  <th className="py-2 px-3 text-right">Bobot (%)</th>
                  <th className="py-2 px-3 text-right">Durasi</th>
                  <th className="py-2 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {boqItems.map((item) => (
                  <tr key={item.id} className="border-b border-border/50 hover:bg-muted/10">
                    <td className="py-2 px-3 text-muted-foreground">{item.no || "—"}</td>
                    <td className="py-2 px-3 font-medium">{item.item_name}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.kelompok || "—"}</td>
                    <td className="py-2 px-3 text-right">{fmtNumber(item.volume)}</td>
                    <td className="py-2 px-3 text-muted-foreground">{item.satuan || "—"}</td>
                    <td className="py-2 px-3 text-right">{fmtCurrency(item.harga_satuan)}</td>
                    <td className="py-2 px-3 text-right font-medium">{fmtCurrency(item.total_harga)}</td>
                    <td className="py-2 px-3 text-right">{fmtNumber(item.bobot)}%</td>
                    <td className="py-2 px-3 text-right">{item.durasi_hari || 1}h</td>
                    <td className="py-2 px-3">
                      <div className="flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(item)}>
                          <Edit3 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteItem(item)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Item BOQ</DialogTitle>
            <DialogDescription>{editItem?.item_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Kelompok Pekerjaan</Label>
              <Input value={editForm.kelompok || ""} onChange={(e) => setEditForm(prev => ({ ...prev, kelompok: e.target.value }))} placeholder="Struktur, Arsitektur, MEP..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Durasi (Hari)</Label>
                <Input type="number" value={editForm.durasi_hari || 1} onChange={(e) => setEditForm(prev => ({ ...prev, durasi_hari: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Hari Mulai</Label>
                <Input type="number" value={editForm.start_day || 1} onChange={(e) => setEditForm(prev => ({ ...prev, start_day: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Area</Label>
              <Input value={editForm.area || ""} onChange={(e) => setEditForm(prev => ({ ...prev, area: e.target.value }))} placeholder="Lantai 1, Wing A..." />
            </div>
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Input value={editForm.vendor || ""} onChange={(e) => setEditForm(prev => ({ ...prev, vendor: e.target.value }))} placeholder="Nama vendor/kontraktor" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Batal</Button>
              <Button type="submit" disabled={saving} className="gradient-primary">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Simpan
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Hapus Item BOQ</DialogTitle>
            <DialogDescription>Yakin ingin menghapus "{deleteItem?.item_name}"? Tindakan ini tidak dapat dibatalkan.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Batal</Button>
            <Button variant="destructive" onClick={handleDelete}>Hapus</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
