import React, { useEffect, useState, useCallback } from "react";
import { appClient } from "@/api/appClient";
import { useAuth } from "@/lib/AuthContext";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
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
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  UserPlus,
  Shield,
  Mail,
  Loader2,
  Search,
  MoreHorizontal,
  Edit3,
  Trash2,
  Key,
  UserCheck,
  UserX,
  Activity,
  Building2,
  Layers,
  Lock,
  FolderKanban,
  Settings,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
} from "@/lib/permissions";

export default function UserManagement() {
  const { user, canManageUsers, canViewAuditLogs, canManagePermissions } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState("users");

  // Redirect non-admin users
  if (!canManageUsers) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="User Management"
          subtitle="Manage users, roles, and permissions"
          icon={Users}
        />
        <GlassCard>
          <div className="text-center py-12 text-muted-foreground">
            <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Access Denied</p>
            <p className="text-sm">Only Super Admin can access this page.</p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Manage users, roles, permissions, departments, and teams"
        icon={Users}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-4">
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Users
          </TabsTrigger>
          {(canManagePermissions || canViewAuditLogs) && (
            <TabsTrigger value="permissions" className="gap-2">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          )}
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="w-4 h-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            Activity Log
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          <UsersTab currentUser={user} onToast={toast} />
        </TabsContent>

        {canManagePermissions && (
          <TabsContent value="permissions" className="mt-6">
            <PermissionsTab onToast={toast} />
          </TabsContent>
        )}

        <TabsContent value="departments" className="mt-6">
          <DepartmentsTab onToast={toast} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityLogTab onToast={toast} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ======================== USERS TAB ======================== */
function UsersTab({ currentUser, onToast }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [resetPwOpen, setResetPwOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [userActivities, setUserActivities] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({ email: "", password: "", full_name: "", role: "Viewer" });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await appClient.users.listUsers();
      setUsers(result || []);
    } catch (err) {
      onToast({ title: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [onToast]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      u.full_name?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (b.role === "Super Admin") return 1;
    if (a.role === "Super Admin") return -1;
    return 0;
  });

  const getInitials = (name) =>
    (name || "U").split(" ").map((s) => s[0]).join("").toUpperCase().slice(0, 2);

  const handleCreate = async () => {
    if (!formData.email) {
      onToast({ title: "Email is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      await appClient.users.createUser({
        email: formData.email,
        password: formData.password || "welcome",
        full_name: formData.full_name,
        role: formData.role,
      });
      onToast({ title: `User ${formData.email} created` });
      setCreateOpen(false);
      setFormData({ email: "", password: "", full_name: "", role: "Viewer" });
      loadUsers();
    } catch (err) {
      onToast({ title: "Failed to create user", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) {
      onToast({ title: "Email is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      await appClient.users.inviteUser(inviteEmail, inviteRole);
      onToast({ title: `Invitation sent to ${inviteEmail}` });
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("Viewer");
      loadUsers();
    } catch (err) {
      onToast({ title: "Failed to send invitation", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await appClient.users.updateUser(selectedUser.id, {
        full_name: selectedUser.full_name,
        email: selectedUser.email,
        role: selectedUser.role,
      });
      onToast({ title: "User updated successfully" });
      setEditOpen(false);
      setSelectedUser(null);
      loadUsers();
    } catch (err) {
      onToast({ title: "Failed to update user", description: err?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setSaving(true);
      await appClient.users.deleteUser(deleteConfirm.id);
      onToast({ title: `User ${deleteConfirm.email} deleted` });
      setDeleteConfirm(null);
      loadUsers();
    } catch (err) {
      onToast({ title: "Failed to delete user", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser) return;
    try {
      setSaving(true);
      await appClient.users.resetUserPassword(selectedUser.id, newPassword || "welcome");
      onToast({ title: `Password reset for ${selectedUser.email}` });
      setResetPwOpen(false);
      setNewPassword("");
      setSelectedUser(null);
    } catch (err) {
      onToast({ title: "Failed to reset password", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (userObj) => {
    try {
      await appClient.users.updateUser(userObj.id, { active: !userObj.active });
      onToast({
        title: userObj.active
          ? `User ${userObj.email} deactivated`
          : `User ${userObj.email} activated`,
      });
      loadUsers();
    } catch (err) {
      onToast({ title: "Failed to update user status", variant: "destructive" });
    }
  };

  const handleViewActivity = async (userObj) => {
    try {
      setActivityLoading(true);
      setSelectedUser(userObj);
      const logs = await appClient.users.getUserActivityLogs(userObj.id);
      setUserActivities(logs || []);
      setActivityOpen(true);
    } catch (err) {
      onToast({ title: "Failed to load activity logs", variant: "destructive" });
    } finally {
      setActivityLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header card */}
      <GlassCard hover={false}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">All Users</h3>
              <p className="text-sm text-muted-foreground">
                {users.length} registered users
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                className="pl-9 h-9 w-48"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create User
            </Button>
            <Button variant="outline" onClick={() => setInviteOpen(true)}>
              <Mail className="w-4 h-4 mr-2" />
              Invite
            </Button>
          </div>
        </div>
      </GlassCard>

      {/* Users table */}
      <GlassCard hover={false} className="p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No users found</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedUsers.map((u) => {
                const isYou = u.id === currentUser?.id;
                const isSuperAdmin = u.role === "Super Admin";
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-9 h-9">
                          <AvatarFallback className="gradient-primary text-primary-foreground text-xs font-semibold">
                            {getInitials(u.full_name || u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground flex items-center gap-2">
                            {u.full_name || u.email?.split("@")[0] || "Unknown"}
                            {isYou && (
                              <Badge variant="secondary" className="text-[10px] py-0 px-1.5">You</Badge>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={isSuperAdmin ? "default" : "secondary"} className="gap-1">
                        <Shield className="w-3 h-3" />
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${u.active !== false ? "bg-green-500" : "bg-red-500"}`} />
                        <span className="text-xs text-muted-foreground">
                          {u.active !== false ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {u.created_date ? new Date(u.created_date).toLocaleDateString() : "-"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser({ ...u });
                              setEditOpen(true);
                            }}
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewActivity(u)}>
                            <Activity className="w-4 h-4 mr-2" />
                            View Activity
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedUser({ ...u });
                              setResetPwOpen(true);
                            }}
                          >
                            <Key className="w-4 h-4 mr-2" />
                            Reset Password
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleActive(u)}>
                            {u.active !== false ? (
                              <><UserX className="w-4 h-4 mr-2" /> Deactivate</>
                            ) : (
                              <><UserCheck className="w-4 h-4 mr-2" /> Activate</>
                            )}
                          </DropdownMenuItem>
                          {!isSuperAdmin && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteConfirm(u)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete User
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      {/* Create User Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              Create User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder="Leave empty for default password"
              />
              <p className="text-xs text-muted-foreground">Default: welcome</p>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(v) => setFormData((p) => ({ ...p, role: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                  <SelectItem value="Project Officer">Project Officer</SelectItem>
                  <SelectItem value="HSE">HSE</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Project Manager">Project Manager</SelectItem>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-primary" />
              Invite User by Email
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="john@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Viewer">Viewer</SelectItem>
                  <SelectItem value="Project Officer">Project Officer</SelectItem>
                  <SelectItem value="HSE">HSE</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Project Manager">Project Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleInvite} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              Edit User
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="gradient-primary text-primary-foreground font-semibold">
                    {getInitials(selectedUser.full_name || selectedUser.email)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{selectedUser.email}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedUser.id?.slice(0, 8)}...</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={selectedUser.full_name || ""}
                  onChange={(e) => setSelectedUser((p) => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={selectedUser.email || ""}
                  onChange={(e) => setSelectedUser((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(v) => setSelectedUser((p) => ({ ...p, role: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Viewer">Viewer</SelectItem>
                    <SelectItem value="Project Officer">Project Officer</SelectItem>
                    <SelectItem value="HSE">HSE</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="Project Manager">Project Manager</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label className="text-sm">Active</Label>
                  <p className="text-xs text-muted-foreground">Allow user to log in</p>
                </div>
                <Switch
                  checked={selectedUser.active !== false}
                  onCheckedChange={(v) => setSelectedUser((p) => ({ ...p, active: v }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={resetPwOpen} onOpenChange={setResetPwOpen}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Reset password for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>New Password</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave empty for default password"
              />
              <p className="text-xs text-muted-foreground">Default: welcome</p>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleResetPassword} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(o) => !o && setDeleteConfirm(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteConfirm?.email}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Activity Log Dialog */}
      <Dialog open={activityOpen} onOpenChange={setActivityOpen}>
        <DialogContent className="glass-strong sm:max-w-2xl max-h-[70vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Activity Log: {selectedUser?.email}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {activityLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : userActivities.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <p>No activity logs found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {userActivities.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30"
                  >
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {JSON.stringify(log.details)}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">
                        {new Date(log.created_date || log.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================== PERMISSIONS TAB ======================== */
function PermissionsTab({ onToast }) {
  const [roles, setRoles] = useState([]);
  const [expandedRole, setExpandedRole] = useState(null);
  const [editingRole, setEditingRole] = useState(null);
  const [editedPermissions, setEditedPermissions] = useState([]);
  const [saving, setSaving] = useState(false);

  // Get the role-permission mapping
  const allPermissions = Object.entries(PERMISSIONS);

  useEffect(() => {
    setRoles(Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => ({ role, permissions: perms })));
  }, []);

  const toggleExpand = (role) => {
    if (expandedRole === role) {
      setExpandedRole(null);
      setEditingRole(null);
    } else {
      setExpandedRole(role);
      setEditingRole(null);
    }
  };

  const startEdit = (role) => {
    const found = roles.find((r) => r.role === role);
    setEditingRole(role);
    setEditedPermissions(found ? [...found.permissions] : []);
  };

  const togglePermission = (perm) => {
    setEditedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const savePermissions = async () => {
    try {
      setSaving(true);
      // In local storage mode, we store permissions override per role
      const storageKey = "shkj_pm_role_permissions_overrides";
      const overrides = JSON.parse(localStorage.getItem(storageKey) || "{}");
      overrides[editingRole] = editedPermissions;
      localStorage.setItem(storageKey, JSON.stringify(overrides));
      onToast({ title: `Permissions updated for ${editingRole}` });
      setEditingRole(null);
      // Reload
      setRoles(Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => {
        const overrides2 = JSON.parse(localStorage.getItem(storageKey) || "{}");
        return { role, permissions: overrides2[role] || perms };
      }));
    } catch (err) {
      onToast({ title: "Failed to save permissions", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard hover={false}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Role Permissions</h3>
            <p className="text-sm text-muted-foreground">
              Configure granular permissions for each role
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {roles.map(({ role, permissions }) => (
            <GlassCard key={role} hover={false} className="p-0 overflow-hidden">
              <button
                onClick={() => toggleExpand(role)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge variant={role === "Super Admin" ? "default" : "secondary"}>
                    {role}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {permissions.length} permissions
                  </span>
                </div>
                {expandedRole === role ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {expandedRole === role && (
                <div className="border-t border-border/50 p-4">
                  {editingRole === role ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
                        {allPermissions.map(([key, perm]) => (
                          <label
                            key={perm}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/30 cursor-pointer"
                          >
                            <Switch
                              checked={editedPermissions.includes(perm)}
                              onCheckedChange={() => togglePermission(perm)}
                            />
                            <div>
                              <p className="text-xs font-medium">{key.replace(/_/g, " ")}</p>
                              <p className="text-[10px] text-muted-foreground">{perm}</p>
                            </div>
                          </label>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={savePermissions} disabled={saving}>
                          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingRole(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-[10px]">
                            {perm.split(":").pop()}
                          </Badge>
                        ))}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => startEdit(role)}>
                        <Settings className="w-3 h-3 mr-2" />
                        Edit Permissions
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

/* ======================== DEPARTMENTS & TEAMS TAB ======================== */
function DepartmentsTab({ onToast }) {
  const [departments, setDepartments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deptTab, setDeptTab] = useState("departments");

  // Department form
  const [deptDialog, setDeptDialog] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");
  const [saving, setSaving] = useState(false);

  // Team form
  const [teamDialog, setTeamDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [teamName, setTeamName] = useState("");
  const [teamDept, setTeamDept] = useState("");
  const [teamDesc, setTeamDesc] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const depts = await appClient.departments.list();
      const tms = await appClient.teams.list();
      setDepartments(depts || []);
      setTeams(tms || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreateDept = () => {
    setEditingDept(null);
    setDeptName("");
    setDeptDesc("");
    setDeptDialog(true);
  };

  const openEditDept = (dept) => {
    setEditingDept(dept);
    setDeptName(dept.name || "");
    setDeptDesc(dept.description || "");
    setDeptDialog(true);
  };

  const saveDept = async () => {
    if (!deptName) {
      onToast({ title: "Department name is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      if (editingDept) {
        await appClient.departments.update(editingDept.id, { name: deptName, description: deptDesc });
        onToast({ title: "Department updated" });
      } else {
        await appClient.departments.create({ name: deptName, description: deptDesc });
        onToast({ title: "Department created" });
      }
      setDeptDialog(false);
      loadData();
    } catch (err) {
      onToast({ title: "Failed to save department", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteDept = async (dept) => {
    try {
      await appClient.departments.delete(dept.id);
      onToast({ title: `Department ${dept.name} deleted` });
      loadData();
    } catch {
      onToast({ title: "Failed to delete department", variant: "destructive" });
    }
  };

  const openCreateTeam = () => {
    setEditingTeam(null);
    setTeamName("");
    setTeamDept("");
    setTeamDesc("");
    setTeamDialog(true);
  };

  const openEditTeam = (team) => {
    setEditingTeam(team);
    setTeamName(team.name || "");
    setTeamDept(team.department_id || "");
    setTeamDesc(team.description || "");
    setTeamDialog(true);
  };

  const saveTeam = async () => {
    if (!teamName) {
      onToast({ title: "Team name is required", variant: "destructive" });
      return;
    }
    try {
      setSaving(true);
      const data = { name: teamName, description: teamDesc, department_id: teamDept || null };
      if (editingTeam) {
        await appClient.teams.update(editingTeam.id, data);
        onToast({ title: "Team updated" });
      } else {
        await appClient.teams.create(data);
        onToast({ title: "Team created" });
      }
      setTeamDialog(false);
      loadData();
    } catch (err) {
      onToast({ title: "Failed to save team", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteTeam = async (team) => {
    try {
      await appClient.teams.delete(team.id);
      onToast({ title: `Team ${team.name} deleted` });
      loadData();
    } catch {
      onToast({ title: "Failed to delete team", variant: "destructive" });
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
    <div className="space-y-4">
      <Tabs value={deptTab} onValueChange={setDeptTab}>
        <TabsList className="grid w-full max-w-xs grid-cols-2">
          <TabsTrigger value="departments" className="gap-2">
            <Building2 className="w-4 h-4" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Layers className="w-4 h-4" />
            Teams
          </TabsTrigger>
        </TabsList>

        <TabsContent value="departments" className="mt-4">
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Departments</h3>
                <p className="text-sm text-muted-foreground">{departments.length} departments</p>
              </div>
              <Button size="sm" onClick={openCreateDept}>
                <Plus className="w-4 h-4 mr-2" />
                Add Department
              </Button>
            </div>

            {departments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No departments yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">{dept.name}</p>
                      {dept.description && (
                        <p className="text-xs text-muted-foreground">{dept.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDept(dept)}>
                        <Edit3 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteDept(dept)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <GlassCard hover={false}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Teams</h3>
                <p className="text-sm text-muted-foreground">{teams.length} teams</p>
              </div>
              <Button size="sm" onClick={openCreateTeam}>
                <Plus className="w-4 h-4 mr-2" />
                Add Team
              </Button>
            </div>

            {teams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Layers className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No teams yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {teams.map((team) => {
                  const parentDept = departments.find((d) => d.id === team.department_id);
                  return (
                    <div
                      key={team.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/20"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{team.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {parentDept ? parentDept.name : "No department"}
                          {team.description && ` — ${team.description}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTeam(team)}>
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteTeam(team)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>

      {/* Department Dialog */}
      <Dialog open={deptDialog} onOpenChange={setDeptDialog}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingDept ? "Edit Department" : "Create Department"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={deptName} onChange={(e) => setDeptName(e.target.value)} placeholder="Engineering" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={deptDesc} onChange={(e) => setDeptDesc(e.target.value)} placeholder="Department description" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveDept} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDept ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Dialog */}
      <Dialog open={teamDialog} onOpenChange={setTeamDialog}>
        <DialogContent className="glass-strong sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              {editingTeam ? "Edit Team" : "Create Team"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="Design Team" />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={teamDept} onValueChange={setTeamDept}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Department</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={teamDesc} onChange={(e) => setTeamDesc(e.target.value)} placeholder="Team description" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={saveTeam} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingTeam ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ======================== ACTIVITY LOG TAB ======================== */
function ActivityLogTab({ onToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await appClient.users.getAllActivityLogs();
      setLogs(result || []);
    } catch {
      onToast({ title: "Failed to load activity logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(q) ||
      log.user_email?.toLowerCase().includes(q) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(q)
    );
  });

  const getActionColor = (action) => {
    if (action?.includes("deleted") || action?.includes("error")) return "text-red-500";
    if (action?.includes("created") || action?.includes("invited") || action?.includes("verified")) return "text-green-500";
    if (action?.includes("updated") || action?.includes("reset") || action?.includes("changed")) return "text-yellow-500";
    if (action?.includes("login") || action?.includes("logout")) return "text-blue-500";
    return "text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <GlassCard hover={false}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <History className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Activity Log</h3>
              <p className="text-sm text-muted-foreground">
                {logs.length} total events
              </p>
            </div>
          </div>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              className="pl-9 h-9 w-full sm:w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="relative">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No activity logs found</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/20"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${getActionColor(log.action)}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium text-foreground">{log.user_email || "system"}</span>
                      <span className="text-xs text-muted-foreground">—</span>
                      <span className={`text-xs font-medium ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {JSON.stringify(log.details).slice(0, 120)}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                      {new Date(log.created_date || log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}