import React, { useState, useEffect, useCallback, useMemo } from "react";
import { appClient } from "@/api/appClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import {
  CalendarClock, Loader2, Plus, Edit3, Trash2, Eye, Search, Filter,
  FileText, CheckCircle, XCircle, Send, Save, Clock, AlertTriangle,
  Sun, CloudRain, Wind, Cloud, Thermometer, MessageSquare, ClipboardCheck,
  ChevronDown, ChevronUp, User, Building2, MapPin, Layers, Package,
  Wrench, HardHat, Activity, DollarSign, ArrowUpDown, ListChecks,
} from "lucide-react";
import { exportToCSV } from "@/lib/export";

const fmtNumber = (val) => Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });
const fmtCurrency = (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;

const STATUS_COLORS = {
  "Draft": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Submitted": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Approved": "bg-green-500/20 text-green-300 border-green-500/30",
  "Rejected": "bg-red-500/20 text-red-300 border-red-500/30",
};

const WEATHER_ICONS = {
  Sunny: <Sun className="w-4 h-4 text-amber-400" />,
  Rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  Cloudy: <Cloud className="w-4 h-4 text-slate-400" />,
  Windy: <Wind className="w-4 h-4 text-cyan-400" />,
  Hot: <Thermometer className="w-4 h-4 text-red-400" />,
};

export default function DailyProgress() {
  const { role, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [entries, setEntries] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteEntry, setDeleteEntry] = useState(null);
  const [viewEntry, setViewEntry] = useState(null);
  const [activeTab, setActiveTab] = useState("entries");
  const [sortField, setSortField] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});

  const [form, setForm] = useState({
    project_id: "",
    date: new Date().toISOString().split("T")[0],
    area: "",
    floor: "",
    contractor: "",
    vendor: "",
    activity: "",
    boq_item_id: "",
    planned_progress: 0,
    actual_progress: 0,
    physical_progress_percent: 0,
    financial_progress_percent: 0,
    manpower: "",
    equipment: "",
    material_delivered: "",
    material_installed: "",
    weather: "Sunny",
    working_hours: 8,
    constraints: "",
    risks: "",
    next_day_plan: "",
    pic: "",
    notes: "",
    approval_status: "Draft",
  });

  const canEdit = ["Super Admin", "Project Manager", "Project Officer"].includes(role);
  const canApprove = ["Super Admin", "Project Manager"].includes(role);

  useEffect(() => {
    appClient.entities.Project.list("-created_date", 200)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0].id);
          setForm((prev) => ({ ...prev, project_id: data[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  // Load BOQ items for the selected project
  useEffect(() => {
    if (selectedProject) {
      appClient.boq.getItems(selectedProject).then(setBoqItems).catch(() => setBoqItems([]));
    }
  }, [selectedProject]);

  const loadEntries = useCallback(async () => {
    if (!selectedProject) { setEntries([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await appClient.dailyProgress.list(selectedProject);
      setEntries(data);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const filteredEntries = useMemo(() => {
    let items = [...entries];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((e) =>
        (e.activity || "").toLowerCase().includes(q) ||
        (e.area || "").toLowerCase().includes(q) ||
        (e.contractor || "").toLowerCase().includes(q) ||
        (e.vendor || "").toLowerCase().includes(q) ||
        (e.pic || "").toLowerCase().includes(q)
      );
    }
    if (filterStatus !== "all") items = items.filter((e) => e.approval_status === filterStatus);
    if (filterDate) items = items.filter((e) => (e.date || "").startsWith(filterDate));

    items.sort((a, b) => {
      const aVal = String(a[sortField] ?? "");
      const bVal = String(b[sortField] ?? "");
      const cmp = aVal.localeCompare(bVal);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return items;
  }, [entries, searchQuery, filterStatus, filterDate, sortField, sortDir]);

  const resetForm = () => {
    setForm({
      project_id: selectedProject,
      date: new Date().toISOString().split("T")[0],
      area: "",
      floor: "",
      contractor: "",
      vendor: "",
      activity: "",
      boq_item_id: "",
      planned_progress: 0,
      actual_progress: 0,
      physical_progress_percent: 0,
      financial_progress_percent: 0,
      manpower: "",
      equipment: "",
      material_delivered: "",
      material_installed: "",
      weather: "Sunny",
      working_hours: 8,
      constraints: "",
      risks: "",
      next_day_plan: "",
      pic: user?.full_name || "",
      notes: "",
      approval_status: "Draft",
    });
  };

  const handleNew = () => {
    resetForm();
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEdit = (entry) => {
    setEditingEntry(entry);
    setForm({
      project_id: entry.project_id || selectedProject,
      date: entry.date ? entry.date.split("T")[0] : new Date().toISOString().split("T")[0],
      area: entry.area || "",
      floor: entry.floor || "",
      contractor: entry.contractor || "",
      vendor: entry.vendor || "",
      activity: entry.activity || "",
      boq_item_id: entry.boq_item_id || "",
      planned_progress: entry.planned_progress || 0,
      actual_progress: entry.actual_progress || 0,
      physical_progress_percent: entry.physical_progress_percent || 0,
      financial_progress_percent: entry.financial_progress_percent || 0,
      manpower: entry.manpower || "",
      equipment: entry.equipment || "",
      material_delivered: entry.material_delivered || "",
      material_installed: entry.material_installed || "",
      weather: entry.weather || "Sunny",
      working_hours: entry.working_hours || 8,
      constraints: entry.constraints || "",
      risks: entry.risks || "",
      next_day_plan: entry.next_day_plan || "",
      pic: entry.pic || user?.full_name || "",
      notes: entry.notes || "",
      approval_status: entry.approval_status || "Draft",
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Auto-calculate progress if BOQ item selected
      let calcData = {};
      if (form.boq_item_id && form.actual_progress > 0) {
        try {
          calcData = await appClient.dailyProgress.calculateProgress(
            selectedProject, form.boq_item_id, Number(form.actual_progress)
          );
        } catch { /* ignore calc errors */ }
      }

      const entryData = {
        project_id: selectedProject,
        ...form,
        physical_progress_percent: calcData.physical_progress || form.physical_progress_percent,
        financial_progress_percent: calcData.financial_progress || form.financial_progress_percent,
      };

      if (editingEntry) {
        await appClient.dailyProgress.update(editingEntry.id, entryData);
        toast.success("Daily progress updated");
      } else {
        await appClient.dailyProgress.create(entryData);
        toast.success("Daily progress created");
      }

      // Update BOQ item progress if linked
      if (form.boq_item_id && form.actual_progress > 0) {
        try {
          await appClient.boq.updateItem(form.boq_item_id, {
            actual_quantity: calcData.actual_quantity || Number(form.actual_progress),
            remaining_quantity: calcData.remaining_quantity || 0,
            progress_percent: calcData.physical_progress || form.physical_progress_percent,
            completed_value: calcData.completed_value || 0,
          });
        } catch { /* silent */ }
      }

      setShowForm(false);
      loadEntries();
    } catch (err) {
      toast.error("Failed to save: " + (err.message || "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEntry) return;
    try {
      await appClient.dailyProgress.delete(deleteEntry.id);
      toast.success("Daily progress deleted");
      setDeleteEntry(null);
      loadEntries();
    } catch { toast.error("Failed to delete"); }
  };

  const handleStatusUpdate = async (entryId, status) => {
    try {
      await appClient.dailyProgress.updateStatus(entryId, status);
      toast.success(`Status changed to ${status}`);
      loadEntries();
    } catch { toast.error("Failed to update status"); }
  };

  const handleBoqSelect = async (boqItemId) => {
    setForm((prev) => ({ ...prev, boq_item_id: boqItemId }));
    if (boqItemId) {
      const item = boqItems.find((i) => i.id === boqItemId);
      if (item) {
        setForm((prev) => ({
          ...prev,
          boq_item_id: boqItemId,
          activity: item.item_name || item.description || prev.activity,
          vendor: item.vendor || prev.vendor,
        }));
      }
    }
  };

  const handleExportCSV = () => {
    const cols = [
      { key: "date", label: "Date" },
      { key: "area", label: "Area" },
      { key: "floor", label: "Floor" },
      { key: "activity", label: "Activity" },
      { key: "contractor", label: "Contractor" },
      { key: "vendor", label: "Vendor" },
      { key: "planned_progress", label: "Planned" },
      { key: "actual_progress", label: "Actual" },
      { key: "physical_progress_percent", label: "Physical %" },
      { key: "financial_progress_percent", label: "Financial %" },
      { key: "weather", label: "Weather" },
      { key: "working_hours", label: "Hours" },
      { key: "pic", label: "PIC" },
      { key: "approval_status", label: "Status" },
    ];
    const exportData = filteredEntries.map((e) => ({
      ...e,
      date: e.date ? new Date(e.date).toLocaleDateString() : "",
    }));
    exportToCSV("daily-progress.csv", cols, exportData);
    toast.success("Data exported to CSV");
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const toggleRow = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const SortHeader = ({ field, children }) => (
    <th className="py-2 px-3 text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none" onClick={() => toggleSort(field)}>
      <div className="flex items-center gap-1">{children}{sortField === field && <ArrowUpDown className={`w-3 h-3 ${sortDir === "desc" ? "rotate-180" : ""}`} />}</div>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Daily Progress" subtitle="Record and track daily construction progress" icon={CalendarClock}>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={handleNew} className="gap-2">
            <Plus className="w-4 h-4" /> New Entry
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" disabled={!entries.length}>
          <FileText className="w-4 h-4" /> Export CSV
        </Button>
      </PageHeader>

      {/* Project Selector */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1 w-full">
            <Label className="mb-2 block">Select Project</Label>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
              <SelectContent className="glass-strong">
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassCard>

      {/* Summary Cards */}
      {entries.length > 0 && (() => {
        const approved = entries.filter((e) => e.approval_status === "Approved");
        const avgPhysical = approved.length > 0
          ? approved.reduce((s, e) => s + Number(e.physical_progress_percent || 0), 0) / approved.length : 0;
        const avgFinancial = approved.length > 0
          ? approved.reduce((s, e) => s + Number(e.financial_progress_percent || 0), 0) / approved.length : 0;
        return (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-primary">{entries.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Total Entries</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-emerald-400">{approved.length}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Approved</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-blue-400">{fmtNumber(avgPhysical)}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg Physical Progress</p>
            </GlassCard>
            <GlassCard className="p-3 text-center">
              <p className="text-lg font-bold text-amber-400">{fmtNumber(avgFinancial)}%</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Avg Financial Progress</p>
            </GlassCard>
          </div>
        );
      })()}

      {/* Search & Filters */}
      {entries.length > 0 && (
        <GlassCard className="p-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search activities, areas, contractors..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-full md:w-44" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="glass-strong">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Submitted">Submitted</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </GlassCard>
      )}

      {/* Entries Table */}
      <GlassCard className="p-4">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12">
            <CalendarClock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {selectedProject ? "No daily progress entries yet. Click 'New Entry' to start." : "Select a project first."}
            </p>
            {selectedProject && canEdit && (
              <Button variant="outline" size="sm" onClick={handleNew} className="gap-2 mt-4">
                <Plus className="w-4 h-4" /> New Entry
              </Button>
            )}
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No entries match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 px-2 w-8"></th>
                  <SortHeader field="date">Date</SortHeader>
                  <SortHeader field="activity">Activity</SortHeader>
                  <SortHeader field="area">Area</SortHeader>
                  <SortHeader field="contractor">Contractor</SortHeader>
                  <SortHeader field="physical_progress_percent">Physical %</SortHeader>
                  <SortHeader field="financial_progress_percent">Financial %</SortHeader>
                  <SortHeader field="weather">Weather</SortHeader>
                  <SortHeader field="approval_status">Status</SortHeader>
                  <th className="py-2 px-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <React.Fragment key={entry.id}>
                    <tr className="border-b border-border/50 hover:bg-muted/10 cursor-pointer" onClick={() => toggleRow(entry.id)}>
                      <td className="py-2 px-2">
                        {expandedRows[entry.id] ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      </td>
                      <td className="py-2 px-3">
                        {entry.date ? new Date(entry.date).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-2 px-3 font-medium max-w-[200px] truncate">{entry.activity || "—"}</td>
                      <td className="py-2 px-3 text-muted-foreground">{entry.area || "—"}{entry.floor ? ` (${entry.floor})` : ""}</td>
                      <td className="py-2 px-3">{entry.contractor || entry.vendor || "—"}</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden min-w-[40px]">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, Number(entry.physical_progress_percent || 0))}%` }} />
                          </div>
                          <span className="text-xs w-10 text-right">{Number(entry.physical_progress_percent || 0).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">{fmtNumber(entry.financial_progress_percent || 0)}%</td>
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1" title={entry.weather || "Sunny"}>
                          {WEATHER_ICONS[entry.weather] || <Sun className="w-4 h-4 text-amber-400" />}
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <Badge className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[entry.approval_status] || STATUS_COLORS["Draft"]}`}>
                          {entry.approval_status || "Draft"}
                        </Badge>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setViewEntry(entry); }}>
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          {canEdit && entry.approval_status === "Draft" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(entry); }}>
                                <Edit3 className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteEntry(entry); }}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                          {canEdit && entry.approval_status === "Draft" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-400" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(entry.id, "Submitted"); }}>
                              <Send className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          {canApprove && entry.approval_status === "Submitted" && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(entry.id, "Approved"); }}>
                                <CheckCircle className="w-3.5 h-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(entry.id, "Rejected"); }}>
                                <XCircle className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedRows[entry.id] && (
                      <tr className="bg-muted/5">
                        <td colSpan={10} className="p-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Manpower</p>
                              <p className="mt-1">{entry.manpower || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Equipment</p>
                              <p className="mt-1">{entry.equipment || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Material Delivered</p>
                              <p className="mt-1">{entry.material_delivered || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Material Installed</p>
                              <p className="mt-1">{entry.material_installed || "—"}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">Working Hours</p>
                              <p className="mt-1">{entry.working_hours || "—"}h</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground uppercase">PIC</p>
                              <p className="mt-1">{entry.pic || "—"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] text-muted-foreground uppercase">Constraints</p>
                              <p className="mt-1">{entry.constraints || "None"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] text-muted-foreground uppercase">Risks</p>
                              <p className="mt-1">{entry.risks || "None"}</p>
                            </div>
                            <div className="col-span-2">
                              <p className="text-[10px] text-muted-foreground uppercase">Next Day Plan</p>
                              <p className="mt-1">{entry.next_day_plan || "—"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
              <span>Showing {filteredEntries.length} of {entries.length} entries</span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Entry Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => !open && setShowForm(false)}>
        <DialogContent className="glass-strong max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Daily Progress" : "New Daily Progress"}</DialogTitle>
            <DialogDescription>Record daily construction progress and link to BOQ items</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input type="date" required value={form.date} onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={form.area} onChange={(e) => setForm((prev) => ({ ...prev, area: e.target.value }))} placeholder="Wing A, Zone 1..." />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input value={form.floor} onChange={(e) => setForm((prev) => ({ ...prev, floor: e.target.value }))} placeholder="Lt. 1, 2..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contractor</Label>
                <Input value={form.contractor} onChange={(e) => setForm((prev) => ({ ...prev, contractor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={form.vendor} onChange={(e) => setForm((prev) => ({ ...prev, vendor: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Activity *</Label>
              <Input required value={form.activity} onChange={(e) => setForm((prev) => ({ ...prev, activity: e.target.value }))} placeholder="Describe the work activity..." />
            </div>

            <div className="space-y-2">
              <Label>Link to BOQ Item</Label>
              <Select value={form.boq_item_id} onValueChange={handleBoqSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select BOQ item (optional)" />
                </SelectTrigger>
                <SelectContent className="glass-strong max-h-60">
                  <SelectItem value="">None (unlinked)</SelectItem>
                  {boqItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.item_number || item.no} - {item.item_name} ({fmtCurrency(item.total_price || item.total_harga || 0)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Planned Progress</Label>
                <Input type="number" step="0.01" value={form.planned_progress} onChange={(e) => setForm((prev) => ({ ...prev, planned_progress: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Actual Progress (Qty)</Label>
                <Input type="number" step="0.01" value={form.actual_progress} onChange={(e) => setForm((prev) => ({ ...prev, actual_progress: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Physical Progress (%)</Label>
                <Input type="number" step="0.1" min="0" max="100" value={form.physical_progress_percent}
                  onChange={(e) => setForm((prev) => ({ ...prev, physical_progress_percent: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Financial Progress (%)</Label>
                <Input type="number" step="0.1" min="0" max="100" value={form.financial_progress_percent}
                  onChange={(e) => setForm((prev) => ({ ...prev, financial_progress_percent: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Manpower</Label>
                <Input value={form.manpower} onChange={(e) => setForm((prev) => ({ ...prev, manpower: e.target.value }))} placeholder="10 workers, 2 operators" />
              </div>
              <div className="space-y-2">
                <Label>Equipment</Label>
                <Input value={form.equipment} onChange={(e) => setForm((prev) => ({ ...prev, equipment: e.target.value }))} placeholder="1 excavator, 2 mixer" />
              </div>
              <div className="space-y-2">
                <Label>Working Hours</Label>
                <Input type="number" min="0" max="24" step="0.5" value={form.working_hours}
                  onChange={(e) => setForm((prev) => ({ ...prev, working_hours: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Material Delivered</Label>
                <Textarea value={form.material_delivered} onChange={(e) => setForm((prev) => ({ ...prev, material_delivered: e.target.value }))} rows={2} />
              </div>
              <div className="space-y-2">
                <Label>Material Installed</Label>
                <Textarea value={form.material_installed} onChange={(e) => setForm((prev) => ({ ...prev, material_installed: e.target.value }))} rows={2} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Weather</Label>
                <Select value={form.weather} onValueChange={(v) => setForm((prev) => ({ ...prev, weather: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="Sunny">☀️ Sunny</SelectItem>
                    <SelectItem value="Cloudy">☁️ Cloudy</SelectItem>
                    <SelectItem value="Rainy">🌧️ Rainy</SelectItem>
                    <SelectItem value="Windy">💨 Windy</SelectItem>
                    <SelectItem value="Hot">🌡️ Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PIC</Label>
                <Input value={form.pic} onChange={(e) => setForm((prev) => ({ ...prev, pic: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Approval Status</Label>
                <Select value={form.approval_status} onValueChange={(v) => setForm((prev) => ({ ...prev, approval_status: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Constraints</Label>
              <Textarea value={form.constraints} onChange={(e) => setForm((prev) => ({ ...prev, constraints: e.target.value }))} rows={2} placeholder="Any issues or constraints encountered..." />
            </div>

            <div className="space-y-2">
              <Label>Risks</Label>
              <Textarea value={form.risks} onChange={(e) => setForm((prev) => ({ ...prev, risks: e.target.value }))} rows={2} placeholder="Identified risks..." />
            </div>

            <div className="space-y-2">
              <Label>Next Day Plan</Label>
              <Textarea value={form.next_day_plan} onChange={(e) => setForm((prev) => ({ ...prev, next_day_plan: e.target.value }))} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gradient-primary">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingEntry ? "Update" : "Save"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Entry Dialog */}
      <Dialog open={!!viewEntry} onOpenChange={(open) => !open && setViewEntry(null)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Daily Progress Details</DialogTitle>
            <DialogDescription>{viewEntry?.activity}</DialogDescription>
          </DialogHeader>
          {viewEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Date</p>
                  <p className="font-medium mt-1">{viewEntry.date ? new Date(viewEntry.date).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Status</p>
                  <Badge className={`mt-1 ${STATUS_COLORS[viewEntry.approval_status] || STATUS_COLORS["Draft"]}`}>{viewEntry.approval_status || "Draft"}</Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Area / Floor</p>
                  <p className="font-medium mt-1">{viewEntry.area || "—"}{viewEntry.floor ? ` / ${viewEntry.floor}` : ""}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Contractor / Vendor</p>
                  <p className="font-medium mt-1">{viewEntry.contractor || viewEntry.vendor || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Activity</p>
                  <p className="font-medium mt-1">{viewEntry.activity || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Physical Progress</p>
                  <p className="font-medium mt-1">{Number(viewEntry.physical_progress_percent || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Financial Progress</p>
                  <p className="font-medium mt-1">{Number(viewEntry.financial_progress_percent || 0).toFixed(1)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Planned</p>
                  <p className="font-medium mt-1">{fmtNumber(viewEntry.planned_progress || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Actual</p>
                  <p className="font-medium mt-1">{fmtNumber(viewEntry.actual_progress || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Weather</p>
                  <p className="font-medium mt-1 flex items-center gap-1">{viewEntry.weather || "Sunny"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Working Hours</p>
                  <p className="font-medium mt-1">{viewEntry.working_hours || 8}h</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">PIC</p>
                  <p className="font-medium mt-1">{viewEntry.pic || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Manpower</p>
                  <p className="font-medium mt-1">{viewEntry.manpower || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase">Next Day Plan</p>
                  <p className="mt-1">{viewEntry.next_day_plan || "—"}</p>
                </div>
                {viewEntry.constraints && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Constraints</p>
                    <p className="mt-1">{viewEntry.constraints}</p>
                  </div>
                )}
                {viewEntry.risks && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase">Risks</p>
                    <p className="mt-1">{viewEntry.risks}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteEntry} onOpenChange={(open) => !open && setDeleteEntry(null)}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Entry</DialogTitle>
            <DialogDescription>Are you sure you want to delete this daily progress entry? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteEntry(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}