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
  Database, Upload, Loader2, FileSpreadsheet, Calculator, Trash2, Edit3, Download,
  Search, Filter, FileDown, FileUp, FileText, History, CheckCircle, XCircle,
  AlertTriangle, RefreshCw, Eye, Clock, User, FileType, Table2, ListChecks,
  BarChart3, TrendingUp, DollarSign, Package, Layers, ChevronDown, ChevronUp,
  Copy, Save, Ban, ArrowUpDown, Columns3, FileSpreadsheet as FileXLS,
} from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/export";

const fmtCurrency = (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
const fmtNumber = (val) => Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const STATUS_COLORS = {
  "Draft": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Submitted": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Approved": "bg-green-500/20 text-green-300 border-green-500/30",
  "Rejected": "bg-red-500/20 text-red-300 border-red-500/30",
  "Active": "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  "Revised": "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

export default function BOQManagement() {
  const { hasPermission, PERMISSIONS, role } = useAuth();
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
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("no");
  const [sortDir, setSortDir] = useState("asc");
  const [revisions, setRevisions] = useState([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [approvalItem, setApprovalItem] = useState(null);
  const [approvalAction, setApprovalAction] = useState("");
  const [viewItem, setViewItem] = useState(null);
  const [duplicateCheck, setDuplicateCheck] = useState([]);
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [columnMapping, setColumnMapping] = useState({});
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [activeTab, setActiveTab] = useState("items");
  const [summary, setSummary] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  const canEdit = ["Super Admin", "Project Manager", "Project Officer"].includes(role);
  const canApprove = ["Super Admin", "Project Manager"].includes(role);

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
      const items = await appClient.boq.getItems(selectedProject);
      setBoqItems(items);
      const sum = await appClient.boq.getSummary(selectedProject);
      setSummary(sum);
      const revs = await appClient.boq.getRevisions(selectedProject);
      setRevisions(revs);
    } catch { setBoqItems([]); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadBOQ(); }, [loadBOQ]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let items = [...boqItems];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((i) =>
        (i.item_number || i.no || "").toLowerCase().includes(q) ||
        (i.item_name || "").toLowerCase().includes(q) ||
        (i.description || "").toLowerCase().includes(q) ||
        (i.work_category || i.kelompok || "").toLowerCase().includes(q) ||
        (i.vendor || "").toLowerCase().includes(q)
      );
    }

    // Filter by category
    if (filterCategory !== "all") {
      items = items.filter((i) => (i.work_category || i.kelompok) === filterCategory);
    }

    // Filter by status
    if (filterStatus !== "all") {
      items = items.filter((i) => (i.approval_status || "Draft") === filterStatus);
    }

    // Sort
    items.sort((a, b) => {
      const aVal = String(a[sortField] ?? "");
      const bVal = String(b[sortField] ?? "");
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [boqItems, searchQuery, filterCategory, filterStatus, sortField, sortDir]);

  const categories = useMemo(() => {
    const cats = new Set(boqItems.map((i) => i.work_category || i.kelompok || "").filter(Boolean));
    return [...cats].sort();
  }, [boqItems]);

  const totalNilai = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
  const totalCompleted = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
  const totalRemaining = totalNilai - totalCompleted;
  const avgProgress = boqItems.length > 0
    ? boqItems.reduce((s, i) => s + Number(i.progress_percent || 0), 0) / boqItems.length
    : 0;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProject) return;

    // Validate file type
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["csv", "xlsx", "xls"].includes(ext)) {
      toast.error("Format file tidak didukung. Gunakan CSV atau XLSX.");
      e.target.value = "";
      return;
    }

    setUploading(true);
    try {
      // Read raw headers for column mapping
      const text = await file.text();
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) {
        toast.error("File kosong atau tidak valid");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      setRawHeaders(headers);

      // Auto-map columns
      const mapping = appClient.utils.boqUtils.mapColumns(headers);
      setColumnMapping(mapping);

      // Parse data
      const parsed = appClient.utils.parseCsv(text);
      setRawData(parsed);

      // Check for duplicates
      const existing = await appClient.boq.getItems(selectedProject);
      const dups = appClient.utils.boqUtils.findDuplicates(parsed, existing);
      setDuplicateCheck(dups);

      if (dups.length > 0) {
        setShowDuplicateDialog(true);
      }

      // Show mapping dialog if columns are ambiguous
      const mappedCount = Object.keys(mapping).length;
      if (mappedCount < 4) {
        setShowMappingDialog(true);
      }

      setExtracting(true);

      // Process the import
      const itemsWithProject = parsed.map((item, idx) => ({
        project_id: selectedProject,
        item_number: item.item_number || item.no || String(idx + 1),
        item_name: item.item_name || item.description || `Item ${idx + 1}`,
        work_category: item.work_category || item.kelompok || "",
        description: item.description || item.item_name || "",
        unit: item.unit || item.satuan || "",
        quantity: Number(item.quantity || item.volume || 0),
        unit_price: Number(item.unit_price || item.harga_satuan || 0),
        total_price: Number(item.total_price || item.total_harga || (Number(item.quantity || item.volume || 0) * Number(item.unit_price || item.harga_satuan || 0))),
        vendor: item.vendor || "",
        notes: item.notes || "",
        status: "Active",
        approval_status: "Draft",
        actual_quantity: 0,
        remaining_quantity: Number(item.quantity || item.volume || 0),
        progress_percent: 0,
        completed_value: 0,
      }));

      // Filter out duplicates if user wants to skip them
      const itemsToImport = dups.length > 0
        ? itemsWithProject.filter((item) => !dups.some((d) => (d.item_number || d.no) === item.item_number))
        : itemsWithProject;

      if (itemsToImport.length === 0) {
        toast.error("Semua item sudah ada (duplikat). Tidak ada yang diimpor.");
        setUploading(false);
        setExtracting(false);
        e.target.value = "";
        return;
      }

      await appClient.boq.bulkImport(itemsToImport);
      toast.success(`${itemsToImport.length} item BOQ berhasil diimpor`);
      loadBOQ();
    } catch (err) {
      toast.error("Gagal memproses file: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
      setExtracting(false);
      e.target.value = "";
    }
  };

  const handleDownloadTemplate = () => {
    const template = appClient.boq.generateTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "boq-template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template BOQ berhasil diunduh");
  };

  const handleEdit = (item) => {
    setEditItem(item);
    setEditForm({
      item_number: item.item_number || item.no || "",
      item_name: item.item_name || "",
      work_category: item.work_category || item.kelompok || "",
      description: item.description || "",
      unit: item.unit || item.satuan || "",
      quantity: item.quantity || item.volume || 0,
      unit_price: item.unit_price || item.harga_satuan || 0,
      vendor: item.vendor || "",
      notes: item.notes || "",
      durasi_hari: item.durasi_hari || 1,
      start_day: item.start_day || 1,
      area: item.area || "",
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setSaving(true);
    try {
      const totalPrice = Number(editForm.quantity) * Number(editForm.unit_price);
      await appClient.boq.updateItem(editItem.id, {
        ...editForm,
        no: editForm.item_number,
        item_name: editForm.item_name,
        kelompok: editForm.work_category,
        volume: Number(editForm.quantity),
        satuan: editForm.unit,
        harga_satuan: Number(editForm.unit_price),
        total_harga: totalPrice,
        total_price: totalPrice,
        remaining_quantity: Number(editForm.quantity) - (editItem.actual_quantity || 0),
      });
      toast.success("Item BOQ diperbarui");
      setEditItem(null);
      loadBOQ();
    } catch { toast.error("Gagal memperbarui item"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    try {
      await appClient.boq.deleteItem(deleteItem.id);
      toast.success("Item BOQ dihapus");
      setDeleteItem(null);
      loadBOQ();
    } catch { toast.error("Gagal menghapus item"); }
  };

  const handleApproval = async () => {
    if (!approvalItem || !approvalAction) return;
    try {
      await appClient.boq.updateApprovalStatus(approvalItem.id, approvalAction);
      toast.success(`Status item diubah menjadi ${approvalAction}`);
      setApprovalItem(null);
      setApprovalAction("");
      loadBOQ();
    } catch { toast.error("Gagal mengubah status approval"); }
  };

  const handleExportCSV = () => {
    const cols = [
      { key: "item_number", label: "Item No." },
      { key: "item_name", label: "Item Name" },
      { key: "work_category", label: "Category" },
      { key: "description", label: "Description" },
      { key: "unit", label: "Unit" },
      { key: "quantity", label: "Quantity" },
      { key: "unit_price", label: "Unit Price" },
      { key: "total_price", label: "Total Price" },
      { key: "vendor", label: "Vendor" },
      { key: "progress_percent", label: "Progress (%)" },
      { key: "actual_quantity", label: "Actual Qty" },
      { key: "remaining_quantity", label: "Remaining Qty" },
      { key: "approval_status", label: "Status" },
    ];
    const exportData = filteredItems.map((i) => ({
      ...i,
      item_number: i.item_number || i.no || "",
      item_name: i.item_name || "",
      work_category: i.work_category || i.kelompok || "",
      unit: i.unit || i.satuan || "",
      quantity: i.quantity || i.volume || 0,
      unit_price: i.unit_price || i.harga_satuan || 0,
      total_price: i.total_price || i.total_harga || 0,
      progress_percent: Number(i.progress_percent || 0).toFixed(2),
      actual_quantity: Number(i.actual_quantity || 0).toFixed(2),
      remaining_quantity: Number(i.remaining_quantity || 0).toFixed(2),
    }));
    exportToCSV("boq-items.csv", cols, exportData);
    toast.success("Data BOQ diekspor ke CSV");
  };

  const handleExportPDF = () => {
    const cols = [
      { key: "item_number", label: "No." },
      { key: "item_name", label: "Item Name" },
      { key: "work_category", label: "Category" },
      { key: "quantity", label: "Qty" },
      { key: "unit", label: "Unit" },
      { key: "unit_price", label: "Unit Price" },
      { key: "total_price", label: "Total" },
      { key: "progress_percent", label: "Progress" },
    ];
    const exportData = filteredItems.map((i) => ({
      ...i,
      item_number: i.item_number || i.no || "",
      item_name: i.item_name || "",
      work_category: i.work_category || i.kelompok || "",
      quantity: fmtNumber(i.quantity || i.volume || 0),
      unit: i.unit || i.satuan || "",
      unit_price: fmtCurrency(i.unit_price || i.harga_satuan || 0),
      total_price: fmtCurrency(i.total_price || i.total_harga || 0),
      progress_percent: `${Number(i.progress_percent || 0).toFixed(1)}%`,
    }));
    const projectName = projects.find((p) => p.id === selectedProject)?.name || "BOQ";
    exportToPDF(`BOQ - ${projectName}`, cols, exportData);
  };

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleRow = (id) => {
    setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const SortHeader = ({ field, children }) => (
    <th
      className="py-2 px-3 text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ArrowUpDown className={`w-3 h-3 ${sortDir === "desc" ? "rotate-180" : ""}`} />
        )}
      </div>
    </th>
  );

  return (
    <div className="space-y-6">
      <PageHeader title="BOQ Management" subtitle="Bill of Quantities - Upload, manage, and track project budget items" icon={Database}>
        {canEdit && (
          <>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
              <FileDown className="w-4 h-4" /> Template
            </Button>
            <label>
              <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} className="hidden" disabled={!selectedProject || uploading || extracting} />
              <Button variant="outline" size="sm" className="gap-2 cursor-pointer" disabled={!selectedProject || uploading || extracting} asChild>
                <span>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileUp className="w-4 h-4" />}
                  {uploading ? "Uploading..." : extracting ? "Processing..." : "Upload BOQ"}
                </span>
              </Button>
            </label>
          </>
        )}
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2" disabled={!boqItems.length}>
          <FileSpreadsheet className="w-4 h-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2" disabled={!boqItems.length}>
          <FileText className="w-4 h-4" /> PDF
        </Button>
        <Button
          variant="outline" size="sm" onClick={() => { setShowRevisions(!showRevisions); if (!showRevisions) setActiveTab("revisions"); }}
          className="gap-2"
        >
          <History className="w-4 h-4" /> Revisions
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
          {extracting && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing uploaded file...
            </div>
          )}
        </div>
      </GlassCard>

      {/* Summary Cards */}
      {boqItems.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{boqItems.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Items</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{fmtCurrency(totalNilai)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total BOQ</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{fmtCurrency(totalCompleted)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Completed Value</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{fmtCurrency(totalRemaining)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Remaining Budget</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{fmtNumber(avgProgress)}%</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Avg Progress</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-purple-400">{categories.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Categories</p>
          </GlassCard>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="glass-strong">
          <TabsTrigger value="items" className="gap-2">
            <ListChecks className="w-4 h-4" /> BOQ Items
          </TabsTrigger>
          <TabsTrigger value="revisions" className="gap-2">
            <History className="w-4 h-4" /> Revision History
          </TabsTrigger>
          <TabsTrigger value="summary" className="gap-2">
            <BarChart3 className="w-4 h-4" /> Summary
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-4">
          {/* Search & Filters */}
          {boqItems.length > 0 && (
            <GlassCard className="p-3 mb-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search items, categories, vendors..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-full md:w-44">
                    <Filter className="w-3.5 h-3.5 mr-1" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Revised">Revised</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </GlassCard>
          )}

          <GlassCard className="p-4">
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
            ) : boqItems.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {selectedProject
                    ? "No BOQ items yet. Upload a CSV file or download the template to get started."
                    : "Select a project first."}
                </p>
                {selectedProject && canEdit && (
                  <div className="flex gap-2 justify-center mt-4">
                    <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="gap-2">
                      <FileDown className="w-4 h-4" /> Download Template
                    </Button>
                    <label>
                      <input type="file" accept=".csv,.xlsx,.xls" onChange={handleUpload} className="hidden" />
                      <Button variant="outline" size="sm" className="gap-2 cursor-pointer" asChild>
                        <span><Upload className="w-4 h-4" /> Upload CSV</span>
                      </Button>
                    </label>
                  </div>
                )}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No items match your search/filter criteria.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 px-2 w-8"></th>
                      <SortHeader field="item_number">No.</SortHeader>
                      <SortHeader field="item_name">Item Name</SortHeader>
                      <SortHeader field="work_category">Category</SortHeader>
                      <SortHeader field="quantity">Qty</SortHeader>
                      <SortHeader field="unit">Unit</SortHeader>
                      <SortHeader field="unit_price">Unit Price</SortHeader>
                      <SortHeader field="total_price">Total</SortHeader>
                      <SortHeader field="progress_percent">Progress</SortHeader>
                      <SortHeader field="approval_status">Status</SortHeader>
                      <th className="py-2 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map((item) => (
                      <React.Fragment key={item.id}>
                        <tr className="border-b border-border/50 hover:bg-muted/10 cursor-pointer" onClick={() => toggleRow(item.id)}>
                          <td className="py-2 px-2">
                            {expandedRows[item.id] ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                          </td>
                          <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{item.item_number || item.no || "—"}</td>
                          <td className="py-2 px-3 font-medium max-w-[200px] truncate">{item.item_name || "—"}</td>
                          <td className="py-2 px-3 text-muted-foreground text-xs">{item.work_category || item.kelompok || "—"}</td>
                          <td className="py-2 px-3 text-right">{fmtNumber(item.quantity || item.volume || 0)}</td>
                          <td className="py-2 px-3 text-muted-foreground">{item.unit || item.satuan || "—"}</td>
                          <td className="py-2 px-3 text-right">{fmtCurrency(item.unit_price || item.harga_satuan)}</td>
                          <td className="py-2 px-3 text-right font-medium">{fmtCurrency(item.total_price || item.total_harga || 0)}</td>
                          <td className="py-2 px-3">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden min-w-[40px]">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${Math.min(100, Number(item.progress_percent || 0))}%`,
                                    background: Number(item.progress_percent || 0) >= 100
                                      ? "hsl(142 71% 45%)"
                                      : Number(item.progress_percent || 0) > 0
                                        ? "hsl(199 89% 52%)"
                                        : "hsl(215 20% 65%)",
                                  }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground w-10 text-right">
                                {Number(item.progress_percent || 0).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <Badge className={`text-[10px] px-2 py-0.5 ${STATUS_COLORS[item.approval_status] || STATUS_COLORS["Draft"]}`}>
                              {item.approval_status || "Draft"}
                            </Badge>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex justify-center gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setViewItem(item); }}>
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteItem(item); }}>
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </>
                              )}
                              {canApprove && item.approval_status !== "Approved" && (
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-400" onClick={(e) => { e.stopPropagation(); setApprovalItem(item); setApprovalAction("Approved"); }}>
                                  <CheckCircle className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {expandedRows[item.id] && (
                          <tr className="bg-muted/5">
                            <td colSpan={11} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                                  <p className="mt-1">{item.description || item.item_name || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendor</p>
                                  <p className="mt-1">{item.vendor || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual Quantity</p>
                                  <p className="mt-1 font-medium">{fmtNumber(item.actual_quantity || 0)} {item.unit || item.satuan || ""}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining Quantity</p>
                                  <p className="mt-1 font-medium">{fmtNumber(item.remaining_quantity || 0)} {item.unit || item.satuan || ""}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed Value</p>
                                  <p className="mt-1 font-medium text-emerald-400">{fmtCurrency(item.completed_value || 0)}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining Budget</p>
                                  <p className="mt-1 font-medium text-amber-400">{fmtCurrency((item.total_price || item.total_harga || 0) - (item.completed_value || 0))}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</p>
                                  <p className="mt-1">{item.notes || "—"}</p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Last Updated</p>
                                  <p className="mt-1">{item.updated_date ? new Date(item.updated_date).toLocaleDateString() : "—"}</p>
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
                  <span>Showing {filteredItems.length} of {boqItems.length} items</span>
                  <span>Total: {fmtCurrency(totalNilai)}</span>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* Revisions Tab */}
        <TabsContent value="revisions" className="mt-4">
          <GlassCard className="p-4">
            {revisions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No revision history yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {revisions.map((rev) => (
                  <div key={rev.id} className="flex items-start gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/10">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <History className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold">Revision {rev.revision}</span>
                        <Badge variant="outline" className="text-[10px]">{rev.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {rev.import_date ? new Date(rev.import_date).toLocaleString() : ""}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {rev.item_count} items • Total: {fmtCurrency(rev.total_value || 0)}
                        {rev.imported_by_name && ` • by ${rev.imported_by_name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> BOQ Summary
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Total Items</span>
                  <span className="text-sm font-semibold">{boqItems.length}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Total BOQ Value</span>
                  <span className="text-sm font-semibold text-primary">{fmtCurrency(totalNilai)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Completed Value</span>
                  <span className="text-sm font-semibold text-emerald-400">{fmtCurrency(totalCompleted)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Remaining Budget</span>
                  <span className="text-sm font-semibold text-amber-400">{fmtCurrency(totalRemaining)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-border/50">
                  <span className="text-sm text-muted-foreground">Average Progress</span>
                  <span className="text-sm font-semibold text-blue-400">{fmtNumber(avgProgress)}%</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-muted-foreground">Categories</span>
                  <span className="text-sm font-semibold">{categories.length}</span>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-4">
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" /> Category Breakdown
              </h3>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const catItems = boqItems.filter((i) => (i.work_category || i.kelompok) === cat);
                  const catTotal = catItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
                  const catProgress = catItems.reduce((s, i) => s + Number(i.progress_percent || 0), 0) / catItems.length;
                  const pct = totalNilai > 0 ? (catTotal / totalNilai * 100) : 0;
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="font-medium">{fmtCurrency(catTotal)} ({fmtNumber(pct)}%)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-12 text-right">{fmtNumber(catProgress)}%</span>
                      </div>
                    </div>
                  );
                })}
                {categories.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">No categories</p>
                )}
              </div>
            </GlassCard>
          </div>
        </TabsContent>
      </Tabs>

      {/* View Item Dialog */}
      <Dialog open={!!viewItem} onOpenChange={(open) => !open && setViewItem(null)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewItem?.item_name || viewItem?.item_number || "Item Details"}</DialogTitle>
            <DialogDescription>Complete BOQ item information</DialogDescription>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Item Number</p>
                  <p className="text-sm font-medium mt-1">{viewItem.item_number || viewItem.no || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Category</p>
                  <p className="text-sm font-medium mt-1">{viewItem.work_category || viewItem.kelompok || "—"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-sm mt-1">{viewItem.description || viewItem.item_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Quantity</p>
                  <p className="text-sm font-medium mt-1">{fmtNumber(viewItem.quantity || viewItem.volume || 0)} {viewItem.unit || viewItem.satuan || ""}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Unit Price</p>
                  <p className="text-sm font-medium mt-1">{fmtCurrency(viewItem.unit_price || viewItem.harga_satuan)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Price</p>
                  <p className="text-sm font-semibold mt-1">{fmtCurrency(viewItem.total_price || viewItem.total_harga || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Vendor</p>
                  <p className="text-sm font-medium mt-1">{viewItem.vendor || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Progress</p>
                  <p className="text-sm font-medium mt-1">{Number(viewItem.progress_percent || 0).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual Quantity</p>
                  <p className="text-sm font-medium mt-1">{fmtNumber(viewItem.actual_quantity || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Remaining Quantity</p>
                  <p className="text-sm font-medium mt-1">{fmtNumber(viewItem.remaining_quantity || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Completed Value</p>
                  <p className="text-sm font-medium text-emerald-400">{fmtCurrency(viewItem.completed_value || 0)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                  <Badge className={`mt-1 ${STATUS_COLORS[viewItem.approval_status] || STATUS_COLORS["Draft"]}`}>
                    {viewItem.approval_status || "Draft"}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Notes</p>
                  <p className="text-sm mt-1">{viewItem.notes || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="glass-strong max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit BOQ Item</DialogTitle>
            <DialogDescription>{editItem?.item_name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Number</Label>
                <Input value={editForm.item_number || ""} onChange={(e) => setEditForm(prev => ({ ...prev, item_number: e.target.value }))} placeholder="1.1" />
              </div>
              <div className="space-y-2">
                <Label>Work Category</Label>
                <Input value={editForm.work_category || ""} onChange={(e) => setEditForm(prev => ({ ...prev, work_category: e.target.value }))} placeholder="Structural, Architectural, MEP..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Item Name</Label>
              <Input value={editForm.item_name || ""} onChange={(e) => setEditForm(prev => ({ ...prev, item_name: e.target.value }))} placeholder="Concrete Work - Column C1" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={editForm.description || ""} onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" step="0.01" value={editForm.quantity} onChange={(e) => setEditForm(prev => ({ ...prev, quantity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={editForm.unit || ""} onChange={(e) => setEditForm(prev => ({ ...prev, unit: e.target.value }))} placeholder="m3, kg, unit..." />
              </div>
              <div className="space-y-2">
                <Label>Unit Price</Label>
                <Input type="number" step="1" value={editForm.unit_price} onChange={(e) => setEditForm(prev => ({ ...prev, unit_price: Number(e.target.value) }))} />
              </div>
              <div className="space-y-2">
                <Label>Total (auto)</Label>
                <Input value={fmtCurrency(Number(editForm.quantity || 0) * Number(editForm.unit_price || 0))} disabled />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Input value={editForm.vendor || ""} onChange={(e) => setEditForm(prev => ({ ...prev, vendor: e.target.value }))} placeholder="PT. ABC Konstruksi" />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={editForm.area || ""} onChange={(e) => setEditForm(prev => ({ ...prev, area: e.target.value }))} placeholder="Lantai 1, Wing A..." />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={editForm.notes || ""} onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              <Button type="submit" disabled={saving} className="gradient-primary">
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete BOQ Item</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteItem?.item_name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={!!approvalItem} onOpenChange={(open) => !open && setApprovalItem(null)}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Approval Status</DialogTitle>
            <DialogDescription>
              {approvalAction === "Approved"
                ? `Approve "${approvalItem?.item_name}"?`
                : approvalAction === "Rejected"
                  ? `Reject "${approvalItem?.item_name}"?`
                  : `Submit "${approvalItem?.item_name}" for approval?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { setApprovalItem(null); setApprovalAction(""); }}>Cancel</Button>
            <Button
              variant={approvalAction === "Approved" ? "default" : approvalAction === "Rejected" ? "destructive" : "outline"}
              onClick={handleApproval}
              className={approvalAction === "Approved" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
            >
              {approvalAction === "Approved" ? "Approve" : approvalAction === "Rejected" ? "Reject" : "Submit"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" /> Duplicate Items Detected
            </DialogTitle>
            <DialogDescription>
              {duplicateCheck.length} item(s) with the same item number already exist. They will be skipped during import.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-40 overflow-y-auto space-y-1">
            {duplicateCheck.map((d, i) => (
              <div key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                <Ban className="w-3.5 h-3.5 text-amber-400" />
                {d.item_number || d.no}: {d.item_name || d.description}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowDuplicateDialog(false)}>Continue Import</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}