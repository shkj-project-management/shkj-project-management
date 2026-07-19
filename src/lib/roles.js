// Role-based access control configuration
// Each role has an access level (1-5). Each module requires a minimum level.

export const ROLES = [
  "Super Admin",
  "Project Director",
  "Project Manager",
  "Project Officer",
  "Site Engineer",
  "Supervisor",
  "HSE Officer",
  "Procurement",
  "Vendor",
  "Consultant MK",
  "User Department",
  "Management",
  "Viewer",
];

export const ROLE_ACCESS_LEVEL = {
  "Super Admin": 5,
  "Project Director": 5,
  "Project Manager": 4,
  "Project Officer": 4,
  "Site Engineer": 3,
  "Supervisor": 3,
  "HSE Officer": 3,
  "Consultant MK": 3,
  "Procurement": 2,
  "Vendor": 2,
  "User Department": 1,
  "Management": 1,
  "Viewer": 1,
};

// Map system roles to app roles
export function resolveRole(userRole) {
  if (!userRole) return "Viewer";
  if (ROLES.includes(userRole)) return userRole;
  if (userRole === "admin") return "Super Admin";
  if (userRole === "user") return "Viewer";
  return "Viewer";
}

export function getAccessLevel(role) {
  const resolved = resolveRole(role);
  return ROLE_ACCESS_LEVEL[resolved] || 1;
}

// Navigation structure: each item has a minimum access level
export const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", path: "/", icon: "LayoutDashboard", level: 1 },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "Project Dashboard", path: "/project-dashboard", icon: "BarChart3", level: 1 },
      { label: "Input Data Project", path: "/input-data", icon: "Database", level: 3 },
      { label: "Project Master", path: "/projects", icon: "FolderKanban", level: 3 },
      { label: "Multi Project", path: "/multi-project", icon: "Layers", level: 3 },
    ],
  },
  {
    label: "Resources",
    items: [
      { label: "Vendor Management", path: "/vendors", icon: "Truck", level: 2 },
      { label: "Manpower", path: "/manpower", icon: "HardHat", level: 3 },
      { label: "Material Tracking", path: "/materials", icon: "Package", level: 3 },
      { label: "Equipment Tracking", path: "/equipment", icon: "Wrench", level: 3 },
    ],
  },
  {
    label: "Planning",
    items: [
      { label: "BOQ", path: "/boq", icon: "List", level: 3 },
      { label: "RAB", path: "/rab", icon: "Calculator", level: 3 },
      { label: "Schedule", path: "/schedule", icon: "CalendarClock", level: 3 },
      { label: "Gantt Chart", path: "/gantt", icon: "BarChart3", level: 3 },
      { label: "Kurva S", path: "/kurva-s", icon: "TrendingUp", level: 3 },
      { label: "Progress Fisik", path: "/progress-fisik", icon: "Activity", level: 3 },
      { label: "Progress Keuangan", path: "/progress-keuangan", icon: "DollarSign", level: 3 },
    ],
  },
  {
    label: "Reports",
    items: [
      { label: "Daily Report", path: "/reports/daily", icon: "FileText", level: 1 },
      { label: "Weekly Report", path: "/reports/weekly", icon: "FileText", level: 1 },
      { label: "Monthly Report", path: "/reports/monthly", icon: "FileText", level: 1 },
      { label: "Safety Report", path: "/reports/safety", icon: "ShieldCheck", level: 1 },
      { label: "IPC Report", path: "/reports/ipc", icon: "FileText", level: 1 },
      { label: "All Reports", path: "/reports", icon: "BarChart3", level: 1 },
    ],
  },
  {
    label: "Quality & Safety",
    items: [
      { label: "Quality Inspection", path: "/quality-inspection", icon: "ClipboardCheck", level: 3 },
      { label: "Issue Log", path: "/issues", icon: "AlertCircle", level: 3 },
      { label: "Risk Register", path: "/risks", icon: "ShieldAlert", level: 3 },
      { label: "Action Plan", path: "/action-plan", icon: "CheckSquare", level: 3 },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { label: "Meeting Minutes", path: "/meetings", icon: "Users", level: 3 },
      { label: "Document Management", path: "/documents", icon: "FolderOpen", level: 3 },
      { label: "Photo Progress", path: "/photo-progress", icon: "Camera", level: 3 },
    ],
  },
  {
    label: "Workflow",
    items: [
      { label: "Approval Workflow", path: "/approvals", icon: "CheckCircle", level: 4 },
      { label: "Digital Signature", path: "/signatures", icon: "PenTool", level: 4 },
      { label: "Audit Log", path: "/audit-log", icon: "History", level: 5 },
    ],
  },
  {
    label: "Notifications",
    items: [
      { label: "WhatsApp Notification", path: "/whatsapp", icon: "MessageCircle", level: 4 },
      { label: "Email Notification", path: "/email-notification", icon: "Mail", level: 4 },
    ],
  },
  {
    label: "Exports",
    items: [
      { label: "PDF Export", path: "/export/pdf", icon: "FileText", level: 1 },
      { label: "Excel Export", path: "/export/excel", icon: "Table", level: 1 },
      { label: "PowerPoint Export", path: "/export/powerpoint", icon: "Presentation", level: 1 },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Settings", path: "/settings", icon: "Settings", level: 2 },
    ],
  },
];

export function getNavItems(role) {
  const level = getAccessLevel(role);
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => item.level <= level),
  })).filter((group) => group.items.length > 0);
}