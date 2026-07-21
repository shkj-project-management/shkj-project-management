import React, { useEffect, useState } from "react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import { ROLES, ROLE_ACCESS_LEVEL, resolveRole } from "@/lib/roles";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Users,
  UserPlus,
  Save,
  Upload,
  Shield,
  Mail,
  Loader2,
  ArrowUpRight,
} from "lucide-react";

export default function Settings() {
  const { user, canManageUsers } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [tab, setTab] = useState("profile");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Aplikasi"
        subtitle="Kelola profil perusahaan dan tim proyek Anda"
        icon={Building2}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="profile" className="gap-2">
            <Building2 className="w-4 h-4" />
            Profil Perusahaan
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="w-4 h-4" />
            Tim Proyek
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <CompanyProfileTab />
        </TabsContent>

        <TabsContent value="team" className="mt-6">
          <TeamTab currentUser={user} onToast={toast} />
        </TabsContent>
      </Tabs>

      {/* Super Admin link to full User Management */}
      {canManageUsers && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => navigate("/user-management")}
            className="gap-2"
          >
            <Shield className="w-4 h-4" />
            Open Full User Management
            <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Company Profile Tab ---------------- */
function CompanyProfileTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const emptyProfile = {
    name: "",
    logo_url: "",
    address: "",
    phone: "",
    email: "",
    npwp: "",
    website: "",
    description: "",
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const items = await appClient.entities.CompanyProfile.list("-updated_date", 1);
      if (items && items.length > 0) {
        setProfile(items[0]);
      } else {
        setProfile(emptyProfile);
      }
    } catch (e) {
      setProfile(emptyProfile);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleChange = (field, value) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      handleChange("logo_url", file_url);
      toast({ title: "Logo berhasil diunggah" });
    } catch (err) {
      toast({ title: "Gagal mengunggah logo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profile.name) {
      toast({ title: "Nama perusahaan wajib diisi", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      if (profile.id) {
        await appClient.entities.CompanyProfile.update(profile.id, profile);
      } else {
        const created = await appClient.entities.CompanyProfile.create(profile);
        setProfile(created);
      }
      toast({ title: "Profil perusahaan berhasil disimpan" });
    } catch (err) {
      toast({ title: "Gagal menyimpan profil", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Logo card */}
      <GlassCard className="lg:col-span-1">
        <h3 className="text-sm font-semibold text-foreground mb-4">Logo Perusahaan</h3>
        <div className="flex flex-col items-center gap-4">
          <div className="w-32 h-32 rounded-xl border-2 border-border/60 bg-muted/20 flex items-center justify-center overflow-hidden">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-12 h-12 text-muted-foreground/40" />
            )}
          </div>
          <label className="cursor-pointer">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
              disabled={uploading}
            />
            <Button variant="outline" size="sm" asChild disabled={uploading}>
              <span>
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading ? "Mengunggah..." : "Unggah Logo"}
              </span>
            </Button>
          </label>
        </div>
      </GlassCard>

      {/* Form card */}
      <GlassCard className="lg:col-span-2">
        <h3 className="text-sm font-semibold text-foreground mb-4">Informasi Perusahaan</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label>Nama Perusahaan *</Label>
            <Input
              value={profile.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="PT. Konstruksi Sejahtera"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Alamat</Label>
            <Textarea
              value={profile.address || ""}
              onChange={(e) => handleChange("address", e.target.value)}
              placeholder="Jl. Sudirman No. 1, Jakarta"
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Telepon</Label>
            <Input
              value={profile.phone || ""}
              onChange={(e) => handleChange("phone", e.target.value)}
              placeholder="021-555-0123"
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={profile.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="info@perusahaan.co.id"
            />
          </div>
          <div className="space-y-2">
            <Label>NPWP</Label>
            <Input
              value={profile.npwp || ""}
              onChange={(e) => handleChange("npwp", e.target.value)}
              placeholder="01.234.567.8-901.000"
            />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input
              value={profile.website || ""}
              onChange={(e) => handleChange("website", e.target.value)}
              placeholder="https://perusahaan.co.id"
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label>Deskripsi</Label>
            <Textarea
              value={profile.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Deskripsi singkat perusahaan..."
              rows={3}
            />
          </div>
        </div>
        <div className="flex justify-end mt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Simpan Perubahan
          </Button>
        </div>
      </GlassCard>
    </div>
  );
}

/* ---------------- Team Tab ---------------- */
function TeamTab({ currentUser, onToast }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("User Department");
  const [inviting, setInviting] = useState(false);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const users = await appClient.entities.User.list();
      setMembers(users || []);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail) {
      onToast({ title: "Email wajib diisi", variant: "destructive" });
      return;
    }
    try {
      setInviting(true);
      await appClient.users.inviteUser(inviteEmail, inviteRole);
      onToast({ title: `Undangan terkirim ke ${inviteEmail}` });
      setInviteEmail("");
      setInviteRole("User Department");
      setInviteOpen(false);
      loadMembers();
    } catch (err) {
      onToast({
        title: "Gagal mengirim undangan",
        description: err?.message || "Terjadi kesalahan",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const getInitials = (name) =>
    (name || "U")
      .split(" ")
      .map((s) => s[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const sortedMembers = [...members].sort((a, b) => {
    const ra = ROLE_ACCESS_LEVEL[resolveRole(a.role)] || 1;
    const rb = ROLE_ACCESS_LEVEL[resolveRole(b.role)] || 1;
    return rb - ra;
  });

  return (
    <div className="space-y-4">
      <GlassCard hover={false}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Tim Proyek</h3>
              <p className="text-sm text-muted-foreground">
                {members.length} anggota terdaftar
              </p>
            </div>
          </div>
          <Button onClick={() => setInviteOpen(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Undang Anggota
          </Button>
        </div>
      </GlassCard>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedMembers.map((member) => {
            const role = resolveRole(member.role);
            const level = ROLE_ACCESS_LEVEL[role] || 1;
            const isYou = member.id === currentUser?.id;
            return (
              <GlassCard key={member.id} hover={false} className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="gradient-primary text-primary-foreground text-sm font-semibold">
                      {getInitials(member.full_name || member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {member.full_name || member.email?.split("@")[0]}
                      </p>
                      {isYou && (
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      {member.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <Badge
                    variant={level >= 4 ? "default" : level >= 3 ? "secondary" : "outline"}
                    className="gap-1"
                  >
                    <Shield className="w-3 h-3" />
                    {role}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    Lv. {level}
                  </span>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="glass-strong">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Undang Anggota Tim
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email Anggota</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="nama@perusahaan.co.id"
              />
            </div>
            <div className="space-y-2">
              <Label>Role / Jabatan</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent className="glass-strong max-h-60">
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Super Admin & Project Director akan memiliki akses admin penuh.
              </p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button onClick={handleInvite} disabled={inviting}>
              {inviting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Kirim Undangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
