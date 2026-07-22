const STORE_PREFIX = "shkj_pm_";
const ENTITY_NAMES = [
  "Appointment", "BOQItem", "CompanyProfile", "Doctor", "Invoice", "IssueLog",
  "MedicalRecord", "Patient", "ProgressDaily", "Project", "RiskRegister", "User", "Vendor",
  "Department", "Team", "ActivityLog", "PhotoProgress", "BOQRevision",
  // Sprint 2 - HSE
  "HSESafetyInspection", "HSESafetyObservation", "HSEUnsafeAction", "HSEUnsafeCondition",
  "HSENearMiss", "HSEIncidentReport", "HSEPPEChecklist", "HSEPermitToWork",
  "HSEToolboxMeeting", "HSESafetyMeeting", "HSECorrectiveAction", "HSEPreventiveAction",
  // Sprint 2 - IPCN
  "IPCNAudit", "IPCNInspection", "IPCNAirQuality", "IPCNWaterQuality",
  "IPCNIsolationAudit", "IPCNHandHygiene", "IPCNSterilization", "IPCNHousekeeping",
  "IPCNEnvironmental", "IPCNFinding",
  // Sprint 2 - Action Plan & Notifications
  "ActionPlan", "ActionPlanApproval",
  "NotificationCenter",
  // Sprint 2 - Reports
  "ReportEntity", "ExportJob",
  // Sprint 2 - Audit
  "AuditLogEntry",
  // Sprint 2 - Email
  "EmailQueue",
  // Sprint 2 - OTP
  "OTPCode",
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

function getCurrentUser() {
  try {
    const current = session();
    if (!current) return null;
    const account = accounts().find((item) => item.id === current.accountId);
    return account ? { id: account.id, email: account.email, full_name: account.full_name, role: account.role } : null;
  } catch {
    return null;
  }
}

// Log activity to ActivityLog entity
function logActivity(action, details = {}) {
  try {
    const current = session();
    const account = current && accounts().find((item) => item.id === current.accountId);
    entities.ActivityLog.create({
      user_id: account?.id || "system",
      user_email: account?.email || "system",
      user_name: account?.full_name || "System",
      action,
      details,
      ip: "local",
      timestamp: now(),
    });
  } catch {
    // Silently fail for activity logging
  }
}

// Parse XLSX binary data (simple XLSX parsing using XML within ZIP)
// This handles basic XLSX files by reading the shared strings and sheet data
function parseXLSXArrayBuffer(buffer) {
  try {
    // Use a simple approach - try to read as text first for CSV compatibility
    const bytes = new Uint8Array(buffer);
    // Check if it's a text file (CSV)
    const text = new TextDecoder('utf-8').decode(bytes.slice(0, 100));
    if (text.includes(',') && !text.includes('PK')) {
      // It's CSV, parse it
      const fullText = new TextDecoder('utf-8').decode(buffer);
      return parseCsv(fullText);
    }
    throw new Error("XLSX binary parsing requires a proper XLSX parser library. Please upload CSV format.");
  } catch (e) {
    if (e.message.includes('XLSX')) throw e;
    // Try CSV parsing
    const fullText = new TextDecoder('utf-8').decode(buffer);
    return parseCsv(fullText);
  }
}

const auth = {
  async me() { return accountUser(requireAccount()); },
  async register({ email, password }) {
    if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists");
    const account = { id: id(), email, password, role: "Viewer", verified: false, created_date: now(), active: true, full_name: "", department_id: null, team_ids: [] };
    saveAccounts([...accounts(), account]);
    await entities.User.create({ id: account.id, email, role: account.role, full_name: account.full_name || "", active: true });
    // Generate OTP and send verification email
    await appClient.otp.create(email);
    logActivity("user_registered", { email });
    return { requires_verification: true };
  },
  async verifyOtp({ email, otpCode }) {
    const allAccounts = accounts();
    const account = allAccounts.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!account) throw new Error("Account not found");
    // Use the proper OTP verification module
    await appClient.otp.verify(email, otpCode);
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
    // Regenerate OTP and resend
    await appClient.otp.resend(email);
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

const fileToArrayBuffer = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error("Unable to read file"));
  reader.onload = () => resolve(reader.result);
  reader.readAsArrayBuffer(file);
});

function parseCsv(text) {
  const rows = text.trim().split(/\r?\n/).map((line) => line.split(",").map((value) => value.trim().replace(/^"|"$/g, "")));
  if (rows.length < 2) return [];
  const headers = rows.shift().map((header) => header.toLowerCase());
  return rows.filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(headers.map((header, index) => {
    const value = row[index] ?? "";
    return [header, ["volume", "harga_satuan", "total_harga", "quantity", "unit_price", "total_price"].includes(header) ? Number(value.replace(/[^0-9.-]/g, "")) || 0 : value];
  })));
}

