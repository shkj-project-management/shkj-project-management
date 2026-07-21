// Permission-based access control configuration
// Defines granular permissions for each role

export const ROLES = [
  "Super Admin",
  "Project Manager",
  "Project Officer",
  "HSE",
  "Finance",
  "Viewer",
];

export const ROLE_ACCESS_LEVEL = {
  "Super Admin": 5,
  "Project Manager": 4,
  "Project Officer": 3,
  "HSE": 3,
  "Finance": 2,
  "Viewer": 1,
};

// Granular permission definitions
export const PERMISSIONS = {
  // User management (Super Admin only)
  USER_CREATE: "user:create",
  USER_INVITE: "user:invite",
  USER_EDIT: "user:edit",
  USER_CHANGE_ROLE: "user:change_role",
  USER_ACTIVATE_DEACTIVATE: "user:activate_deactivate",
  USER_DELETE: "user:delete",
  USER_RESET_PASSWORD: "user:reset_password",
  USER_VIEW_ACTIVITY: "user:view_activity",

  // Permission management (Super Admin only)
  PERMISSION_MANAGE: "permission:manage",

  // Project assignment
  USER_ASSIGN_PROJECT: "user:assign_project",

  // Department/Team management
  DEPARTMENT_MANAGE: "department:manage",
  TEAM_MANAGE: "team:manage",

  // System settings (Super Admin only)
  SYSTEM_SETTINGS: "system:settings",

  // Audit logs (Super Admin only)
  AUDIT_LOG_VIEW: "audit_log:view",

  // Module access
  MODULE_PROJECTS: "module:projects",
  MODULE_REPORTS: "module:reports",
  MODULE_VENDORS: "module:vendors",
  MODULE_ISSUES: "module:issues",
  MODULE_RISKS: "module:risks",
  MODULE_BOQ: "module:boq",
  MODULE_SCHEDULE: "module:schedule",
  MODULE_DOCUMENTS: "module:documents",
  MODULE_QUALITY: "module:quality",
  MODULE_FINANCE: "module:finance",
  MODULE_MANPOWER: "module:manpower",
  MODULE_MATERIALS: "module:materials",
  MODULE_EQUIPMENT: "module:equipment",
};

// Role-to-permissions mapping
export const ROLE_PERMISSIONS = {
  "Super Admin": Object.values(PERMISSIONS),

  "Project Manager": [
    PERMISSIONS.USER_ASSIGN_PROJECT,
    PERMISSIONS.MODULE_PROJECTS,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.MODULE_VENDORS,
    PERMISSIONS.MODULE_ISSUES,
    PERMISSIONS.MODULE_RISKS,
    PERMISSIONS.MODULE_BOQ,
    PERMISSIONS.MODULE_SCHEDULE,
    PERMISSIONS.MODULE_DOCUMENTS,
    PERMISSIONS.MODULE_QUALITY,
    PERMISSIONS.MODULE_FINANCE,
    PERMISSIONS.MODULE_MANPOWER,
    PERMISSIONS.MODULE_MATERIALS,
    PERMISSIONS.MODULE_EQUIPMENT,
  ],

  "Project Officer": [
    PERMISSIONS.MODULE_PROJECTS,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.MODULE_ISSUES,
    PERMISSIONS.MODULE_BOQ,
    PERMISSIONS.MODULE_SCHEDULE,
    PERMISSIONS.MODULE_DOCUMENTS,
    PERMISSIONS.MODULE_QUALITY,
    PERMISSIONS.MODULE_MANPOWER,
    PERMISSIONS.MODULE_MATERIALS,
    PERMISSIONS.MODULE_EQUIPMENT,
  ],

  "HSE": [
    PERMISSIONS.MODULE_PROJECTS,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.MODULE_ISSUES,
    PERMISSIONS.MODULE_RISKS,
    PERMISSIONS.MODULE_QUALITY,
    PERMISSIONS.MODULE_DOCUMENTS,
  ],

  "Finance": [
    PERMISSIONS.MODULE_PROJECTS,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.MODULE_FINANCE,
    PERMISSIONS.MODULE_VENDORS,
    PERMISSIONS.MODULE_DOCUMENTS,
  ],

  "Viewer": [
    PERMISSIONS.MODULE_PROJECTS,
    PERMISSIONS.MODULE_REPORTS,
    PERMISSIONS.MODULE_DOCUMENTS,
  ],
};

