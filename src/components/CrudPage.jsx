import React, { useState, useEffect, useCallback, useMemo } from "react";
import { base44 } from "@/api/appClient";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import PageHeader from "@/components/PageHeader";
import DataTable from "@/components/DataTable";
import { Search, Plus, Download, FileText, Loader2, Trash2 } from "lucide-react";
import { exportToCSV, exportToPDF } from "@/lib/export";

export default function CrudPage({
  entityName,
  title,
  subtitle,
  icon,
  columns,
  formFields,
  defaultForm,
  searchKeys = [],
  pageSize = 10,
  onAfterSave,
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const entity = base44.entities[entityName];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const items = await entity.list("-created_date", 200);
      setData(items);
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter by search
  const filtered = useMemo(() => {
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        return val != null && String(val).toLowerCase().includes(q);
      })
    );
  }, [data, search, searchKeys]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const handleOpenCreate = () => {
    setEditItem(null);
    setForm(defaultForm);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditItem(item);
    const formCopy = { ...defaultForm };
    formFields.forEach((f) => {
      if (item[f.name] !== undefined) formCopy[f.name] = item[f.name];
    });
    setForm(formCopy);
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editItem) {
        await entity.update(editItem.id, form);
        toast.success("Record updated successfully");
      } else {
        await entity.create(form);
        toast.success("Record created successfully");
      }
      if (onAfterSave) {
        try { await onAfterSave(form, !!editItem); } catch {}
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(editItem ? "Failed to update" : "Failed to create");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await entity.delete(deleteItem.id);
      toast.success("Record deleted");
      setDeleteItem(null);
      loadData();
    } catch (err) {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCSV = () => {
    const exportCols = columns.map((c) => ({ key: c.key, label: c.label }));
    exportToCSV(`${title.toLowerCase().replace(/\s+/g, "-")}.csv`, exportCols, filtered);
  };

  const handleExportPDF = () => {
    const exportCols = columns.map((c) => ({ key: c.key, label: c.label }));
    exportToPDF(`${title} Report`, exportCols, filtered);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} icon={icon}>
        <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
          <Download className="w-4 h-4" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2">
          <FileText className="w-4 h-4" />
          PDF
        </Button>
        <Button size="sm" onClick={handleOpenCreate} className="gap-2 gradient-primary">
          <Plus className="w-4 h-4" />
          Add New
        </Button>
      </PageHeader>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={`Search ${title.toLowerCase()}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 bg-muted/30"
        />
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        loading={loading}
        onEdit={handleEdit}
        onDelete={setDeleteItem}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        renderCell={(key, value) => renderCell(key, value)}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="glass-strong max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">{editItem ? `Edit ${title}` : `New ${title}`}</DialogTitle>
            <DialogDescription>
              {editItem ? "Update the record details below." : "Fill in the details to create a new record."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            {formFields.map((field) => (
              <div key={field.name} className="space-y-2">
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {field.type === "select" ? (
                  <Select
                    value={String(form[field.name] ?? "")}
                    onValueChange={(val) => setForm((prev) => ({ ...prev, [field.name]: val }))}
                  >
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder={`Select ${field.label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent className="glass-strong">
                      {field.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.name]: e.target.value }))}
                    placeholder={field.placeholder || field.label}
                    rows={3}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || "text"}
                    value={form[field.name] ?? ""}
                    onChange={(e) => setForm((prev) => ({
                      ...prev,
                      [field.name]: field.type === "number" ? Number(e.target.value) : e.target.value,
                    }))}
                    placeholder={field.placeholder || field.label}
                    required={field.required}
                  />
                )}
              </div>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="gradient-primary">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {editItem ? "Save Changes" : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Record</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper: render cell with badges for status fields
function renderCell(key, value) {
  if (value == null || value === "") return <span className="text-muted-foreground/50">—</span>;

  if (key === "status" || key === "severity" || key === "risk_level" || key === "priority") {
    const colors = {
      // Statuses
      Active: "bg-green-500/15 text-green-400 border-green-500/30",
      Inactive: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      Admitted: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      Discharged: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      Scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      Confirmed: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      Completed: "bg-green-500/15 text-green-400 border-green-500/30",
      Cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
      Pending: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      Paid: "bg-green-500/15 text-green-400 border-green-500/30",
      Overdue: "bg-red-500/15 text-red-400 border-red-500/30",
      Partial: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      Open: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      Resolved: "bg-green-500/15 text-green-400 border-green-500/30",
      Closed: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      "In Progress": "bg-blue-500/15 text-blue-400 border-blue-500/30",
      Planning: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      Identified: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      Assessed: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
      Mitigating: "bg-purple-500/15 text-purple-400 border-purple-500/30",
      Monitoring: "bg-blue-500/15 text-blue-400 border-blue-500/30",
      Archived: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      Suspended: "bg-red-500/15 text-red-400 border-red-500/30",
      "On Hold": "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      // Severity / Priority
      Low: "bg-slate-500/15 text-slate-400 border-slate-500/30",
      Medium: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
      High: "bg-orange-500/15 text-orange-400 border-orange-500/30",
      Critical: "bg-red-500/15 text-red-400 border-red-500/30",
    };
    const colorClass = colors[value] || "bg-muted/20 text-muted-foreground border-border";
    return (
      <Badge variant="outline" className={`font-medium ${colorClass}`}>
        {value}
      </Badge>
    );
  }

  if (key === "amount" || key === "total" || key === "budget" || key === "spent" || key === "consultation_fee" || key === "contract_value") {
    return <span className="font-medium">{Number(value).toLocaleString("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 })}</span>;
  }

  if (key === "progress") {
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full gradient-primary" style={{ width: `${Math.min(value, 100)}%` }} />
        </div>
        <span className="text-xs text-muted-foreground">{value}%</span>
      </div>
    );
  }

  return String(value);
}
