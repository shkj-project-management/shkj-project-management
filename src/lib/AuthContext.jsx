import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { appClient } from "@/api/appClient";
import { seedSuperAdmin } from "@/lib/seed-admin";
import {
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
  ROLES,
  ROLE_ACCESS_LEVEL,
  PERMISSIONS,
} from "@/lib/permissions";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState(null);

  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      // Seed default Super Admin if none exists
      seedSuperAdmin();
      const currentUser = await appClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => { checkUserAuth(); }, [checkUserAuth]);

  const logout = (shouldRedirect = true) => {
    appClient.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
    if (shouldRedirect) window.location.assign("/login");
  };

  const navigateToLogin = () => appClient.auth.redirectToLogin();

  // Permission helpers derived from current user
  const permissionHelpers = useMemo(() => {
    const role = user?.role || "Viewer";
    return {
      role,
      resolvedRole: resolveRole(role),
      accessLevel: getAccessLevel(role),
      canManageUsers: canManageUsers(role),
      canChangeRoles: canChangeRoles(role),
      canAccessSystemSettings: canAccessSystemSettings(role),
      canViewAuditLogs: canViewAuditLogs(role),
      canManagePermissions: canManagePermissions(role),
      hasPermission: (perm) => hasPermission(role, perm),
      hasAnyPermission: (perms) => hasAnyPermission(role, perms),
      hasAllPermissions: (perms) => hasAllPermissions(role, perms),
    };
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      checkAppState: checkUserAuth,
      // Permission helpers
      ...permissionHelpers,
      // Expose constants for use in components
      ROLES,
      ROLE_ACCESS_LEVEL,
      PERMISSIONS,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
