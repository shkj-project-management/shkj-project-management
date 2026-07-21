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
  Camera, Loader2, Upload, Trash2, Search, Filter, Download,
  Image, Grid3X3, List, Clock, User, MapPin, Layers, Eye,
  ChevronLeft, ChevronRight, X, FileImage, ImagePlus, AlertCircle,
} from "lucide-react";

export default function PhotoProgress() {
  const { role, user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState("");
  const [photos, setPhotos] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [filterBeforeAfter, setFilterBeforeAfter] = useState("all");
  const [viewPhoto, setViewPhoto] = useState(null);
  const [deletePhoto, setDeletePhoto] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [areas, setAreas] = useState([]);

  const [uploadForm, setUploadForm] = useState({
    project_id: "",
    date: new Date().toISOString().split("T")[0],
    area: "",
    floor: "",
    activity: "",
    boq_item_id: "",
    description: "",
    before_after: "Progress",
    image_data: "",
  });

  const canEdit = ["Super Admin", "Project Manager", "Project Officer"].includes(role);

  useEffect(() => {
    appClient.entities.Project.list("-created_date", 200)
      .then((data) => {
        setProjects(data);
        if (data.length > 0) {
          setSelectedProject(data[0].id);
          setUploadForm((prev) => ({ ...prev, project_id: data[0].id }));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedProject) {
      appClient.boq.getItems(selectedProject).then(setBoqItems).catch(() => setBoqItems([]));
    }
  }, [selectedProject]);

  const loadPhotos = useCallback(async () => {
    if (!selectedProject) { setPhotos([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await appClient.photoProgress.list(selectedProject);
      setPhotos(data);
      // Extract unique areas
      const uniqueAreas = [...new Set(data.map((p) => p.area).filter(Boolean))];
      setAreas(uniqueAreas);
    } catch { setPhotos([]); }
    finally { setLoading(false); }
  }, [selectedProject]);

  useEffect(() => { loadPhotos(); }, [loadPhotos]);

  const filteredPhotos = useMemo(() => {
    let items = [...photos];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((p) =>
        (p.description || "").toLowerCase().includes(q) ||
        (p.activity || "").toLowerCase().includes(q) ||
        (p.area || "").toLowerCase().includes(q)
      );
    }
    if (filterArea) items = items.filter((p) => p.area === filterArea);
    if (filterBeforeAfter !== "all") items = items.filter((p) => p.before_after === filterBeforeAfter);
    return items;
  }, [photos, searchQuery, filterArea, filterBeforeAfter]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large. Maximum 10MB.");
      return;
    }

    try {
      const dataUrl = await appClient.utils.fileToDataUrl(file);
      setUploadForm((prev) => ({ ...prev, image_data: dataUrl }));
    } catch {
      toast.error("Failed to read image file");
    }
    e.target.value = "";
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadForm.image_data) {
      toast.error("Please select an image");
      return;
    }
    setUploading(true);
    try {
      await appClient.photoProgress.create({
        project_id: selectedProject,
        date: uploadForm.date,
        area: uploadForm.area,
        floor: uploadForm.floor,
        activity: uploadForm.activity,
        boq_item_id: uploadForm.boq_item_id,
        description: uploadForm.description,
        before_after: uploadForm.before_after,
        image_data: uploadForm.image_data,
      });
      toast.success("Photo uploaded successfully");
      setShowUpload(false);
      setUploadForm({
        project_id: selectedProject,
        date: new Date().toISOString().split("T")[0],
        area: "",
        floor: "",
        activity: "",
        boq_item_id: "",
        description: "",
        before_after: "Progress",
        image_data: "",
      });
      loadPhotos();
    } catch (err) {
      toast.error("Failed to upload photo: " + (err.message || "Unknown error"));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePhoto) return;
    try {
      await appClient.photoProgress.delete(deletePhoto.id);
      toast.success("Photo deleted");
      setDeletePhoto(null);
      loadPhotos();
    } catch { toast.error("Failed to delete photo"); }
  };

  const handleDownload = (photo) => {
    if (photo.image_data) {
      const a = document.createElement("a");
      a.href = photo.image_data;
      a.download = `photo-${photo.id.slice(0, 8)}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Photo Progress" subtitle="Document construction progress with photos" icon={Camera}>
        {canEdit && (
          <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Upload Photo
          </Button>
        )}
        <div className="flex items-center border border-border/50 rounded-lg overflow-hidden">
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none gap-1 ${viewMode === "grid" ? "bg-primary/10 text-primary" : ""}`}
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`rounded-none gap-1 ${viewMode === "list" ? "bg-primary/10 text-primary" : ""}`}
            onClick={() => setViewMode("list")}
          >
            <List className="w-3.5 h-3.5" />
          </Button>
        </div>
      </PageHeader>

      {/* Project & Filter Bar */}
      <GlassCard className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-64">
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
          {photos.length > 0 && (
            <>
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search photos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterArea} onValueChange={setFilterArea}>
                <SelectTrigger className="w-full md:w-36">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="">All Areas</SelectItem>
                  {areas.map((a) => (
                    <SelectItem key={a} value={a}>{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterBeforeAfter} onValueChange={setFilterBeforeAfter}>
                <SelectTrigger className="w-full md:w-36">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent className="glass-strong">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Before">Before</SelectItem>
                  <SelectItem value="After">After</SelectItem>
                  <SelectItem value="Progress">Progress</SelectItem>
                </SelectContent>
              </Select>
            </>
          )}
        </div>
      </GlassCard>

      {/* Photo Gallery */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>
      ) : photos.length === 0 ? (
        <GlassCard className="p-4">
          <div className="text-center py-12">
            <Camera className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {selectedProject ? "No photos yet. Upload photos to document progress." : "Select a project first."}
            </p>
            {selectedProject && canEdit && (
              <Button variant="outline" size="sm" onClick={() => setShowUpload(true)} className="gap-2 mt-4">
                <Upload className="w-4 h-4" /> Upload First Photo
              </Button>
            )}
          </div>
        </GlassCard>
      ) : filteredPhotos.length === 0 ? (
        <GlassCard className="p-4">
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No photos match your filters.</p>
          </div>
        </GlassCard>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredPhotos.map((photo) => (
            <GlassCard key={photo.id} className="p-2 overflow-hidden group cursor-pointer" hover={false}>
              <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-800" onClick={() => setViewPhoto(photo)}>
                {photo.image_data ? (
                  <img
                    src={photo.image_data}
                    alt={photo.description || "Photo"}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                )}
                <Badge className={`absolute top-2 left-2 text-[10px] ${
                  photo.before_after === "Before" ? "bg-amber-500/80" :
                  photo.before_after === "After" ? "bg-emerald-500/80" : "bg-blue-500/80"
                }`}>
                  {photo.before_after || "Progress"}
                </Badge>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                    onClick={(e) => { e.stopPropagation(); setDeletePhoto(photo); }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <div className="mt-2 space-y-1" onClick={() => setViewPhoto(photo)}>
                <p className="text-xs font-medium truncate">{photo.description || photo.activity || "Untitled"}</p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>{photo.date ? new Date(photo.date).toLocaleDateString() : ""}</span>
                  {photo.area && <span>• {photo.area}</span>}
                </div>
                {photo.uploaded_by_name && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <User className="w-3 h-3" />
                    <span className="truncate">{photo.uploaded_by_name}</span>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      ) : (
        /* List View */
        <GlassCard className="p-4">
          <div className="space-y-3">
            {filteredPhotos.map((photo) => (
              <div key={photo.id} className="flex gap-4 p-3 rounded-lg border border-border/50 hover:bg-muted/10">
                <div
                  className="w-24 h-16 rounded-lg overflow-hidden bg-slate-800 shrink-0 cursor-pointer"
                  onClick={() => setViewPhoto(photo)}
                >
                  {photo.image_data ? (
                    <img src={photo.image_data} alt={photo.description || "Photo"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">{photo.description || photo.activity || "Untitled"}</p>
                    <Badge className={`text-[10px] ${
                      photo.before_after === "Before" ? "bg-amber-500/80" :
                      photo.before_after === "After" ? "bg-emerald-500/80" : "bg-blue-500/80"
                    }`}>
                      {photo.before_after || "Progress"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {photo.date && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(photo.date).toLocaleDateString()}</span>}
                    {photo.area && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{photo.area}</span>}
                    {photo.floor && <span className="flex items-center gap-1"><Layers className="w-3 h-3" />{photo.floor}</span>}
                    {photo.uploaded_by_name && <span className="flex items-center gap-1"><User className="w-3 h-3" />{photo.uploaded_by_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(photo)}>
                    <Download className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewPhoto(photo)}>
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeletePhoto(photo)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={(open) => !open && setShowUpload(false)}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload Progress Photo</DialogTitle>
            <DialogDescription>Document construction progress with before/after photos</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpload} className="space-y-4">
            {/* Image preview/upload */}
            <div className="space-y-2">
              <Label>Photo</Label>
              {uploadForm.image_data ? (
                <div className="relative rounded-lg overflow-hidden">
                  <img src={uploadForm.image_data} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-7 w-7 bg-black/50"
                    onClick={() => setUploadForm((prev) => ({ ...prev, image_data: "" }))}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 rounded-lg border-2 border-dashed border-border/50 cursor-pointer hover:border-primary/50 transition-colors">
                  <ImagePlus className="w-10 h-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select image</p>
                  <p className="text-xs text-muted-foreground/50 mt-1">JPG, PNG • Max 10MB</p>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={uploadForm.date}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Area</Label>
                <Input value={uploadForm.area}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, area: e.target.value }))}
                  placeholder="Wing A, Zone 1..." />
              </div>
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input value={uploadForm.floor}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, floor: e.target.value }))}
                  placeholder="Lt. 1" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Activity</Label>
              <Input value={uploadForm.activity}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, activity: e.target.value }))}
                placeholder="Describe the work activity..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>BOQ Item (optional)</Label>
                <Select value={uploadForm.boq_item_id}
                  onValueChange={(v) => setUploadForm((prev) => ({ ...prev, boq_item_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select BOQ item" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong max-h-60">
                    <SelectItem value="">None</SelectItem>
                    {boqItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.item_number || item.no} - {item.item_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={uploadForm.before_after}
                  onValueChange={(v) => setUploadForm((prev) => ({ ...prev, before_after: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-strong">
                    <SelectItem value="Before">Before</SelectItem>
                    <SelectItem value="After">After</SelectItem>
                    <SelectItem value="Progress">Progress</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={uploadForm.description}
                onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={2} placeholder="Add a description..." />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              <Button type="submit" disabled={uploading || !uploadForm.image_data} className="gradient-primary">
                {uploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Upload Photo
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Full-Screen Photo View */}
      <Dialog open={!!viewPhoto} onOpenChange={(open) => !open && setViewPhoto(null)}>
        <DialogContent className="glass-strong max-w-4xl p-0 overflow-hidden">
          {viewPhoto && (
            <div className="flex flex-col md:flex-row">
              <div className="flex-1 bg-slate-900 min-h-[300px] md:min-h-[500px] flex items-center justify-center relative">
                {viewPhoto.image_data ? (
                  <img src={viewPhoto.image_data} alt={viewPhoto.description || "Photo"} className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Image className="w-12 h-12" />
                    <span className="text-sm">Image not available</span>
                  </div>
                )}
              </div>
              <div className="w-full md:w-80 p-4 space-y-4">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Type</p>
                  <Badge className={`mt-1 ${
                    viewPhoto.before_after === "Before" ? "bg-amber-500/80" :
                    viewPhoto.before_after === "After" ? "bg-emerald-500/80" : "bg-blue-500/80"
                  }`}>
                    {viewPhoto.before_after || "Progress"}
                  </Badge>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Date</p>
                  <p className="text-sm font-medium mt-1">{viewPhoto.date ? new Date(viewPhoto.date).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Description</p>
                  <p className="text-sm mt-1">{viewPhoto.description || viewPhoto.activity || "—"}</p>
                </div>
                {viewPhoto.area && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Area / Floor</p>
                    <p className="text-sm mt-1">{viewPhoto.area}{viewPhoto.floor ? ` / ${viewPhoto.floor}` : ""}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uploaded By</p>
                  <p className="text-sm mt-1">{viewPhoto.uploaded_by_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Timestamp</p>
                  <p className="text-sm mt-1">{viewPhoto.timestamp ? new Date(viewPhoto.timestamp).toLocaleString() : "—"}</p>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 gap-2" onClick={() => handleDownload(viewPhoto)}>
                    <Download className="w-4 h-4" /> Download
                  </Button>
                  {canEdit && (
                    <Button variant="destructive" size="sm" className="gap-2" onClick={() => { setDeletePhoto(viewPhoto); setViewPhoto(null); }}>
                      <Trash2 className="w-4 h-4" /> Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deletePhoto} onOpenChange={(open) => !open && setDeletePhoto(null)}>
        <DialogContent className="glass-strong max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>Are you sure you want to delete this photo? This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeletePhoto(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{photos.length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Total Photos</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{photos.filter((p) => p.before_after === "Before").length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Before</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{photos.filter((p) => p.before_after === "After").length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">After</p>
          </GlassCard>
          <GlassCard className="p-3 text-center">
            <p className="text-lg font-bold text-blue-400">{photos.filter((p) => p.before_after === "Progress").length}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Progress</p>
          </GlassCard>
        </div>
      )}
    </div>
  );
}