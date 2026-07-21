/**
 * Seed default Super Admin account and migrate existing users.
 *
 * This runs once on first auth check if no Super Admin exists.
 * It creates a Super Admin account using the same localStorage-based
 * authentication system used by the rest of the application.
 * It also migrates existing accounts with old role names to new roles.
 *
 * @returns {object|null} The created Super Admin account, or null if one already existed.
 */
export function seedSuperAdmin() {
  const STORE_PREFIX = "shkj_pm_";
  const read = (key, fallback = []) => {
    try {
      const value = localStorage.getItem(`${STORE_PREFIX}${key}`);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (key, value) =>
    localStorage.setItem(`${STORE_PREFIX}${key}`, JSON.stringify(value));
  const id = () =>
    crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  const accounts = read("accounts", []);

  // Migrate existing accounts with old role names to new roles
  const OLD_ROLE_MAP = {
    "Project Director": "Project Manager",
    "Site Engineer": "Project Officer",
    "Supervisor": "Project Officer",
    "HSE Officer": "HSE",
    "Procurement": "Finance",
    "Vendor": "Viewer",
    "Consultant MK": "Viewer",
    "User Department": "Viewer",
    "Management": "Viewer",
  };

  let migrated = false;
  const migratedAccounts = accounts.map((account) => {
    const updated = { ...account };
    // Migrate old role
    if (OLD_ROLE_MAP[updated.role]) {
      updated.role = OLD_ROLE_MAP[updated.role];
      migrated = true;
    }
    // Ensure active field exists
    if (updated.active === undefined) {
      updated.active = true;
      migrated = true;
    }
    // Ensure full_name field exists
    if (updated.full_name === undefined) {
      updated.full_name = "";
      migrated = true;
    }
    // Ensure department_id and team_ids exist
    if (updated.department_id === undefined) {
      updated.department_id = null;
      migrated = true;
    }
    if (updated.team_ids === undefined) {
      updated.team_ids = [];
      migrated = true;
    }
    return updated;
  });

  if (migrated) {
    write("accounts", migratedAccounts);
  }

  const hasSuperAdmin = migratedAccounts.some(
    (a) => a.role === "Super Admin"
  );

  if (hasSuperAdmin) return null;

  const adminAccount = {
    id: id(),
    email: "admin@shkj.co.id",
    password: "Admin@12345",
    role: "Super Admin",
    verified: true,
    full_name: "Super Admin",
    active: true,
    department_id: null,
    team_ids: [],
    created_date: new Date().toISOString(),
  };

  migratedAccounts.push(adminAccount);
  write("accounts", migratedAccounts);

  // Also add to User entity
  const userStore = read("entity_User", []);
  userStore.push({
    id: adminAccount.id,
    email: adminAccount.email,
    role: adminAccount.role,
    full_name: adminAccount.full_name,
    active: true,
    created_date: adminAccount.created_date,
    updated_date: adminAccount.created_date,
  });
  write("entity_User", userStore);

  return adminAccount;
}