// Map old roles to new roles for backward compatibility
const ROLE_MIGRATION_MAP = {
  "Super Admin": "Super Admin",
  "Project Director": "Project Manager",
  "Project Manager": "Project Manager",
  "Project Officer": "Project Officer",
  "Site Engineer": "Project Officer",
  "Supervisor": "Project Officer",
  "HSE Officer": "HSE",
  "Procurement": "Finance",
  "Vendor": "Viewer",
  "Consultant MK": "Viewer",
  "User Department": "Viewer",
  "Management": "Viewer",
  "Viewer": "Viewer",
};

export function resolveRole(userRole) {
  if (!userRole) return "Viewer";
  if (ROLES.includes(userRole)) return userRole;
  if (ROLE_MIGRATION_MAP[userRole]) return ROLE_MIGRATION_MAP[userRole];
  return "Viewer";
}

export function getAccessLevel(role) {
  const resolved = resolveRole(role);
  return ROLE_ACCESS_LEVEL[resolved] || 1;
}

export function hasPermission(userRole, permission) {
  const resolved = resolveRole(userRole);
  const perms = ROLE_PERMISSIONS[resolved] || [];
  return perms.includes(permission);
}

export function hasAnyPermission(userRole, permissions) {
  return permissions.some((perm) => hasPermission(userRole, perm));
}

export function hasAllPermissions(userRole, permissions) {
  return permissions.every((perm) => hasPermission(userRole, perm));
}

// Check if user can manage other users (Super Admin only)
export function canManageUsers(userRole) {
  return resolveRole(userRole) === "Super Admin";
}

// Check if user can change roles (Super Admin only)
export function canChangeRoles(userRole) {
  return resolveRole(userRole) === "Super Admin";
}

// Check if user can access system settings (Super Admin only)
export function canAccessSystemSettings(userRole) {
  return resolveRole(userRole) === "Super Admin";
}

// Check if user can view audit logs (Super Admin only)
export function canViewAuditLogs(userRole) {
  return resolveRole(userRole) === "Super Admin";
}

// Check if user can manage permissions (Super Admin only)
export function canManagePermissions(userRole) {
  return resolveRole(userRole) === "Super Admin";
}