// Helper to apply role migration when reading accounts
function migrateAccountRole(account) {
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

// BOQ-specific utility functions
const boqUtils = {
  // Validate BOQ item data
  validateItem(item) {
    const errors = [];
    if (!item.item_number && !item.no && !item.item_name) errors.push("Item number/name is required");
    if (!item.description && !item.item_name) errors.push("Description is required");
    if (!item.unit && !item.satuan) errors.push("Unit is required");
    if (isNaN(Number(item.quantity || item.volume))) errors.push("Quantity must be a number");
    if (isNaN(Number(item.unit_price || item.harga_satuan))) errors.push("Unit price must be a number");
    return errors;
  },

  // Detect duplicate BOQ items
  findDuplicates(items, existingItems) {
    const duplicates = [];
    items.forEach((item) => {
      const itemNo = item.item_number || item.no || "";
      const match = existingItems.find((e) => (e.item_number || e.no) === itemNo);
      if (match) duplicates.push(item);
    });
    return duplicates;
  },

  // Auto-map column names from various formats
  mapColumns(headers) {
    const columnMap = {
      item_number: ["item_number", "item no", "no item", "item no.", "no.", "no", "item no", "work item", "item id"],
      item_name: ["item_name", "item name", "name", "description", "work description", "pekerjaan", "nama pekerjaan", "description", "nama item"],
      work_category: ["work_category", "work category", "category", "kelompok", "kelompok pekerjaan", "group", "work group", "jenis pekerjaan", "kategori"],
      description: ["description", "deskripsi", "item description", "work description"],
      unit: ["unit", "satuan", "uom", "measure", "unit of measure"],
      quantity: ["quantity", "qty", "volume", "vol", "jumlah", "total quantity"],
      unit_price: ["unit_price", "unit price", "harga satuan", "price", "harga", "harga/unit", "rate"],
      total_price: ["total_price", "total price", "total harga", "total", "amount", "jumlah harga", "subtotal"],
      vendor: ["vendor", "supplier", "kontraktor", "contractor", "pelaksana"],
    };

    const mapping = {};
    headers.forEach((h) => {
      const normalized = h.toLowerCase().trim().replace(/[^a-z0-9_]/g, " ");
      let found = false;
      Object.entries(columnMap).forEach(([key, aliases]) => {
        if (aliases.includes(h.toLowerCase().trim()) || aliases.some((a) => normalized.includes(a))) {
          mapping[key] = h;
          found = true;
        }
      });
      if (!found) {
        // Try to auto-detect based on content patterns
        if (normalized.includes("harga") && normalized.includes("satuan")) mapping.unit_price = h;
        else if (normalized.includes("total") || normalized.includes("jumlah")) mapping.total_price = h;
        else if (normalized.includes("volume") || normalized.includes("qty") || normalized.includes("quantity")) mapping.quantity = h;
        else if (normalized.includes("satuan") || normalized.includes("unit")) mapping.unit = h;
        else if (normalized.includes("kelompok") || normalized.includes("kategori") || normalized.includes("category")) mapping.work_category = h;
        else if (normalized.includes("vendor") || normalized.includes("supplier") || normalized.includes("kontraktor")) mapping.vendor = h;
        else if (normalized.includes("deskripsi") || normalized.includes("description") || normalized.includes("pekerjaan")) mapping.description = h;
        else if (normalized.includes("name") || normalized.includes("nama") || normalized.includes("item")) mapping.item_name = h;
      }
    });
    return mapping;
  },
};

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
        id: id(), email,
        password: password || "welcome",
        full_name: full_name || "",
        role: role || "Viewer",
        verified: true, active: true,
        created_date: now(),
        department_id: null, team_ids: [],
      };
      saveAccounts([...accounts(), account]);
      await entities.User.create({ id: account.id, email, role: account.role, full_name: account.full_name, active: true });
      logActivity("user_created", { email, role });
      return { id: account.id, email: account.email, role: account.role, full_name: account.full_name, active: true };
    },
    async inviteUser(email, role = "Viewer") {
      if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("User already exists");
      const account = { id: id(), email, password: "welcome", full_name: "", role, verified: true, active: true, created_date: now(), department_id: null, team_ids: [] };
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
      const updated = { ...account, ...changes, id: userId, updated_date: now() };
      allAccounts[index] = updated;
      saveAccounts(allAccounts);
      try { await entities.User.update(userId, { email: updated.email, role: updated.role, full_name: updated.full_name || "", active: updated.active !== false }); } catch { }
      logActivity("user_updated", { userId, changes: Object.keys(changes) });
      return accountUser(updated);
    },
    async deleteUser(userId) {
      const allAccounts = accounts();
      const account = allAccounts.find((item) => item.id === userId);
      if (!account) throw new Error("User not found");
      saveAccounts(allAccounts.filter((item) => item.id !== userId));
      try { await entities.User.delete(userId); } catch { }
      try { await entities.ActivityLog.delete(userId); } catch { }
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
    async getUserActivityLogs(userId) { return entities.ActivityLog.filter({ user_id: userId }, "-created_date"); },
    async getAllActivityLogs() { return entities.ActivityLog.list("-created_date"); },
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
    async list() { return entities.Department.list("name"); },
    async create(data) { const dept = await entities.Department.create(data); logActivity("department_created", { name: data.name }); return dept; },
    async update(deptId, changes) { const dept = await entities.Department.update(deptId, changes); logActivity("department_updated", { deptId, changes: Object.keys(changes) }); return dept; },
    async delete(deptId) { await entities.Department.delete(deptId); logActivity("department_deleted", { deptId }); },
  },
  teams: {
    async list() { return entities.Team.list("name"); },
    async create(data) { const team = await entities.Team.create(data); logActivity("team_created", { name: data.name }); return team; },
    async update(teamId, changes) { const team = await entities.Team.update(teamId, changes); logActivity("team_updated", { teamId, changes: Object.keys(changes) }); return team; },
    async delete(teamId) { await entities.Team.delete(teamId); logActivity("team_deleted", { teamId }); },
  },

  // BOQ-specific operations
  boq: {
    async getItems(projectId) {
      return entities.BOQItem.filter({ project_id: projectId }, "no", 500);
    },

    async createItem(data) {
      const item = await entities.BOQItem.create(data);
      logActivity("boq_item_created", { project_id: data.project_id, item_number: data.item_number || data.no });
      return item;
    },

    async updateItem(itemId, changes) {
      const item = await entities.BOQItem.update(itemId, changes);
      logActivity("boq_item_updated", { itemId, changes: Object.keys(changes) });
      return item;
    },

    async deleteItem(itemId) {
      const item = read(`entity_BOQItem`).find((i) => i.id === itemId);
      await entities.BOQItem.delete(itemId);
      if (item) logActivity("boq_item_deleted", { itemId, item_number: item.item_number || item.no });
    },

    async bulkImport(items) {
      const user = getCurrentUser();
      const itemsWithMeta = items.map((item) => ({
        ...item,
        imported_by: user?.id || "system",
        import_date: now(),
        revision: 1,
        approval_status: "Draft",
        actual_quantity: 0,
        remaining_quantity: Number(item.quantity || item.volume || 0),
        progress_percent: 0,
        completed_value: 0,
        status: "Active",
      }));
      const created = await entities.BOQItem.bulkCreate(itemsWithMeta);
      // Create revision record
      await entities.BOQRevision.create({
        project_id: items[0]?.project_id,
        revision: 1,
        action: "Import",
        item_count: items.length,
        total_value: items.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0),
        imported_by: user?.id || "system",
        imported_by_name: user?.full_name || "System",
        import_date: now(),
      });
      logActivity("boq_bulk_import", { project_id: items[0]?.project_id, count: items.length });
      return created;
    },

    async getRevisions(projectId) {
      return entities.BOQRevision.filter({ project_id: projectId }, "-revision", 100);
    },

    async createRevision(projectId, revisionData) {
      const rev = await entities.BOQRevision.create({
        project_id: projectId,
        ...revisionData,
        created_date: now(),
      });
      logActivity("boq_revision_created", { project_id: projectId, revision: revisionData.revision });
      return rev;
    },

    async updateApprovalStatus(itemId, status) {
      const user = getCurrentUser();
      const item = await entities.BOQItem.update(itemId, {
        approval_status: status,
        approved_by: user?.id || "",
        approved_by_name: user?.full_name || "",
        approved_date: now(),
      });
      logActivity("boq_approval_updated", { itemId, status });
      return item;
    },

    // Calculate BOQ summary for a project
    async getSummary(projectId) {
      const items = await entities.BOQItem.filter({ project_id: projectId });
      const totalBOQ = items.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = items.reduce((s, i) => s + Number(i.completed_value || 0), 0);
      const progressValue = items.reduce((s, i) => s + (Number(i.progress_percent || 0) / 100 * Number(i.total_price || i.total_harga || 0)), 0);
      const remainingBudget = totalBOQ - completedValue;
      return {
        total_items: items.length,
        total_boq: totalBOQ,
        completed_value: completedValue,
        progress_value: progressValue,
        remaining_budget: remainingBudget,
        physical_progress: totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0,
        financial_progress: totalBOQ > 0 ? (progressValue / totalBOQ * 100) : 0,
      };
    },

    // Validate and parse uploaded file data
    async parseUploadedFile(file) {
      const { file_url } = await appClient.integrations.Core.UploadFile({ file });
      const result = await appClient.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_number: { type: "string" },
                  item_name: { type: "string" },
                  work_category: { type: "string" },
                  description: { type: "string" },
                  unit: { type: "string" },
                  quantity: { type: "number" },
                  unit_price: { type: "number" },
                  total_price: { type: "number" },
                  vendor: { type: "string" },
                },
              },
            },
          },
        },
      });
      const extractedItems = Array.isArray(result.output) ? result.output : (result.output?.items || []);
      return extractedItems;
    },

    // Generate BOQ template CSV
    generateTemplate() {
      const headers = [
        "item_number", "item_name", "work_category", "description",
        "unit", "quantity", "unit_price", "vendor",
      ];
      const sampleRow = [
        "1.1", "Concrete Work - Column C1", "Structural", "Reinforced concrete column C1 400x400mm",
        "m3", "150", "850000", "PT. ABC Konstruksi",
      ];
      return [headers.join(","), sampleRow.join(",")].join("\n");
    },
  },

  // Daily Progress operations
  dailyProgress: {
    async list(projectId) {
      if (projectId) return entities.ProgressDaily.filter({ project_id: projectId }, "-date", 500);
      return entities.ProgressDaily.list("-date", 500);
    },

    async get(recordId) { return entities.ProgressDaily.get(recordId); },

    async create(data) {
      const user = getCurrentUser();
      const record = await entities.ProgressDaily.create({
        ...data,
        created_by: user?.id || "",
        created_by_name: user?.full_name || "",
        approval_status: data.approval_status || "Draft",
      });
      logActivity("daily_progress_created", { project_id: data.project_id, date: data.date });
      return record;
    },

    async update(recordId, changes) {
      const record = await entities.ProgressDaily.update(recordId, changes);
      logActivity("daily_progress_updated", { recordId, changes: Object.keys(changes) });
      return record;
    },

    async delete(recordId) {
      await entities.ProgressDaily.delete(recordId);
      logActivity("daily_progress_deleted", { recordId });
    },

    async updateStatus(recordId, status) {
      const user = getCurrentUser();
      const record = await entities.ProgressDaily.update(recordId, {
        approval_status: status,
        ...(status === "Submitted" ? { submitted_date: now(), submitted_by: user?.id || "" } : {}),
        ...(status === "Approved" ? { approved_date: now(), approved_by: user?.id || "" } : {}),
        ...(status === "Rejected" ? { rejected_date: now(), rejected_by: user?.id || "" } : {}),
      });
      logActivity("daily_progress_status_changed", { recordId, status });
      return record;
    },

    // Auto-calculate progress from BOQ data
    async calculateProgress(projectId, boqItemId, actualQuantity) {
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const boqItem = boqItems.find((i) => i.id === boqItemId);
      if (!boqItem) throw new Error("BOQ item not found");

      const totalQty = Number(boqItem.quantity || boqItem.volume || 0);
      const unitPrice = Number(boqItem.unit_price || boqItem.harga_satuan || 0);
      const physicalProgress = totalQty > 0 ? (actualQuantity / totalQty * 100) : 0;
      const completedValue = actualQuantity * unitPrice;
      const remainingQuantity = Math.max(0, totalQty - actualQuantity);
      const remainingBudget = remainingQuantity * unitPrice;
      const financialProgress = (boqItem.total_price || boqItem.total_harga || 0) > 0
        ? (completedValue / (boqItem.total_price || boqItem.total_harga || 0) * 100) : 0;

      return {
        actual_quantity: actualQuantity,
        remaining_quantity: remainingQuantity,
        physical_progress: Math.min(100, physicalProgress),
        financial_progress: Math.min(100, financialProgress),
        completed_value: completedValue,
        remaining_budget: remainingBudget,
        earned_value: completedValue,
      };
    },
  },

  // Photo Progress operations
  photoProgress: {
    async list(projectId) {
      if (projectId) return entities.PhotoProgress.filter({ project_id: projectId }, "-timestamp", 500);
      return entities.PhotoProgress.list("-timestamp", 500);
    },

    async create(data) {
      const user = getCurrentUser();
      const photo = await entities.PhotoProgress.create({
        ...data,
        uploaded_by: user?.id || "",
        uploaded_by_name: user?.full_name || "",
        timestamp: now(),
      });
      logActivity("photo_progress_uploaded", { project_id: data.project_id });
      return photo;
    },

    async delete(photoId) {
      await entities.PhotoProgress.delete(photoId);
      logActivity("photo_progress_deleted", { photoId });
    },

    async getGallery(projectId, filters = {}) {
      let photos = await entities.PhotoProgress.filter({ project_id: projectId }, "-timestamp", 500);
      if (filters.area) photos = photos.filter((p) => p.area === filters.area);
      if (filters.floor) photos = photos.filter((p) => p.floor === filters.floor);
      if (filters.activity) photos = photos.filter((p) => p.activity === filters.activity);
      if (filters.before_after) photos = photos.filter((p) => p.before_after === filters.before_after);
      return photos;
    },
  },

  // Progress calculation aggregates for dashboard
  progress: {
    async getProjectProgress(projectId) {
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const dailyEntries = await entities.ProgressDaily.filter({ project_id: projectId, approval_status: "Approved" }, "-date", 500);
      const photoCount = (await entities.PhotoProgress.filter({ project_id: projectId })).length;

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + (Number(i.actual_quantity || 0) * Number(i.unit_price || i.harga_satuan || 0)), 0);
      const physicalProgress = totalBOQ > 0 ? Math.min(100, (completedValue / totalBOQ * 100)) : 0;

      // Calculate weekly and monthly progress
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const weeklyEntries = dailyEntries.filter((e) => e.created_date >= weekAgo);
      const monthlyEntries = dailyEntries.filter((e) => e.created_date >= monthAgo);

      return {
        total_boq: totalBOQ,
        completed_value: completedValue,
        physical_progress: physicalProgress,
        financial_progress: physicalProgress, // Simplified
        remaining_budget: totalBOQ - completedValue,
        total_items: boqItems.length,
        total_daily_entries: dailyEntries.length,
        weekly_entries: weeklyEntries.length,
        monthly_entries: monthlyEntries.length,
        photo_count: photoCount,
      };
    },
  },

  // ============================================================
  // SPRINT 2: HSE MODULE
  // ============================================================
  hse: {
    // Safety Inspection
    async listSafetyInspections(projectId) {
      if (projectId) return entities.HSESafetyInspection.filter({ project_id: projectId }, "-inspection_date", 500);
      return entities.HSESafetyInspection.list("-inspection_date", 500);
    },
    async createSafetyInspection(data) {
      const user = getCurrentUser();
      const record = await entities.HSESafetyInspection.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_safety_inspection_created", { project_id: data.project_id });
      // Auto-create action plan for findings
      if (data.findings && data.findings.length > 0) {
        for (const finding of data.findings) {
          await appClient.actionPlan.createFromFinding({
            source: "HSE",
            source_type: "Safety Inspection",
            source_id: record.id,
            project_id: data.project_id,
            description: finding,
            priority: data.priority || "Medium",
            category: "HSE",
          });
        }
      }
      return record;
    },
    async updateSafetyInspection(id, changes) {
      const record = await entities.HSESafetyInspection.update(id, changes);
      logActivity("hse_safety_inspection_updated", { id });
      return record;
    },
    async deleteSafetyInspection(id) {
      await entities.HSESafetyInspection.delete(id);
      logActivity("hse_safety_inspection_deleted", { id });
    },

    // Safety Observation
    async listSafetyObservations(projectId) {
      if (projectId) return entities.HSESafetyObservation.filter({ project_id: projectId }, "-observation_date", 500);
      return entities.HSESafetyObservation.list("-observation_date", 500);
    },
    async createSafetyObservation(data) {
      const user = getCurrentUser();
      const record = await entities.HSESafetyObservation.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_safety_observation_created", { project_id: data.project_id });
      if (data.requires_action) {
        await appClient.actionPlan.createFromFinding({
          source: "HSE", source_type: "Safety Observation", source_id: record.id,
          project_id: data.project_id, description: data.description, priority: data.priority || "Medium", category: "HSE",
        });
      }
      return record;
    },
    async updateSafetyObservation(id, changes) { return entities.HSESafetyObservation.update(id, changes); },
    async deleteSafetyObservation(id) { await entities.HSESafetyObservation.delete(id); },

    // Unsafe Action
    async listUnsafeActions(projectId) {
      if (projectId) return entities.HSEUnsafeAction.filter({ project_id: projectId }, "-reported_date", 500);
      return entities.HSEUnsafeAction.list("-reported_date", 500);
    },
    async createUnsafeAction(data) {
      const user = getCurrentUser();
      const record = await entities.HSEUnsafeAction.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_unsafe_action_created", { project_id: data.project_id });
      await appClient.actionPlan.createFromFinding({
        source: "HSE", source_type: "Unsafe Action", source_id: record.id,
        project_id: data.project_id, description: data.description, priority: "High", category: "HSE",
      });
      return record;
    },
    async updateUnsafeAction(id, changes) { return entities.HSEUnsafeAction.update(id, changes); },
    async deleteUnsafeAction(id) { await entities.HSEUnsafeAction.delete(id); },

    // Unsafe Condition
    async listUnsafeConditions(projectId) {
      if (projectId) return entities.HSEUnsafeCondition.filter({ project_id: projectId }, "-reported_date", 500);
      return entities.HSEUnsafeCondition.list("-reported_date", 500);
    },
    async createUnsafeCondition(data) {
      const user = getCurrentUser();
      const record = await entities.HSEUnsafeCondition.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_unsafe_condition_created", { project_id: data.project_id });
      await appClient.actionPlan.createFromFinding({
        source: "HSE", source_type: "Unsafe Condition", source_id: record.id,
        project_id: data.project_id, description: data.description, priority: "High", category: "HSE",
      });
      return record;
    },
    async updateUnsafeCondition(id, changes) { return entities.HSEUnsafeCondition.update(id, changes); },
    async deleteUnsafeCondition(id) { await entities.HSEUnsafeCondition.delete(id); },

    // Near Miss
    async listNearMisses(projectId) {
      if (projectId) return entities.HSENearMiss.filter({ project_id: projectId }, "-reported_date", 500);
      return entities.HSENearMiss.list("-reported_date", 500);
    },
    async createNearMiss(data) {
      const user = getCurrentUser();
      const record = await entities.HSENearMiss.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_near_miss_created", { project_id: data.project_id });
      await appClient.actionPlan.createFromFinding({
        source: "HSE", source_type: "Near Miss", source_id: record.id,
        project_id: data.project_id, description: data.description, priority: data.priority || "Medium", category: "HSE",
      });
      return record;
    },
    async updateNearMiss(id, changes) { return entities.HSENearMiss.update(id, changes); },
    async deleteNearMiss(id) { await entities.HSENearMiss.delete(id); },

    // Incident Report
    async listIncidentReports(projectId) {
      if (projectId) return entities.HSEIncidentReport.filter({ project_id: projectId }, "-incident_date", 500);
      return entities.HSEIncidentReport.list("-incident_date", 500);
    },
    async createIncidentReport(data) {
      const user = getCurrentUser();
      const record = await entities.HSEIncidentReport.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_incident_report_created", { project_id: data.project_id });
      await appClient.actionPlan.createFromFinding({
        source: "HSE", source_type: "Incident Report", source_id: record.id,
        project_id: data.project_id, description: data.description, priority: "Critical", category: "HSE",
      });
      return record;
    },
    async updateIncidentReport(id, changes) { return entities.HSEIncidentReport.update(id, changes); },
    async deleteIncidentReport(id) { await entities.HSEIncidentReport.delete(id); },

    // PPE Checklist
    async listPPEChecklists(projectId) {
      if (projectId) return entities.HSEPPEChecklist.filter({ project_id: projectId }, "-check_date", 500);
      return entities.HSEPPEChecklist.list("-check_date", 500);
    },
    async createPPEChecklist(data) {
      const user = getCurrentUser();
      const record = await entities.HSEPPEChecklist.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("hse_ppe_checklist_created", { project_id: data.project_id });
      return record;
    },
    async updatePPEChecklist(id, changes) { return entities.HSEPPEChecklist.update(id, changes); },
    async deletePPEChecklist(id) { await entities.HSEPPEChecklist.delete(id); },

    // Permit To Work
    async listPermitsToWork(projectId) {
      if (projectId) return entities.HSEPermitToWork.filter({ project_id: projectId }, "-issued_date", 500);
      return entities.HSEPermitToWork.list("-issued_date", 500);
    },
    async createPermitToWork(data) {
      const user = getCurrentUser();
      const record = await entities.HSEPermitToWork.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Active",
      });
      logActivity("hse_permit_to_work_created", { project_id: data.project_id });
      return record;
    },
    async updatePermitToWork(id, changes) { return entities.HSEPermitToWork.update(id, changes); },
    async deletePermitToWork(id) { await entities.HSEPermitToWork.delete(id); },

    // Toolbox Meeting
    async listToolboxMeetings(projectId) {
      if (projectId) return entities.HSEToolboxMeeting.filter({ project_id: projectId }, "-meeting_date", 500);
      return entities.HSEToolboxMeeting.list("-meeting_date", 500);
    },
    async createToolboxMeeting(data) {
      const user = getCurrentUser();
      const record = await entities.HSEToolboxMeeting.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("hse_toolbox_meeting_created", { project_id: data.project_id });
      return record;
    },
    async updateToolboxMeeting(id, changes) { return entities.HSEToolboxMeeting.update(id, changes); },
    async deleteToolboxMeeting(id) { await entities.HSEToolboxMeeting.delete(id); },

    // Safety Meeting
    async listSafetyMeetings(projectId) {
      if (projectId) return entities.HSESafetyMeeting.filter({ project_id: projectId }, "-meeting_date", 500);
      return entities.HSESafetyMeeting.list("-meeting_date", 500);
    },
    async createSafetyMeeting(data) {
      const user = getCurrentUser();
      const record = await entities.HSESafetyMeeting.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("hse_safety_meeting_created", { project_id: data.project_id });
      return record;
    },
    async updateSafetyMeeting(id, changes) { return entities.HSESafetyMeeting.update(id, changes); },
    async deleteSafetyMeeting(id) { await entities.HSESafetyMeeting.delete(id); },

    // Corrective Action
    async listCorrectiveActions(projectId) {
      if (projectId) return entities.HSECorrectiveAction.filter({ project_id: projectId }, "-created_date", 500);
      return entities.HSECorrectiveAction.list("-created_date", 500);
    },
    async createCorrectiveAction(data) {
      const user = getCurrentUser();
      const record = await entities.HSECorrectiveAction.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_corrective_action_created", { project_id: data.project_id });
      return record;
    },
    async updateCorrectiveAction(id, changes) { return entities.HSECorrectiveAction.update(id, changes); },
    async deleteCorrectiveAction(id) { await entities.HSECorrectiveAction.delete(id); },

    // Preventive Action
    async listPreventiveActions(projectId) {
      if (projectId) return entities.HSEPreventiveAction.filter({ project_id: projectId }, "-created_date", 500);
      return entities.HSEPreventiveAction.list("-created_date", 500);
    },
    async createPreventiveAction(data) {
      const user = getCurrentUser();
      const record = await entities.HSEPreventiveAction.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("hse_preventive_action_created", { project_id: data.project_id });
      return record;
    },
    async updatePreventiveAction(id, changes) { return entities.HSEPreventiveAction.update(id, changes); },
    async deletePreventiveAction(id) { await entities.HSEPreventiveAction.delete(id); },

    // HSE Dashboard KPIs
    async getHSEKPI(projectId) {
      const inspections = projectId ? await entities.HSESafetyInspection.filter({ project_id: projectId }) : await entities.HSESafetyInspection.list();
      const observations = projectId ? await entities.HSESafetyObservation.filter({ project_id: projectId }) : await entities.HSESafetyObservation.list();
      const unsafeActions = projectId ? await entities.HSEUnsafeAction.filter({ project_id: projectId }) : await entities.HSEUnsafeAction.list();
      const unsafeConditions = projectId ? await entities.HSEUnsafeCondition.filter({ project_id: projectId }) : await entities.HSEUnsafeCondition.list();
      const nearMisses = projectId ? await entities.HSENearMiss.filter({ project_id: projectId }) : await entities.HSENearMiss.list();
      const incidents = projectId ? await entities.HSEIncidentReport.filter({ project_id: projectId }) : await entities.HSEIncidentReport.list();
      const permits = projectId ? await entities.HSEPermitToWork.filter({ project_id: projectId }) : await entities.HSEPermitToWork.list();
      const toolbox = projectId ? await entities.HSEToolboxMeeting.filter({ project_id: projectId }) : await entities.HSEToolboxMeeting.list();

      return {
        total_inspections: inspections.length,
        total_observations: observations.length,
        total_unsafe_actions: unsafeActions.length,
        total_unsafe_conditions: unsafeConditions.length,
        total_near_misses: nearMisses.length,
        total_incidents: incidents.length,
        total_permits: permits.length,
        total_toolbox: toolbox.length,
        open_incidents: incidents.filter((i) => i.status === "Open").length,
        closed_incidents: incidents.filter((i) => i.status === "Closed").length,
        safety_score: incidents.length > 0
          ? Math.round((incidents.filter((i) => i.status === "Closed").length / incidents.length) * 100)
          : 100,
      };
    },
  },

  // ============================================================
  // SPRINT 2: IPCN MODULE
  // ============================================================
  ipcn: {
    // Infection Prevention Inspection
    async listInspections(projectId) {
      if (projectId) return entities.IPCNInspection.filter({ project_id: projectId }, "-inspection_date", 500);
      return entities.IPCNInspection.list("-inspection_date", 500);
    },
    async createInspection(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNInspection.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("ipcn_inspection_created", { project_id: data.project_id });
      if (data.findings && data.findings.length > 0) {
        for (const finding of data.findings) {
          await appClient.actionPlan.createFromFinding({
            source: "IPCN", source_type: "Infection Prevention Inspection", source_id: record.id,
            project_id: data.project_id, description: finding.description || finding,
            priority: finding.priority || "Medium", category: "IPCN",
          });
        }
      }
      return record;
    },
    async updateInspection(id, changes) { return entities.IPCNInspection.update(id, changes); },
    async deleteInspection(id) { await entities.IPCNInspection.delete(id); },

    // Housekeeping Audit
    async listHousekeepingAudits(projectId) {
      if (projectId) return entities.IPCNHousekeeping.filter({ project_id: projectId }, "-audit_date", 500);
      return entities.IPCNHousekeeping.list("-audit_date", 500);
    },
    async createHousekeepingAudit(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNHousekeeping.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("ipcn_housekeeping_created", { project_id: data.project_id });
      if (data.findings) {
        for (const f of data.findings) {
          await appClient.actionPlan.createFromFinding({
            source: "IPCN", source_type: "Housekeeping Audit", source_id: record.id,
            project_id: data.project_id, description: f.description || f, priority: f.priority || "Medium", category: "IPCN",
          });
        }
      }
      return record;
    },
    async updateHousekeepingAudit(id, changes) { return entities.IPCNHousekeeping.update(id, changes); },
    async deleteHousekeepingAudit(id) { await entities.IPCNHousekeeping.delete(id); },

    // Environmental Monitoring
    async listEnvironmentalMonitoring(projectId) {
      if (projectId) return entities.IPCNEnvironmental.filter({ project_id: projectId }, "-monitoring_date", 500);
      return entities.IPCNEnvironmental.list("-monitoring_date", 500);
    },
    async createEnvironmentalMonitoring(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNEnvironmental.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("ipcn_environmental_created", { project_id: data.project_id });
      return record;
    },
    async updateEnvironmentalMonitoring(id, changes) { return entities.IPCNEnvironmental.update(id, changes); },
    async deleteEnvironmentalMonitoring(id) { await entities.IPCNEnvironmental.delete(id); },

    // Air Quality Inspection
    async listAirQualityInspections(projectId) {
      if (projectId) return entities.IPCNAirQuality.filter({ project_id: projectId }, "-inspection_date", 500);
      return entities.IPCNAirQuality.list("-inspection_date", 500);
    },
    async createAirQualityInspection(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNAirQuality.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("ipcn_air_quality_created", { project_id: data.project_id });
      return record;
    },
    async updateAirQualityInspection(id, changes) { return entities.IPCNAirQuality.update(id, changes); },
    async deleteAirQualityInspection(id) { await entities.IPCNAirQuality.delete(id); },

    // Water Quality Inspection
    async listWaterQualityInspections(projectId) {
      if (projectId) return entities.IPCNWaterQuality.filter({ project_id: projectId }, "-inspection_date", 500);
      return entities.IPCNWaterQuality.list("-inspection_date", 500);
    },
    async createWaterQualityInspection(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNWaterQuality.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("ipcn_water_quality_created", { project_id: data.project_id });
      return record;
    },
    async updateWaterQualityInspection(id, changes) { return entities.IPCNWaterQuality.update(id, changes); },
    async deleteWaterQualityInspection(id) { await entities.IPCNWaterQuality.delete(id); },

    // Isolation Audit
    async listIsolationAudits(projectId) {
      if (projectId) return entities.IPCNIsolationAudit.filter({ project_id: projectId }, "-audit_date", 500);
      return entities.IPCNIsolationAudit.list("-audit_date", 500);
    },
    async createIsolationAudit(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNIsolationAudit.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("ipcn_isolation_audit_created", { project_id: data.project_id });
      if (data.findings) {
        for (const f of data.findings) {
          await appClient.actionPlan.createFromFinding({
            source: "IPCN", source_type: "Isolation Audit", source_id: record.id,
            project_id: data.project_id, description: f.description || f, priority: f.priority || "High", category: "IPCN",
          });
        }
      }
      return record;
    },
    async updateIsolationAudit(id, changes) { return entities.IPCNIsolationAudit.update(id, changes); },
    async deleteIsolationAudit(id) { await entities.IPCNIsolationAudit.delete(id); },

    // Hand Hygiene Audit
    async listHandHygieneAudits(projectId) {
      if (projectId) return entities.IPCNHandHygiene.filter({ project_id: projectId }, "-audit_date", 500);
      return entities.IPCNHandHygiene.list("-audit_date", 500);
    },
    async createHandHygieneAudit(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNHandHygiene.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("ipcn_hand_hygiene_created", { project_id: data.project_id });
      return record;
    },
    async updateHandHygieneAudit(id, changes) { return entities.IPCNHandHygiene.update(id, changes); },
    async deleteHandHygieneAudit(id) { await entities.IPCNHandHygiene.delete(id); },

    // Sterilization Monitoring
    async listSterilizationMonitoring(projectId) {
      if (projectId) return entities.IPCNSterilization.filter({ project_id: projectId }, "-monitoring_date", 500);
      return entities.IPCNSterilization.list("-monitoring_date", 500);
    },
    async createSterilizationMonitoring(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNSterilization.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
      });
      logActivity("ipcn_sterilization_created", { project_id: data.project_id });
      return record;
    },
    async updateSterilizationMonitoring(id, changes) { return entities.IPCNSterilization.update(id, changes); },
    async deleteSterilizationMonitoring(id) { await entities.IPCNSterilization.delete(id); },

    // IPCN Finding
    async listFindings(projectId) {
      if (projectId) return entities.IPCNFinding.filter({ project_id: projectId }, "-created_date", 500);
      return entities.IPCNFinding.list("-created_date", 500);
    },
    async createFinding(data) {
      const user = getCurrentUser();
      const record = await entities.IPCNFinding.create({
        ...data, created_by: user?.id || "", created_by_name: user?.full_name || "",
        status: data.status || "Open",
      });
      logActivity("ipcn_finding_created", { project_id: data.project_id });
      await appClient.actionPlan.createFromFinding({
        source: "IPCN", source_type: data.source_type || "IPCN Finding", source_id: record.id,
        project_id: data.project_id, description: data.description, priority: data.priority || "Medium", category: "IPCN",
      });
      return record;
    },
    async updateFinding(id, changes) { return entities.IPCNFinding.update(id, changes); },
    async deleteFinding(id) { await entities.IPCNFinding.delete(id); },

    // IPCN Dashboard KPIs
    async getIPCNKPI(projectId) {
      const inspections = projectId ? await entities.IPCNInspection.filter({ project_id: projectId }) : await entities.IPCNInspection.list();
      const findings = projectId ? await entities.IPCNFinding.filter({ project_id: projectId }) : await entities.IPCNFinding.list();
      const airQuality = projectId ? await entities.IPCNAirQuality.filter({ project_id: projectId }) : await entities.IPCNAirQuality.list();
      const waterQuality = projectId ? await entities.IPCNWaterQuality.filter({ project_id: projectId }) : await entities.IPCNWaterQuality.list();
      const handHygiene = projectId ? await entities.IPCNHandHygiene.filter({ project_id: projectId }) : await entities.IPCNHandHygiene.list();

      return {
        total_inspections: inspections.length,
        total_findings: findings.length,
        open_findings: findings.filter((f) => f.status === "Open").length,
        closed_findings: findings.filter((f) => f.status === "Closed").length,
        air_quality_checks: airQuality.length,
        water_quality_checks: waterQuality.length,
        hand_hygiene_audits: handHygiene.length,
        compliance_score: findings.length > 0
          ? Math.round((findings.filter((f) => f.status === "Closed").length / findings.length) * 100)
          : 100,
      };
    },
  },

  // ============================================================
  // SPRINT 2: ACTION PLAN MODULE
  // ============================================================
  actionPlan: {
    async list(projectId) {
      if (projectId) return entities.ActionPlan.filter({ project_id: projectId }, "-created_date", 500);
      return entities.ActionPlan.list("-created_date", 500);
    },
    async get(planId) { return entities.ActionPlan.get(planId); },
    async create(data) {
      const user = getCurrentUser();
      // Auto-generate plan number
      const allPlans = await entities.ActionPlan.list("-created_date");
      const planNumber = `AP-${String(allPlans.length + 1).padStart(4, "0")}`;
      const record = await entities.ActionPlan.create({
        ...data,
        plan_number: data.plan_number || planNumber,
        created_by: user?.id || "",
        created_by_name: user?.full_name || "",
        status: data.status || "Open",
        progress: data.progress || 0,
      });
      logActivity("action_plan_created", { project_id: data.project_id, plan_number: record.plan_number });
      // Create notification
      if (data.pic) {
        await appClient.notification.create({
          user_id: data.pic,
          type: "action_plan",
          title: "New Action Plan Assigned",
          message: `Action Plan ${record.plan_number} has been assigned to you`,
          project_id: data.project_id,
          reference_id: record.id,
          reference_type: "ActionPlan",
        });
      }
      return record;
    },
    async createFromFinding(data) {
      return appClient.actionPlan.create({
        project_id: data.project_id,
        category: data.category || "General",
        priority: data.priority || "Medium",
        description: data.description,
        root_cause: data.root_cause || "",
        corrective_action: data.corrective_action || "",
        preventive_action: data.preventive_action || "",
        source: data.source,
        source_type: data.source_type,
        source_id: data.source_id,
        pic: data.pic || "",
        due_date: data.due_date || "",
        status: "Open",
      });
    },
    async update(planId, changes) {
      const record = await entities.ActionPlan.update(planId, changes);
      logActivity("action_plan_updated", { planId, changes: Object.keys(changes) });
      return record;
    },
    async delete(planId) {
      await entities.ActionPlan.delete(planId);
      logActivity("action_plan_deleted", { planId });
    },
    async updateStatus(planId, status) {
      const user = getCurrentUser();
      const record = await entities.ActionPlan.update(planId, {
        status,
        ...(status === "Completed" ? { completed_date: now(), completed_by: user?.id || "" } : {}),
        ...(status === "Approved" ? { approved_date: now(), approved_by: user?.id || "" } : {}),
      });
      logActivity("action_plan_status_changed", { planId, status });
      return record;
    },
    async addEvidence(planId, evidence) {
      const plan = await entities.ActionPlan.get(planId);
      const existing = plan.evidence || [];
      existing.push({ ...evidence, added_date: now() });
      return entities.ActionPlan.update(planId, { evidence: existing });
    },
    async getOverdue() {
      const all = await entities.ActionPlan.list("-created_date");
      const now = new Date();
      return all.filter((p) => p.status !== "Completed" && p.status !== "Closed" && p.due_date && new Date(p.due_date) < now);
    },
    async getKPI(projectId) {
      const plans = projectId ? await entities.ActionPlan.filter({ project_id: projectId }) : await entities.ActionPlan.list();
      return {
        total: plans.length,
        open: plans.filter((p) => p.status === "Open").length,
        in_progress: plans.filter((p) => p.status === "In Progress").length,
        completed: plans.filter((p) => p.status === "Completed" || p.status === "Closed").length,
        overdue: plans.filter((p) => p.status !== "Completed" && p.status !== "Closed" && p.due_date && new Date(p.due_date) < new Date()).length,
        completion_rate: plans.length > 0 ? Math.round((plans.filter((p) => p.status === "Completed" || p.status === "Closed").length / plans.length) * 100) : 0,
      };
    },
  },

  // ============================================================
  // SPRINT 2: NOTIFICATION CENTER
  // ============================================================
  notification: {
    async list(userId) {
      if (userId) return entities.NotificationCenter.filter({ user_id: userId }, "-created_date", 200);
      return entities.NotificationCenter.list("-created_date", 200);
    },
    async create(data) {
      return entities.NotificationCenter.create({
        ...data,
        read: false,
        created_date: now(),
      });
    },
    async markAsRead(notificationId) {
      return entities.NotificationCenter.update(notificationId, { read: true, read_date: now() });
    },
    async markAllAsRead(userId) {
      const notifications = await entities.NotificationCenter.filter({ user_id: userId, read: false });
      for (const n of notifications) {
        await entities.NotificationCenter.update(n.id, { read: true, read_date: now() });
      }
    },
    async delete(notificationId) {
      await entities.NotificationCenter.delete(notificationId);
    },
    async getUnreadCount(userId) {
      const notifications = await entities.NotificationCenter.filter({ user_id: userId, read: false });
      return notifications.length;
    },
    async notifyAll(users, data) {
      for (const userId of users) {
        await appClient.notification.create({ ...data, user_id: userId });
      }
    },
  },

  // ============================================================
  // SPRINT 2: EMAIL SYSTEM
  // ============================================================
  email: {
    async send(to, subject, body, options = {}) {
      const recipient = Array.isArray(to) ? to[0] : to;
      const record = await entities.EmailQueue.create({
        to: Array.isArray(to) ? to : [to],
        subject,
        body,
        type: options.type || "notification",
        status: "queued",
        sent_date: null,
        error: null,
      });
      // Send via Resend API endpoint (Vercel serverless)
      try {
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const endpoint = apiUrl ? `${apiUrl}/api/send-email` : '/api/send-email';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: recipient, subject, body, type: options.type || 'notification' }),
        });
        if (response.ok) {
          const result = await response.json();
          await entities.EmailQueue.update(record.id, { status: 'sent', sent_date: now(), provider_id: result.id || '' });
        } else {
          const err = await response.json().catch(() => ({ error: 'Failed to send email' }));
          await entities.EmailQueue.update(record.id, { status: 'failed', error: err.error || 'Unknown error' });
        }
      } catch (err) {
        // If API is not available (e.g. local dev without Vercel), mark as queued for later processing
        await entities.EmailQueue.update(record.id, { status: 'queued', error: err.message });
      }
      logActivity("email_queued", { to, subject, type: options.type });
      return record;
    },
    async sendVerificationEmail(email, otpCode) {
      return appClient.email.send(email, "Verify Your Account - SHKJ PM",
        `Your verification code is: ${otpCode}. This code expires in 10 minutes.`,
        { type: "verification" }
      );
    },
    async sendWelcomeEmail(email, name) {
      return appClient.email.send(email, "Welcome to SHKJ Project Management",
        `Hi ${name || "User"}, welcome to SHKJ Project Management System!`,
        { type: "welcome" }
      );
    },
    async sendPasswordResetEmail(email, resetUrl) {
      return appClient.email.send(email, "Reset Your Password - SHKJ PM",
        `Click here to reset your password: ${resetUrl}`,
        { type: "password_reset" }
      );
    },
    async sendInvitationEmail(email, role) {
      return appClient.email.send(email, "You've Been Invited - SHKJ PM",
        `You have been invited as ${role}. Login to get started.`,
        { type: "invitation" }
      );
    },
    async sendApprovalEmail(email, module, status) {
      return appClient.email.send(email, `Approval Update - ${module}`,
        `Your ${module} has been ${status}.`,
        { type: "approval" }
      );
    },
    async sendReminderEmail(email, subject, message) {
      return appClient.email.send(email, `Reminder: ${subject}`, message, { type: "reminder" });
    },
    async sendActionPlanReminder(email, planNumber, dueDate) {
      return appClient.email.send(email, `Action Plan Reminder - ${planNumber}`,
        `Action Plan ${planNumber} is due on ${dueDate}. Please take action.`,
        { type: "reminder" }
      );
    },
    async getQueue() {
      return entities.EmailQueue.list("-created_date", 200);
    },
    async delete(emailId) {
      await entities.EmailQueue.delete(emailId);
    },
    async processQueue() {
      const queue = await entities.EmailQueue.filter({ status: "queued" });
      for (const item of queue) {
        await entities.EmailQueue.update(item.id, { status: "sent", sent_date: now() });
      }
      return { processed: queue.length };
    },
  },

  // ============================================================
  // SPRINT 2: OTP VERIFICATION
  // ============================================================
  otp: {
    generate() {
      return String(Math.floor(100000 + Math.random() * 900000));
    },
    async create(email) {
      // Invalidate any existing OTPs for this email
      const existing = await entities.OTPCode.filter({ email, used: false });
      for (const otp of existing) {
        await entities.OTPCode.update(otp.id, { used: true, invalidated_date: now() });
      }
      const code = appClient.otp.generate();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
      const record = await entities.OTPCode.create({
        email,
        code,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      });
      // Send email with OTP
      await appClient.email.sendVerificationEmail(email, code);
      return { id: record.id, expires_at: expiresAt };
    },
    async verify(email, code) {
      const otps = await entities.OTPCode.filter({ email, used: false }, "-created_date");
      const validOtp = otps.find((o) => o.code === code);
      if (!validOtp) throw new Error("Invalid OTP code");
      if (new Date(validOtp.expires_at) < new Date()) throw new Error("OTP has expired");
      await entities.OTPCode.update(validOtp.id, { used: true, verified_date: now() });
      return { verified: true };
    },
    async resend(email) {
      return appClient.otp.create(email);
    },
    async changeEmail(oldEmail, newEmail) {
      // Verify new email is available
      if (accounts().some((a) => a.email.toLowerCase() === newEmail.toLowerCase())) {
        throw new Error("Email already in use");
      }
      const allAccounts = accounts();
      const account = allAccounts.find((a) => a.email.toLowerCase() === oldEmail.toLowerCase());
      if (account) {
        account.email = newEmail;
        account.verified = false;
        saveAccounts(allAccounts);
      }
      return appClient.otp.create(newEmail);
    },
  },

  // ============================================================
  // SPRINT 2: AUDIT LOG
  // ============================================================
  auditLog: {
    async list(projectId) {
      if (projectId) {
        const all = await entities.AuditLogEntry.list("-timestamp", 1000);
        return all.filter((e) => e.project_id === projectId);
      }
      return entities.AuditLogEntry.list("-timestamp", 1000);
    },
    async create(data) {
      return entities.AuditLogEntry.create({
        ...data,
        timestamp: now(),
      });
    },
    async filter(query) {
      return entities.AuditLogEntry.filter(query, "-timestamp", 500);
    },
    async getByUser(userId) {
      return entities.AuditLogEntry.filter({ user_id: userId }, "-timestamp", 200);
    },
    async getByAction(action) {
      return entities.AuditLogEntry.filter({ action }, "-timestamp", 200);
    },
    async getByDateRange(startDate, endDate) {
      const all = await entities.AuditLogEntry.list("-timestamp", 1000);
      return all.filter((e) => e.timestamp >= startDate && e.timestamp <= endDate);
    },
    async getSummary() {
      const all = await entities.AuditLogEntry.list("-timestamp", 1000);
      const actions = {};
      all.forEach((e) => {
        actions[e.action] = (actions[e.action] || 0) + 1;
      });
      return {
        total: all.length,
        today: all.filter((e) => new Date(e.timestamp).toDateString() === new Date().toDateString()).length,
        this_week: all.filter((e) => new Date(e.timestamp) > new Date(Date.now() - 7 * 86400000)).length,
        actions: Object.entries(actions).map(([action, count]) => ({ action, count })),
      };
    },
  },

  // ============================================================
  // SPRINT 2: REPORTING ENGINE
  // ============================================================
  reports: {
    // Generate Daily Report
    async generateDailyReport(projectId, date) {
      const targetDate = date || new Date().toISOString().split("T")[0];
      const dailyEntries = await entities.ProgressDaily.filter({ project_id: projectId, date: targetDate });
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const photos = await entities.PhotoProgress.filter({ project_id: projectId });
      const project = (await entities.Project.filter({ id: projectId }))[0];

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
      const physicalProgress = totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0;

      return {
        type: "Daily",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        date: targetDate,
        entries: dailyEntries,
        total_entries: dailyEntries.length,
        approved_entries: dailyEntries.filter((e) => e.approval_status === "Approved").length,
        boq_summary: { total_boq: totalBOQ, completed_value: completedValue, physical_progress: physicalProgress },
        photos: photos.filter((p) => p.date === targetDate),
        generated_at: now(),
      };
    },

    // Generate Weekly Report
    async generateWeeklyReport(projectId, endDate) {
      const targetEnd = endDate || new Date().toISOString().split("T")[0];
      const targetStart = new Date(new Date(targetEnd).getTime() - 7 * 86400000).toISOString().split("T")[0];
      const allEntries = await entities.ProgressDaily.filter({ project_id: projectId }, "-date", 500);
      const weeklyEntries = allEntries.filter((e) => e.date >= targetStart && e.date <= targetEnd);
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const project = (await entities.Project.filter({ id: projectId }))[0];

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
      const weekCompleted = weeklyEntries.reduce((s, e) => s + Number(e.actual_progress || 0), 0);

      return {
        type: "Weekly",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        period: { start: targetStart, end: targetEnd },
        entries: weeklyEntries,
        total_entries: weeklyEntries.length,
        week_progress: weekCompleted,
        boq_summary: { total_boq: totalBOQ, completed_value: completedValue, physical_progress: totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0 },
        generated_at: now(),
      };
    },

    // Generate Monthly Report
    async generateMonthlyReport(projectId, month, year) {
      const targetMonth = month || new Date().getMonth() + 1;
      const targetYear = year || new Date().getFullYear();
      const allEntries = await entities.ProgressDaily.filter({ project_id: projectId }, "-date", 500);
      const monthlyEntries = allEntries.filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
      });
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const project = (await entities.Project.filter({ id: projectId }))[0];

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
      const monthCompleted = monthlyEntries.reduce((s, e) => s + Number(e.actual_progress || 0), 0);

      // HSE data for month
      const hseIncidents = await entities.HSEIncidentReport.filter({ project_id: projectId });
      const monthIncidents = hseIncidents.filter((i) => {
        const d = new Date(i.incident_date || i.created_date);
        return d.getMonth() + 1 === targetMonth && d.getFullYear() === targetYear;
      });

      return {
        type: "Monthly",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        period: { month: targetMonth, year: targetYear },
        entries: monthlyEntries,
        total_entries: monthlyEntries.length,
        month_progress: monthCompleted,
        boq_summary: { total_boq: totalBOQ, completed_value: completedValue, physical_progress: totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0 },
        hse_incidents: monthIncidents.length,
        generated_at: now(),
      };
    },

    // Generate Executive Report
    async generateExecutiveReport(projectId) {
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const dailyEntries = await entities.ProgressDaily.filter({ project_id: projectId, approval_status: "Approved" }, "-date", 500);
      const issues = await entities.IssueLog.filter({ project_id: projectId });
      const risks = await entities.RiskRegister.filter({ project_id: projectId });
      const photos = await entities.PhotoProgress.filter({ project_id: projectId });
      const hseKPI = await appClient.hse.getHSEKPI(projectId);
      const ipcnKPI = await appClient.ipcn.getIPCNKPI(projectId);
      const actionPlanKPI = await appClient.actionPlan.getKPI(projectId);

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
      const physicalProgress = totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0;

      return {
        type: "Executive",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        project_status: project?.status || "Unknown",
        budget: project?.budget || 0,
        boq_summary: { total_boq: totalBOQ, completed_value: completedValue, physical_progress: physicalProgress, remaining: totalBOQ - completedValue },
        progress: { total_daily: dailyEntries.length, total_photos: photos.length },
        issues: { total: issues.length, open: issues.filter((i) => i.status === "Open" || i.status === "In Progress").length },
        risks: { total: risks.length, critical: risks.filter((r) => r.risk_level === "Critical").length },
        hse: hseKPI,
        ipcn: ipcnKPI,
        action_plans: actionPlanKPI,
        generated_at: now(),
      };
    },

    // Generate Project Report
    async generateProjectReport(projectId) {
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const dailyEntries = await entities.ProgressDaily.filter({ project_id: projectId }, "-date", 500);
      const vendors = await entities.Vendor.filter({ project_id: projectId });
      const photos = await entities.PhotoProgress.filter({ project_id: projectId });

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);

      // Group by category
      const categories = {};
      boqItems.forEach((item) => {
        const cat = item.work_category || "Other";
        if (!categories[cat]) categories[cat] = { total: 0, completed: 0, count: 0 };
        categories[cat].total += Number(item.total_price || item.total_harga || 0);
        categories[cat].completed += Number(item.completed_value || 0);
        categories[cat].count += 1;
      });

      return {
        type: "Project",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        status: project?.status || "Unknown",
        start_date: project?.start_date || "",
        end_date: project?.end_date || "",
        budget: project?.budget || 0,
        boq_summary: { total_boq: totalBOQ, completed_value: completedValue, physical_progress: totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0, items: boqItems.length },
        categories: Object.entries(categories).map(([name, data]) => ({ name, ...data })),
        daily_entries: dailyEntries.length,
        vendors: vendors.length,
        photos: photos.length,
        generated_at: now(),
      };
    },

    // Generate Progress Report
    async generateProgressReport(projectId) {
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const dailyEntries = await entities.ProgressDaily.filter({ project_id: projectId, approval_status: "Approved" }, "-date", 500);
      const project = (await entities.Project.filter({ id: projectId }))[0];

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
      const physicalProgress = totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0;

      // Weekly breakdown
      const weeklyData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000);
        const dateStr = d.toISOString().split("T")[0];
        const dayEntries = dailyEntries.filter((e) => e.date === dateStr);
        weeklyData.push({
          date: dateStr,
          entries: dayEntries.length,
          progress: dayEntries.reduce((s, e) => s + Number(e.actual_progress || 0), 0),
        });
      }

      return {
        type: "Progress",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        physical_progress: physicalProgress,
        financial_progress: physicalProgress,
        boq_summary: { total_boq: totalBOQ, completed_value: completedValue, remaining: totalBOQ - completedValue },
        weekly_trend: weeklyData,
        total_entries: dailyEntries.length,
        generated_at: now(),
      };
    },

    // Generate BOQ Report
    async generateBOQReport(projectId) {
      const boqItems = await entities.BOQItem.filter({ project_id: projectId }, "no", 500);
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const revisions = await entities.BOQRevision.filter({ project_id: projectId }, "-revision", 50);

      const totalBOQ = boqItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
      const completedValue = boqItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);

      const categories = {};
      boqItems.forEach((item) => {
        const cat = item.work_category || "Other";
        if (!categories[cat]) categories[cat] = { total: 0, completed: 0, count: 0 };
        categories[cat].total += Number(item.total_price || item.total_harga || 0);
        categories[cat].completed += Number(item.completed_value || 0);
        categories[cat].count += 1;
      });

      return {
        type: "BOQ",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        total_items: boqItems.length,
        total_boq: totalBOQ,
        completed_value: completedValue,
        physical_progress: totalBOQ > 0 ? (completedValue / totalBOQ * 100) : 0,
        categories: Object.entries(categories).map(([name, data]) => ({ name, ...data })),
        items: boqItems,
        revisions: revisions.length,
        generated_at: now(),
      };
    },

    // Generate Vendor Report
    async generateVendorReport(projectId) {
      const vendors = await entities.Vendor.filter({ project_id: projectId });
      const boqItems = await entities.BOQItem.filter({ project_id: projectId });
      const project = (await entities.Project.filter({ id: projectId }))[0];

      const vendorData = vendors.map((v) => {
        const vendorItems = boqItems.filter((i) => i.vendor === v.name || i.vendor === v.id);
        const totalValue = vendorItems.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
        const completedValue = vendorItems.reduce((s, i) => s + Number(i.completed_value || 0), 0);
        return {
          vendor: v.name || v.company_name || "Unknown",
          items: vendorItems.length,
          total_value: totalValue,
          completed_value: completedValue,
          progress: totalValue > 0 ? (completedValue / totalValue * 100) : 0,
        };
      });

      return {
        type: "Vendor",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        total_vendors: vendors.length,
        vendors: vendorData,
        generated_at: now(),
      };
    },

    // Generate HSE Report
    async generateHSEReport(projectId) {
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const kpi = await appClient.hse.getHSEKPI(projectId);
      const incidents = projectId ? await entities.HSEIncidentReport.filter({ project_id: projectId }, "-incident_date", 200) : await entities.HSEIncidentReport.list("-incident_date", 200);
      const inspections = projectId ? await entities.HSESafetyInspection.filter({ project_id: projectId }, "-inspection_date", 200) : await entities.HSESafetyInspection.list("-inspection_date", 200);
      const toolbox = projectId ? await entities.HSEToolboxMeeting.filter({ project_id: projectId }, "-meeting_date", 200) : await entities.HSEToolboxMeeting.list("-meeting_date", 200);

      return {
        type: "HSE",
        project: project?.name || "All Projects",
        project_code: project?.code || "",
        kpi,
        incidents,
        inspections,
        toolbox_meetings: toolbox,
        generated_at: now(),
      };
    },

    // Generate IPCN Report
    async generateIPCNReport(projectId) {
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const kpi = await appClient.ipcn.getIPCNKPI(projectId);
      const findings = projectId ? await entities.IPCNFinding.filter({ project_id: projectId }, "-created_date", 200) : await entities.IPCNFinding.list("-created_date", 200);
      const inspections = projectId ? await entities.IPCNInspection.filter({ project_id: projectId }, "-inspection_date", 200) : await entities.IPCNInspection.list("-inspection_date", 200);

      return {
        type: "IPCN",
        project: project?.name || "All Projects",
        project_code: project?.code || "",
        kpi,
        findings,
        inspections,
        generated_at: now(),
      };
    },

    // Generate Action Plan Report
    async generateActionPlanReport(projectId) {
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const kpi = await appClient.actionPlan.getKPI(projectId);
      const plans = projectId ? await entities.ActionPlan.filter({ project_id: projectId }, "-created_date", 500) : await entities.ActionPlan.list("-created_date", 500);

      return {
        type: "Action Plan",
        project: project?.name || "All Projects",
        project_code: project?.code || "",
        kpi,
        plans,
        generated_at: now(),
      };
    },

    // Generate Photo Progress Report
    async generatePhotoProgressReport(projectId) {
      const project = (await entities.Project.filter({ id: projectId }))[0];
      const photos = await entities.PhotoProgress.filter({ project_id: projectId }, "-timestamp", 500);

      // Group by area
      const byArea = {};
      photos.forEach((p) => {
        const area = p.area || "Other";
        if (!byArea[area]) byArea[area] = [];
        byArea[area].push(p);
      });

      return {
        type: "Photo Progress",
        project: project?.name || "Unknown",
        project_code: project?.code || "",
        total_photos: photos.length,
        by_area: Object.entries(byArea).map(([area, areaPhotos]) => ({ area, count: areaPhotos.length, photos: areaPhotos })),
        generated_at: now(),
      };
    },

    // Save generated report
    async saveReport(reportData) {
      const user = getCurrentUser();
      return entities.ReportEntity.create({
        ...reportData,
        created_by: user?.id || "",
        created_by_name: user?.full_name || "",
      });
    },

    // List saved reports
    async listSavedReports(projectId) {
      if (projectId) return entities.ReportEntity.filter({ project_id: projectId }, "-created_date", 200);
      return entities.ReportEntity.list("-created_date", 200);
    },

    // Get report by ID
    async getReport(reportId) {
      return entities.ReportEntity.get(reportId);
    },

    // Delete report
    async deleteReport(reportId) {
      await entities.ReportEntity.delete(reportId);
    },
  },

  // ============================================================
  // SPRINT 2: EXPORT SERVICES
  // ============================================================
  export: {
    // Export to PDF (generates HTML-based PDF content)
    async toPDF(reportData, options = {}) {
      const html = appClient.export.generateHTMLReport(reportData, options);
      const job = await entities.ExportJob.create({
        type: "pdf",
        report_type: reportData.type,
        project_id: reportData.project_id,
        status: "completed",
        content: html,
        generated_at: now(),
        options,
      });
      logActivity("export_pdf_created", { report_type: reportData.type });
      return { job_id: job.id, html, download_url: `#export-${job.id}` };
    },

    // Export to Excel (generates CSV data)
    async toExcel(reportData, options = {}) {
      const csv = appClient.export.generateCSVReport(reportData, options);
      const job = await entities.ExportJob.create({
        type: "excel",
        report_type: reportData.type,
        project_id: reportData.project_id,
        status: "completed",
        content: csv,
        generated_at: now(),
        options,
      });
      logActivity("export_excel_created", { report_type: reportData.type });
      return { job_id: job.id, csv, download_url: `#export-${job.id}` };
    },

    // Export to PowerPoint (generates HTML slide content)
    async toPowerPoint(reportData, options = {}) {
      const slides = appClient.export.generateSlideContent(reportData, options);
      const job = await entities.ExportJob.create({
        type: "powerpoint",
        report_type: reportData.type,
        project_id: reportData.project_id,
        status: "completed",
        content: JSON.stringify(slides),
        generated_at: now(),
        options,
      });
      logActivity("export_powerpoint_created", { report_type: reportData.type });
      return { job_id: job.id, slides, download_url: `#export-${job.id}` };
    },

    // Generate HTML report for PDF export
    generateHTMLReport(reportData, options = {}) {
      const { project, type, generated_at, boq_summary, kpi } = reportData;
      const logo = options.logo || '<div style="font-size:24px;font-weight:bold;">SHKJ PM</div>';
      const date = new Date(generated_at || now()).toLocaleDateString("id-ID");

      let html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${type} Report</title>
<style>
  body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
  .header { text-align: center; border-bottom: 2px solid #1a73e8; padding-bottom: 20px; margin-bottom: 30px; }
  .header h1 { color: #1a73e8; margin: 0; font-size: 24px; }
  .header p { color: #666; margin: 5px 0 0; }
  .section { margin-bottom: 25px; }
  .section h2 { color: #1a73e8; font-size: 18px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { padding: 8px 12px; text-align: left; border: 1px solid #ddd; font-size: 13px; }
  th { background: #f5f5f5; font-weight: 600; }
  .kpi-grid { display: flex; flex-wrap: wrap; gap: 15px; margin: 15px 0; }
  .kpi-item { flex: 1; min-width: 150px; padding: 15px; background: #f8f9fa; border-radius: 8px; text-align: center; }
  .kpi-value { font-size: 22px; font-weight: bold; color: #1a73e8; }
  .kpi-label { font-size: 12px; color: #666; margin-top: 5px; }
  .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #999; }
  .signature { margin-top: 30px; display: flex; justify-content: space-between; }
  .signature div { text-align: center; width: 200px; }
  .signature .line { border-top: 1px solid #333; margin-top: 50px; padding-top: 5px; font-size: 12px; }
</style></head><body>
<div class="header">
  ${logo}
  <h1>${type} Report</h1>
  <p>${project || "Project"} | Generated: ${date}</p>
</div>`;

      // KPI Summary
      if (boq_summary) {
        html += `
<div class="section">
  <h2>KPI Summary</h2>
  <div class="kpi-grid">
    <div class="kpi-item"><div class="kpi-value">${(boq_summary.physical_progress || 0).toFixed(1)}%</div><div class="kpi-label">Physical Progress</div></div>
    <div class="kpi-item"><div class="kpi-value">Rp ${(boq_summary.total_boq || 0).toLocaleString("id-ID")}</div><div class="kpi-label">Total BOQ</div></div>
    <div class="kpi-item"><div class="kpi-value">Rp ${(boq_summary.completed_value || 0).toLocaleString("id-ID")}</div><div class="kpi-label">Completed Value</div></div>
  </div>
</div>`;
      }

      // Data table
      if (reportData.entries && reportData.entries.length > 0) {
        html += `
<div class="section">
  <h2>Entries (${reportData.entries.length})</h2>
  <table>
    <tr><th>Date</th><th>Activity</th><th>Progress</th><th>Status</th></tr>`;
        reportData.entries.slice(0, 20).forEach((e) => {
          html += `<tr><td>${e.date || "-"}</td><td>${e.activity || "-"}</td><td>${e.actual_progress || 0}%</td><td>${e.approval_status || "-"}</td></tr>`;
        });
        html += `</table></div>`;
      }

      // HSE section
      if (kpi) {
        html += `
<div class="section">
  <h2>HSE Summary</h2>
  <div class="kpi-grid">
    <div class="kpi-item"><div class="kpi-value">${kpi.total_incidents || 0}</div><div class="kpi-label">Incidents</div></div>
    <div class="kpi-item"><div class="kpi-value">${kpi.safety_score || 100}%</div><div class="kpi-label">Safety Score</div></div>
  </div>
</div>`;
      }

      // Signature
      html += `
<div class="signature">
  <div><div class="line">Prepared By</div></div>
  <div><div class="line">Reviewed By</div></div>
  <div><div class="line">Approved By</div></div>
</div>
<div class="footer">
  <p>SHKJ Project Management System | Confidential</p>
  <p>Generated on ${date}</p>
</div>
</body></html>`;

      return html;
    },

    // Generate CSV for Excel export
    generateCSVReport(reportData, options = {}) {
      let csv = `"${reportData.type} Report","${reportData.project || "Project"}"\n`;
      csv += `"Generated","${new Date().toLocaleDateString("id-ID")}"\n\n`;

      if (reportData.boq_summary) {
        csv += `"KPI","Value"\n`;
        csv += `"Physical Progress","${(reportData.boq_summary.physical_progress || 0).toFixed(1)}%"\n`;
        csv += `"Total BOQ","${(reportData.boq_summary.total_boq || 0).toLocaleString("id-ID")}"\n`;
        csv += `"Completed Value","${(reportData.boq_summary.completed_value || 0).toLocaleString("id-ID")}"\n\n`;
      }

      if (reportData.entries && reportData.entries.length > 0) {
        csv += `"Date","Activity","Area","Progress","Status"\n`;
        reportData.entries.forEach((e) => {
          csv += `"${e.date || ""}","${(e.activity || "").replace(/"/g, '""')}","${e.area || ""}","${e.actual_progress || 0}","${e.approval_status || ""}"\n`;
        });
      }

      return csv;
    },

    // Generate slide content for PowerPoint export
    generateSlideContent(reportData, options = {}) {
      const slides = [
        {
          title: `${reportData.type} Report`,
          content: `Project: ${reportData.project || "N/A"}\nGenerated: ${new Date().toLocaleDateString("id-ID")}`,
          type: "title",
        },
      ];

      if (reportData.boq_summary) {
        slides.push({
          title: "KPI Summary",
          content: [
            { label: "Physical Progress", value: `${(reportData.boq_summary.physical_progress || 0).toFixed(1)}%` },
            { label: "Total BOQ", value: `Rp ${(reportData.boq_summary.total_boq || 0).toLocaleString("id-ID")}` },
            { label: "Completed Value", value: `Rp ${(reportData.boq_summary.completed_value || 0).toLocaleString("id-ID")}` },
          ],
          type: "kpi",
        });
      }

      if (reportData.entries && reportData.entries.length > 0) {
        slides.push({
          title: "Entry Details",
          content: reportData.entries.slice(0, 15).map((e) => ({
            date: e.date || "-",
            activity: e.activity || "-",
            progress: `${e.actual_progress || 0}%`,
          })),
          type: "table",
        });
      }

      slides.push({
        title: "Thank You",
        content: "This report was generated by SHKJ Project Management System",
        type: "closing",
      });

      return slides;
    },

    // List export jobs
    async listJobs(projectId) {
      if (projectId) return entities.ExportJob.filter({ project_id: projectId }, "-generated_at", 100);
      return entities.ExportJob.list("-generated_at", 100);
    },

    // Get export job
    async getJob(jobId) {
      return entities.ExportJob.get(jobId);
    },
  },

  // ============================================================
  // SPRINT 2: DASHBOARD SYNCHRONIZATION
  // ============================================================
  dashboard: {
    async getFullDashboardData(projectId) {
      const projects = projectId
        ? [await entities.Project.get(projectId)]
        : await entities.Project.list("-created_date", 200);
      const activeProjects = projects.filter((p) => p.status === "Active");

      // Aggregate BOQ data
      let totalBOQ = 0, totalCompleted = 0, totalItems = 0;
      for (const p of activeProjects) {
        const items = await entities.BOQItem.filter({ project_id: p.id });
        totalBOQ += items.reduce((s, i) => s + Number(i.total_price || i.total_harga || 0), 0);
        totalCompleted += items.reduce((s, i) => s + Number(i.completed_value || 0), 0);
        totalItems += items.length;
      }

      // Daily progress stats
      const allDaily = await entities.ProgressDaily.list("-date", 1000);
      const today = new Date().toISOString().split("T")[0];
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

      const todayActivities = allDaily.filter((e) => e.date === today);
      const delayedActivities = allDaily.filter((e) => e.approval_status === "Draft" && e.date < today);
      const completedActivities = allDaily.filter((e) => e.approval_status === "Approved");
      const plannedActivities = allDaily.filter((e) => e.date >= today);

      // HSE KPIs
      const hseData = await appClient.hse.getHSEKPI(projectId);

      // IPCN KPIs
      const ipcnData = await appClient.ipcn.getIPCNKPI(projectId);

      // Action Plan KPIs
      const actionPlanData = await appClient.actionPlan.getKPI(projectId);

      // Issues
      const issues = await entities.IssueLog.list("-created_date", 500);
      const openIssues = issues.filter((i) => i.status === "Open" || i.status === "In Progress");
      const closedIssues = issues.filter((i) => i.status === "Closed");

      // Vendors
      const vendors = await entities.Vendor.list("name", 200);
      const vendorPerformance = vendors.map((v) => {
        const vItems = allDaily.filter((e) => e.vendor === v.name || e.contractor === v.name);
        return {
          name: v.name || v.company_name || "Unknown",
          total_activities: vItems.length,
          completed: vItems.filter((e) => e.approval_status === "Approved").length,
        };
      });

      return {
        // Physical Progress
        physical_progress: totalBOQ > 0 ? (totalCompleted / totalBOQ * 100) : 0,
        // Financial Progress
        financial_progress: totalBOQ > 0 ? (totalCompleted / totalBOQ * 100) : 0,
        // BOQ Completion
        boq_completion: { total: totalBOQ, completed: totalCompleted, items: totalItems },
        // Today's Activities
        today_activities: todayActivities.length,
        // Delayed Activities
        delayed_activities: delayedActivities.length,
        // Completed Activities
        completed_activities: completedActivities.length,
        // Planned Activities
        planned_activities: plannedActivities.length,
        // Vendor Performance
        vendor_performance: vendorPerformance,
        // Safety KPI
        safety_kpi: hseData,
        // IPCN KPI
        ipcn_kpi: ipcnData,
        // Open Issues
        open_issues: openIssues.length,
        // Closed Issues
        closed_issues: closedIssues.length,
        // Action Plans
        action_plans: actionPlanData,
        // Budget Utilization
        budget_utilization: {
          total_budget: projects.reduce((s, p) => s + (p.budget || 0), 0),
          total_boq: totalBOQ,
          completed_value: totalCompleted,
          utilization_rate: totalBOQ > 0 ? (totalCompleted / totalBOQ * 100) : 0,
        },
        // Projects
        projects: activeProjects.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          status: p.status,
          budget: p.budget || 0,
        })),
        updated_at: now(),
      };
    },
  },

  integrations: { Core: {
    async UploadFile({ file }) { return { file_url: await fileToDataUrl(file) }; },
    async ExtractDataFromUploadedFile({ file_url }) {
      if (!file_url.startsWith("data:text/csv") && !file_url.startsWith("data:text/csv;base64") && !file_url.startsWith("data:application/vnd")) {
        // Try to detect CSV from content
        if (file_url.includes("%2C") || file_url.includes(",")) {
          const text = decodeURIComponent(atob(file_url.split(",")[1] || ""));
          return { output: { items: parseCsv(text) } };
        }
        throw new Error("Local import supports CSV files. Use columns: item_number,item_name,work_category,description,unit,quantity,unit_price,vendor.");
      }
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

  // Utility exports
  utils: {
    parseCsv,
    parseXLSXArrayBuffer,
    fileToDataUrl,
    fileToArrayBuffer,
    boqUtils,
    fmtCurrency: (val) => `Rp ${Number(val || 0).toLocaleString("id-ID")}`,
    fmtNumber: (val) => Number(val || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 }),
    now,
    id,
    logActivity,
    getCurrentUser,
  },
};