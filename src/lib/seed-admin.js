/**
 * Seed default Super Admin account.
 *
 * This runs once on first auth check if no Super Admin exists.
 * It creates a Super Admin account using the same localStorage-based
 * authentication system used by the rest of the application.
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
  const hasSuperAdmin = accounts.some(
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
    created_date: new Date().toISOString(),
  };

  accounts.push(adminAccount);
  write("accounts", accounts);

  // Also add to User entity
  const userStore = read("entity_User", []);
  userStore.push({
    id: adminAccount.id,
    email: adminAccount.email,
    role: adminAccount.role,
    full_name: adminAccount.full_name,
    created_date: adminAccount.created_date,
    updated_date: adminAccount.created_date,
  });
  write("entity_User", userStore);

  return adminAccount;
}