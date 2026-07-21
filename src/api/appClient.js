const STORE_PREFIX = "shkj_pm_";
const ENTITY_NAMES = [
  "Appointment", "BOQItem", "CompanyProfile", "Doctor", "Invoice", "IssueLog",
  "MedicalRecord", "Patient", "ProgressDaily", "Project", "RiskRegister", "User", "Vendor",
  "Department", "Team", "ActivityLog", "PhotoProgress", "BOQRevision",
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