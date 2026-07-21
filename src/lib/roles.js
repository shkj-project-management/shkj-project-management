// Role-based access control configuration
// Re-exports from the new permissions module for backward compatibility

export {
  ROLES,
  ROLE_ACCESS_LEVEL,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  resolveRole,
  getAccessLevel,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canManageUsers,
  canChangeRoles,
  canAccessSystemSettings,
  canViewAuditLogs,
  canManagePermissions,
  NAV_GROUPS,
  getNavItems,
} from "./permissions";