// Navigation structure
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: "LayoutDashboard", level: 1, permissions: [] },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "Project Dashboard", path: "/project-dashboard", icon: "BarChart3", level: 1, permissions: [PERMISSIONS.MODULE_PROJECTS] },
      { label: "Input Data Project", path: "/input-data", icon: "Database", level: 3, permissions: [PERMISSIONS.MODULE_PROJECTS] },
      { label: "Project Master", path: "/projects", icon: "FolderKanban", level: 3, permissions: [PERMISSIONS.MODULE_PROJECTS] },
      { label: "Multi Project", path: "/multi-project", icon: "Layers", level: 3, permissions: [PERMISSIONS.MODULE_PROJECTS] },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Vendor Management", path: "/vendors", icon: "Truck", level: 2, permissions: [PERMISSIONS.MODULE_VENDORS] },
      { label: "Manpower", path: "/manpower", icon: "HardHat", level: 3, permissions: [PERMISSIONS.MODULE_MANPOWER] },
      { label: "Material Tracking", path: "/materials", icon: "Package", level: 3, permissions: [PERMISSIONS.MODULE_MATERIALS] },
      { label: "Equipment Tracking", path: "/equipment", icon: "Wrench", level: 3, permissions: [PERMISSIONS.MODULE_EQUIPMENT] },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "BOQ", path: "/boq", icon: "List", level: 3, permissions: [PERMISSIONS.MODULE_BOQ] },
      { label: "RAB", path: "/rab", icon: "Calculator", level: 3, permissions: [PERMISSIONS.MODULE_BOQ] },
      { label: "Schedule", path: "/schedule", icon: "CalendarClock", level: 3, permissions: [PERMISSIONS.MODULE_SCHEDULE] },
      { label: "Gantt Chart", path: "/gantt", icon: "BarChart3", level: 3, permissions: [PERMISSIONS.MODULE_SCHEDULE] },
      { label: "Kurva S", path: "/kurva-s", icon: "TrendingUp", level: 3, permissions: [PERMISSIONS.MODULE_SCHEDULE] },
      { label: "Progress Fisik", path: "/progress-fisik", icon: "Activity", level: 3, permissions: [PERMISSIONS.MODULE_PROJECTS] },
      { label: "Progress Keuangan", path: "/progress-keuangan", icon: "DollarSign", level: 3, permissions: [PERMISSIONS.MODULE_FINANCE] },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Daily Report", path: "/reports/daily", icon: "FileText", level: 1, permissions: [PERMISSIONS.MODULE_REPORTS] },
      { label: "Weekly Report", path: "/reports/weekly", icon: "FileText", level: 1, permissions: [PERMISSIONS.MODULE_REPORTS] },
      { label: "Monthly Report", path: "/reports/monthly", icon: "FileText", level: 1, permissions: [PERMISSIONS.MODULE_REPORTS] },
      { label: "Safety Report", path: "/reports/safety", icon: "ShieldCheck", level: 1, permissions: [PERMISSIONS.MODULE_REPORTS] },
      { label: "IPC Report", path: "/reports/ipc", icon: "FileText", level: 1, permissions: [PERMISSIONS.MODULE_REPORTS] },
      { label: "All Reports", path: "/reports", icon: "BarChart3", level: 1, permissions: [PERMISSIONS.MODULE_REPORTS] },
    ],
  },
  {
    label: "Quality & Safety",
    items: [
      { label: "Quality Inspection", path: "/quality-inspection", icon: "ClipboardCheck", level: 3, permissions: [PERMISSIONS.MODULE_QUALITY] },
      { label: "Issue Log", path: "/issues", icon: "AlertCircle", level: 3, permissions: [PERMISSIONS.MODULE_ISSUES] },
      { label: "Risk Register", path: "/risks", icon: "ShieldAlert", level: 3, permissions: [PERMISSIONS.MODULE_RISKS] },
      { label: "Action Plan", path: "/action-plan", icon: "CheckSquare", level: 3, permissions: [PERMISSIONS.MODULE_QUALITY] },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { label: "Meeting Minutes", path: "/meetings", icon: "Users", level: 3, permissions: [PERMISSIONS.MODULE_DOCUMENTS] },
      { label: "Document Management", path: "/documents", icon: "FolderOpen", level: 3, permissions: [PERMISSIONS.MODULE_DOCUMENTS] },
      { label: "Photo Progress", path: "/photo-progress", icon: "Camera", level: 3, permissions: [PERMISSIONS.MODULE_DOCUMENTS] },
    ],
  },
  {
    label: "Workflow",
    items: [
      { label: "Approval Workflow", path: "/approvals", icon: "CheckCircle", level: 4, permissions: [PERMISSIONS.MODULE_PROJECTS] },
      { label: "Digital Signature", path: "/signatures", icon: "PenTool", level: 4, permissions: [PERMISSIONS.MODULE_PROJECTS] },
      { label: "Audit Log", path: "/audit-log", icon: "History", level: 5, permissions: [PERMISSIONS.AUDIT_LOG_VIEW] },
    ],
  },
  {
    label: "Notifications",
    items: [
      { label: "WhatsApp Notification", path: "/whatsapp", icon: "MessageCircle", level: 4, permissions: [] },
      { label: "Email Notification", path: "/email-notification", icon: "Mail", level: 4, permissions: [] },
    ],
  },
  {
    label: "Exports",
    items: [
      { label: "PDF Export", path: "/export/pdf", icon: "FileText", level: 1, permissions: [] },
      { label: "Excel Export", path: "/export/excel", icon: "Table", level: 1, permissions: [] },
      { label: "PowerPoint Export", path: "/export/powerpoint", icon: "Presentation", level: 1, permissions: [] },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", path: "/settings", icon: "Settings", level: 2, permissions: [] },
      { label: "User Management", path: "/user-management", icon: "Shield", level: 5, permissions: [PERMISSIONS.USER_CREATE, PERMISSIONS.USER_EDIT, PERMISSIONS.USER_DELETE] },
    ],
  },
];

export function getNavItems(role, userPermissions = null) {
  const level = getAccessLevel(role);
  const resolvedRole = resolveRole(role);
  // If userPermissions provided, use those; otherwise derive from role
  const perms = userPermissions || ROLE_PERMISSIONS[resolvedRole] || [];

  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      // Must meet access level requirement
      if (item.level > level) return false;
      // If item has permission requirements, check them
      if (item.permissions && item.permissions.length > 0) {
        return item.permissions.some((p) => perms.includes(p));
      }
      return true;
    }),
  })).filter((group) => group.items.length > 0);
}