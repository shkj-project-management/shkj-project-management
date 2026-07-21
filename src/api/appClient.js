const STORE_PREFIX = "shkj_pm_";
const ENTITY_NAMES = [
  "Appointment", "BOQItem", "CompanyProfile", "Doctor", "Invoice", "IssueLog",
  "MedicalRecord", "Patient", "ProgressDaily", "Project", "RiskRegister", "User", "Vendor",
  "Department", "Team", "ActivityLog",
];

const read = (key, fallback = []) => {
  try {
    const value = localStorage.getItem(`${STORE_PREFIX}${key}`);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const write = (key, value) => localStorage.setItem(`${STORE_PREFIX}${key}`, JSON.stringify(value));
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function entityStore(name) {
  return {
    async list(sort, limit) {
      const records = [...read(`entity_${name}`)];
      if (sort) {
        const descending = sort.startsWith("-");
        const key = sort.replace(/^-/, "");
        records.sort((a, b) => String(a[key] ?? "").localeCompare(String(b[key] ?? "")) * (descending ? -1 : 1));
      }
      return limit ? records.slice(0, limit) : records;
    },
    async get(recordId) {
      const record = read(`entity_${name}`).find((item) => item.id === recordId);
      if (!record) throw new Error("Record not found");
      return record;
    },
    async filter(query = {}, sort, limit) {
      const records = (await this.list(sort)).filter((record) =>
        Object.entries(query).every(([key, value]) => record[key] === value)
      );
      return limit ? records.slice(0, limit) : records;
    },
    async create(data) {
      const records = read(`entity_${name}`);
      const record = { ...data, id: data.id || id(), created_date: now(), updated_date: now() };
      records.push(record);
      write(`entity_${name}`, records);
      return record;
    },
    async update(recordId, changes) {
      const records = read(`entity_${name}`);
      const index = records.findIndex((item) => item.id === recordId);
      if (index < 0) throw new Error("Record not found");
      records[index] = { ...records[index], ...changes, id: recordId, updated_date: now() };
      write(`entity_${name}`, records);
      return records[index];
    },
    async delete(recordId) {
      const records = read(`entity_${name}`);
      write(`entity_${name}`, records.filter((item) => item.id !== recordId));
    },
    async bulkCreate(items) {
      const records = read(`entity_${name}`);
      const created = items.map((item) => ({ ...item, id: id(), created_date: now(), updated_date: now() }));
      write(`entity_${name}`, [...records, ...created]);
      return created;
    },
    async bulkUpdate(updates) {
      return Promise.all(updates.map(({ id: recordId, ...changes }) => this.update(recordId, changes)));
    },
  };
}

const entities = Object.fromEntries(ENTITY_NAMES.map((name) => [name, entityStore(name)]));

const accounts = () => read("accounts");
const saveAccounts = (value) => write("accounts", value);
const accountUser = (account) => ({ id: account.id, email: account.email, role: account.role || "Viewer", full_name: account.full_name, active: account.active !== false, department_id: account.department_id, team_ids: account.team_ids || [] });
const session = () => read("session", null);

function setSession(account) {
  const token = id();
  write("session", { token, accountId: account.id });
  return token;
}

function requireAccount() {
  const current = session();
  const account = current && accounts().find((item) => item.id === current.accountId);
  if (!account) throw new Error("Authentication required");
  return account;
}

// Log activity to ActivityLog entity
function logActivity(action, details = {}) {
  try {
    const current = session();
    const account = current && accounts().find((item) => item.id === current.accountId);
    entities.ActivityLog.create({
      user_id: account?.id || "system",
      user_email: account?.email || "system",
      action,
      details,
      ip: "local",
      timestamp: now(),
    });
  } catch {
    // Silently fail for activity logging
  }
}

const auth = {
  async me() { return accountUser(requireAccount()); },
  async register({ email, password }) {
    if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists");
    const account = { id: id(), email, password, role: "Viewer", verified: false, otp: "000000", created_date: now(), active: true, full_name: "", department_id: null, team_ids: [] };
    saveAccounts([...accounts(), account]);
    await entities.User.create({ id: account.id, email, role: account.role, full_name: account.full_name || "", active: true });
    logActivity("user_registered", { email });
    return { requires_verification: true };
  },
  async verifyOtp({ email, otpCode }) {
    const allAccounts = accounts();
    const account = allAccounts.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!account || otpCode !== account.otp) throw new Error("Invalid verification code");
    account.verified = true;
    saveAccounts(allAccounts);
    logActivity("user_verified", { email });
    return { access_token: setSession(account) };
  },
  setToken(token) {
    const current = session();
    if (current) write("session", { ...current, token });
  },
  async resendOtp(email) {
    const account = accounts().find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!account) throw new Error("Account not found");
    return { development_code: account.otp };
  },
  async loginViaEmailPassword(email, password) {
    const account = accounts().find((item) => item.email.toLowerCase() === email.toLowerCase() && item.password === password);
    if (!account) throw new Error("Invalid email or password");
    if (!account.verified) throw new Error("Please verify your email first");
    if (account.active === false) throw new Error("Account is deactivated. Contact your administrator.");
    logActivity("user_login", { email });
    return { access_token: setSession(account) };
  },
  loginWithProvider(provider) {
    const email = `${provider}-user@local.shkj`;
    let account = accounts().find((item) => item.email === email);
    if (!account) {
      account = { id: id(), email, password: null, role: "Viewer", verified: true, created_date: now(), active: true, full_name: "", department_id: null, team_ids: [] };
      saveAccounts([...accounts(), account]);
      entities.User.create({ id: account.id, email, role: account.role, full_name: "", active: true });
    }
    if (account.active === false) throw new Error("Account is deactivated. Contact your administrator.");
    setSession(account);
    logActivity("user_login_provider", { email, provider });
    window.location.assign("/");
  },
  logout() { localStorage.removeItem(`${STORE_PREFIX}session`); },
  redirectToLogin() { window.location.assign("/login"); },
  async resetPasswordRequest(email) {
    const allAccounts = accounts();
    const account = allAccounts.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (account) {
      account.resetToken = id();
      saveAccounts(allAccounts);
      return { resetUrl: `/reset-password?token=${encodeURIComponent(account.resetToken)}` };
    }
    return null;
  },
  async resetPassword({ resetToken, newPassword }) {
    const allAccounts = accounts();
    const account = allAccounts.find((item) => item.resetToken === resetToken);
    if (!account) throw new Error("Invalid reset link");
    account.password = newPassword;
    delete account.resetToken;
    saveAccounts(allAccounts);
    logActivity("password_reset", { email: account.email });
  },
};

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Unable to read file"));
  reader.onload = () => resolve(reader.result);
  reader.readAsDataURL(file);
});

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, "")));
  if (rows.length < 2) return [];
  const headers = rows.shift().map((header) => header.toLowerCase());
  return rows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => {
    const value = row[index] ?? "";
    return [header, ["volume", "harga_satuan", "total_harga"].includes(header) ? Number(value.replace(/[^0-9.-]/g, "")) || 0 : value];
  })));
}

