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
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { useAuth } from "@/lib/AuthContext";
import {
  Loader2, Plus, Edit3, Trash2, Eye, Search, Filter,
  ChevronDown, ChevronUp, ArrowUpDown,
} from "lucide-react";

const fmtCurrency = (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`;
const fmtNumber = (val) => Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 });

const defaultStatusColors = {
  "Open": "bg-red-500/20 text-red-300 border-red-500/30",
  "Closed": "bg-green-500/20 text-green-300 border-green-500/30",
  "In Progress": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Completed": "bg-green-500/20 text-green-300 border-green-500/30",
  "Active": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Expired": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Draft": "bg-slate-500/20 text-slate-300 border-slate-500/30",
  "Submitted": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Approved": "bg-green-500/20 text-green-300 border-green-500/30",
  "Rejected": "bg-red-500/20 text-red-300 border-red-500/30",
};

export default function CrudModule({
  title,
  subtitle,
  icon,
  entity,
  listMethod,
  createMethod,
  updateMethod,
  deleteMethod,
  columns,
  formFields,
  defaultForm,
  statusField = "status",
  statusColors = defaultStatusColors,
  filterFields = [],
  canEdit = true,
  canDelete = true,
  projectFilter = false,
}) {
  const { user, role } = useAuth();
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);
  const [sortField, setSortField] = useState("created_date");
  const [sortDir, setSortDir] = useState("desc");
  const [expandedRows, setExpandedRows] = useState({});
  const [form, setForm] = useState(defaultForm || {});

  useEffect(() => {
    if (projectFilter) {
      appClient.entities.Project.list("-created_date", 200).then(setProjects).catch(() => {});
    }
  }, [projectFilter]);

  useEffect(() => { loadData(); }, [selectedProject]);

  const loadData = async () => {
    setLoading(true);
    try {
      const listFn = listMethod || (() => appClient.entities[entity].list("-created_date", 500));
      const data = await (selectedProject ? listMethod(selectedProject) : listMethod());
      setRecords(data || []);
    } catch (e) { toast.error("Failed to load data"); }
    finally { setLoading(false); }
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (selectedProject) payload.project_id = selectedProject;
      const createFn = createMethod || (() => appClient.entities[entity].create(payload));
      await createFn(payload);
      toast.success(`${title} created successfully`);
      setShowForm(false);
      setForm(defaultForm || {});
      loadData();
    } catch (e) { toast.error(e.message || "Failed to create"); }
    finally { setSaving(false); }
  };

  const handleUpdate = async () => {
    if (!editingRecord) return;
    setSaving(true);
    try {
      const updateFn = updateMethod || (() => appClient.entities[entity].update(editingRecord.id, form));
      await updateFn(editingRecord.id, form);
      toast.success(`${title} updated successfully`);
      setShowForm(false);
      setEditingRecord(null);
      setForm(defaultForm || {});
      loadData();
    } catch (e) { toast.error(e.message || "Failed to update"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      const deleteFn = deleteMethod || (() => appClient.entities[entity].delete(id));
      await deleteFn(id);
      toast.success(`${title} deleted`);
      setDeleteRecord(null);
      loadData();
    } catch (e) { toast.error(e.message || "Failed to delete"); }
  };

  const openEdit = (record) => {
    setForm(record);
    setEditingRecord(record);
    setShowForm(true);
  };

  const openCreate = () => {
    setForm(defaultForm ? { ...defaultForm } : {});
    setEditingRecord(null);
    setShowForm(true);
  };

  const filteredRecords = useMemo(() => {
    let filtered = [...records];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((r) =>
        columns.some((c) => {
          const val = r[c.field];
          return val && String(val).toLowerCase().includes(q);
        })
      );
    }
    if (filterStatus !== "all" && statusField) {
      filtered = filtered.filter((r) => r[statusField] === filterStatus);
    }
    filtered.sort((a, b) => {
      const aVal = String(a[sortField] || "");
      const bVal = String(b[sortField] || "");
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
    return filtered;
  }, [records, searchQuery, filterStatus, sortField, sortDir]);

  const statusOptions = useMemo(() => {
    const opts = new Set();
    records.forEach((r) => { if (r[statusField]) opts.add(r[statusField]); });
    return ["all", ...opts];
  }, [records, statusField]);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const renderField = (field) => {
    if (!field) return null;
    const val = form[field.name];
    if (field.type === "select") {
      return (
        <Select value={val || ""} onValueChange={(v) => setForm((f) => ({ ...f, [field.name]: v }))}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || `Select ${field.label}`} /></SelectTrigger>
          <SelectContent>
            {field.options?.map((opt) => (
              <SelectItem key={typeof opt === "object" ? opt.value : opt} value={typeof opt === "object" ? opt.value : opt}>
                {typeof opt === "object" ? opt.label : opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === "textarea") {
      return <Textarea value={val || ""} onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))} placeholder={field.placeholder} />;
    }
    if (field.type === "number") {
      return <Input type="number" value={val || ""} onChange={(e) => setForm((f) => ({ ...f, [field.name]: Number(e.target.value) }))} placeholder={field.placeholder} />;
    }
    if (field.type === "date") {
      return <Input type="date" value={val || ""} onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))} />;
    }
    return <Input value={val || ""} onChange={(e) => setForm((f) => ({ ...f, [field.name]: e.target.value }))} placeholder={field.placeholder} />;
  };

  const renderCell = (record, field) => {
    const val = record[field];
    if (field === statusField) {
      return <Badge className={`${statusColors[val] || "bg-slate-500/20 text-slate-300"} border text-xs`}>{val || "-"}</Badge>;
    }
    if (typeof val === "number" && field.toLowerCase().includes("price") || field.toLowerCase().includes("cost") || field.toLowerCase().includes("value") || field.toLowerCase().includes("budget")) {
      return fmtCurrency(val);
    }
    if (typeof val === "number") return fmtNumber(val);
    if (Array.isArray(val)) return `${val.length} items`;
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return val || "-";
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
      <PageHeader title={title} subtitle={subtitle} icon={icon} />

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {projectFilter && projects.length > 0 && (
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name || p.code || p.id}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          {statusOptions.length > 1 && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><Filter className="w-3.5 h-3.5 mr-2" />Status</SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => (
                  <SelectItem key={s} value={s}>{s === "all" ? "All Status" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {canEdit && (
            <Button onClick={openCreate} className="ml-auto">
              <Plus className="w-4 h-4 mr-2" /> Add {title}
            </Button>
          )}
        </div>
      </GlassCard>

      {/* Data Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {columns.map((col) => (
                  <th
                    key={col.field}
                    className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground"
                    onClick={() => toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      <ArrowUpDown className="w-3 h-3" />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-slate-700/20 transition-colors">
                  {columns.map((col) => (
                    <td key={col.field} className="px-4 py-3 text-sm text-foreground">
                      {renderCell(record, col.field)}
                    </td>
                  ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setViewRecord(record)} title="View">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openEdit(record)} title="Edit">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-red-400 hover:text-red-300" onClick={() => setDeleteRecord(record)} title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecord ? `Edit ${title}` : `Create ${title}`}</DialogTitle>
            <DialogDescription>Fill in the details below</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {formFields.map((field) => (
              <div key={field.name} className={field.fullWidth ? "md:col-span-2" : ""}>
                <Label className="mb-1.5 block text-sm">{field.label}{field.required ? " *" : ""}</Label>
                {renderField(field)}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/50">
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingRecord(null); }}>Cancel</Button>
            <Button onClick={editingRecord ? handleUpdate : handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingRecord ? "Update" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{title} Details</DialogTitle>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3">
              {columns.map((col) => (
                <div key={col.field} className="flex justify-between py-2 border-b border-slate-700/30 last:border-0">
                  <span className="text-sm text-muted-foreground">{col.label}</span>
                  <span className="text-sm font-medium text-foreground">{renderCell(viewRecord, col.field)}</span>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteRecord} onOpenChange={() => setDeleteRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>Are you sure you want to delete this {title.toLowerCase()}? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteRecord(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleDelete(deleteRecord.id)}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}