// Helper to apply role migration when reading accounts
function migrateAccountRole(account) {
  // If role is an old role name, map it to new role
  const OLD_ROLES = [
    "Project Director", "Site Engineer", "Supervisor", "HSE Officer",
    "Procurement", "Vendor", "Consultant MK", "User Department", "Management",
  ];
  if (OLD_ROLES.includes(account.role)) {
    const MIGRATION_MAP = {
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
    account.role = MIGRATION_MAP[account.role] || "Viewer";
  }
  return account;
}

export const appClient = {
  entities,
  auth,
  users: {
    async listUsers() {
      const allAccounts = accounts();
      return allAccounts.map((acc) => {
        migrateAccountRole(acc);
        return {
          id: acc.id,
          email: acc.email,
          role: acc.role || "Viewer",
          full_name: acc.full_name || "",
          created_date: acc.created_date,
          active: acc.active !== false,
          verified: acc.verified,
          department_id: acc.department_id || null,
          team_ids: acc.team_ids || [],
        };
      });
    },
    async getUser(userId) {
      const allAccounts = accounts();
      const acc = allAccounts.find((item) => item.id === userId);
      if (!acc) throw new Error("User not found");
      migrateAccountRole(acc);
      return {
        id: acc.id,
        email: acc.email,
        role: acc.role || "Viewer",
        full_name: acc.full_name || "",
        password: acc.password,
        created_date: acc.created_date,
        active: acc.active !== false,
        verified: acc.verified,
        department_id: acc.department_id || null,
        team_ids: acc.team_ids || [],
      };
    },
    async createUser({ email, password, full_name, role }) {
      if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("User already exists");
      const account = {
        id: id(),
        email,
        password: password || "welcome",
        full_name: full_name || "",
        role: role || "Viewer",
        verified: true,
        active: true,
        created_date: now(),
        department_id: null,
        team_ids: [],
      };
      saveAccounts([...accounts(), account]);
      await entities.User.create({ id: account.id, email, role: account.role, full_name: account.full_name, active: true });
      logActivity("user_created", { email, role });
      return { id: account.id, email: account.email, role: account.role, full_name: account.full_name, active: true };
    },
    async inviteUser(email, role = "Viewer") {
      if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("User already exists");
      const account = {
        id: id(),
        email,
        password: "welcome",
        full_name: "",
        role,
        verified: true,
        active: true,
        created_date: now(),
        department_id: null,
        team_ids: [],
      };
      saveAccounts([...accounts(), account]);
      await entities.User.create({ id: account.id, email, role: account.role, full_name: "", active: true });
      logActivity("user_invited", { email, role });
      return { id: account.id, email: account.email, role: account.role, full_name: "", active: true };
    },
    async updateUser(userId, changes) {
      const allAccounts = accounts();
      const index = allAccounts.findIndex((item) => item.id === userId);
      if (index < 0) throw new Error("User not found");
      const account = allAccounts[index];
      const updated = {
        ...account,
        ...changes,
        id: userId,
        updated_date: now(),
      };
      allAccounts[index] = updated;
      saveAccounts(allAccounts);
      // Sync to User entity
      try {
        await entities.User.update(userId, {
          email: updated.email,
          role: updated.role,
          full_name: updated.full_name || "",
          active: updated.active !== false,
        });
      } catch {
        // Entity record may not exist yet
      }
      logActivity("user_updated", { userId, changes: Object.keys(changes) });
      return accountUser(updated);
    },
    async deleteUser(userId) {
      const allAccounts = accounts();
      const account = allAccounts.find((item) => item.id === userId);
      if (!account) throw new Error("User not found");
      saveAccounts(allAccounts.filter((item) => item.id !== userId));
      try {
        await entities.User.delete(userId);
      } catch {
        // ignore
      }
      try {
        await entities.ActivityLog.delete(userId);
      } catch {
        // ignore
      }
      logActivity("user_deleted", { email: account.email });
    },
    async resetUserPassword(userId, newPassword) {
      const allAccounts = accounts();
      const account = allAccounts.find((item) => item.id === userId);
      if (!account) throw new Error("User not found");
      account.password = newPassword || "welcome";
      saveAccounts(allAccounts);
      logActivity("password_reset_by_admin", { userId, email: account.email });
    },
    async getUserActivityLogs(userId) {
      const logs = await entities.ActivityLog.filter({ user_id: userId }, "-created_date");
      return logs;
    },
    async getAllActivityLogs() {
      const logs = await entities.ActivityLog.list("-created_date");
      return logs;
    },
    async assignToProject(userId, projectIds) {
      const allAccounts = accounts();
      const account = allAccounts.find((item) => item.id === userId);
      if (!account) throw new Error("User not found");
      account.project_ids = [...new Set([...(account.project_ids || []), ...projectIds])];
      saveAccounts(allAccounts);
      logActivity("user_assigned_projects", { userId, projectIds });
    },
    async removeFromProject(userId, projectId) {
      const allAccounts = accounts();
      const account = allAccounts.find((item) => item.id === userId);
      if (!account) throw new Error("User not found");
      account.project_ids = (account.project_ids || []).filter((id) => id !== projectId);
      saveAccounts(allAccounts);
      logActivity("user_removed_from_project", { userId, projectId });
    },
  },
  departments: {
    async list() {
      return entities.Department.list("name");
    },
    async create(data) {
      const dept = await entities.Department.create(data);
      logActivity("department_created", { name: data.name });
      return dept;
    },
    async update(deptId, changes) {
      const dept = await entities.Department.update(deptId, changes);
      logActivity("department_updated", { deptId, changes: Object.keys(changes) });
      return dept;
    },
    async delete(deptId) {
      await entities.Department.delete(deptId);
      logActivity("department_deleted", { deptId });
    },
  },
  teams: {
    async list() {
      return entities.Team.list("name");
    },
    async create(data) {
      const team = await entities.Team.create(data);
      logActivity("team_created", { name: data.name });
      return team;
    },
    async update(teamId, changes) {
      const team = await entities.Team.update(teamId, changes);
      logActivity("team_updated", { teamId, changes: Object.keys(changes) });
      return team;
    },
    async delete(teamId) {
      await entities.Team.delete(teamId);
      logActivity("team_deleted", { teamId });
    },
  },
  integrations: { Core: {
    async UploadFile({ file }) { return { file_url: await fileToDataUrl(file) }; },
    async ExtractDataFromUploadedFile({ file_url }) {
      if (!file_url.startsWith("data:text/csv")) throw new Error("Local import supports CSV files. Use columns: no,item_name,kelompok,volume,satuan,harga_satuan,total_harga.");
      const text = decodeURIComponent(atob(file_url.split(",")[1] || ""));
      return { output: { items: parseCsv(text) } };
    },
    async SendEmail(message) {
      const outbox = read("outbox");
      outbox.push({ ...message, id: id(), created_date: now() });
      write("outbox", outbox);
      return { queued: true };
    },
  } },
};