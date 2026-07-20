const STORE_PREFIX = "shkj_pm_";
const ENTITY_NAMES = [
  "Appointment", "BOQItem", "CompanyProfile", "Doctor", "Invoice", "IssueLog",
  "MedicalRecord", "Patient", "ProgressDaily", "Project", "RiskRegister", "User", "Vendor",
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
const accountUser = (account) => ({ id: account.id, email: account.email, role: account.role || "Viewer", full_name: account.full_name });
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

const auth = {
  async me() { return accountUser(requireAccount()); },
  async register({ email, password }) {
    if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("An account with this email already exists");
    const account = { id: id(), email, password, role: "Viewer", verified: false, otp: "000000", created_date: now() };
    saveAccounts([...accounts(), account]);
    await entities.User.create({ id: account.id, email, role: account.role });
    return { requires_verification: true };
  },
  async verifyOtp({ email, otpCode }) {
    const allAccounts = accounts();
    const account = allAccounts.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (!account || otpCode !== account.otp) throw new Error("Invalid verification code");
    account.verified = true;
    saveAccounts(allAccounts);
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
    return { access_token: setSession(account) };
  },
  loginWithProvider(provider) {
    const email = `${provider}-user@local.shkj`;
    let account = accounts().find((item) => item.email === email);
    if (!account) {
      account = { id: id(), email, password: null, role: "Viewer", verified: true, created_date: now() };
      saveAccounts([...accounts(), account]);
      entities.User.create({ id: account.id, email, role: account.role });
    }
    setSession(account);
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
    }
  },
  async resetPassword({ resetToken, newPassword }) {
    const allAccounts = accounts();
    const account = allAccounts.find((item) => item.resetToken === resetToken);
    if (!account) throw new Error("Invalid reset link");
    account.password = newPassword;
    delete account.resetToken;
    saveAccounts(allAccounts);
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

export const appClient = {
  entities,
  auth,
  users: {
    async inviteUser(email, systemRole) {
      if (accounts().some((account) => account.email.toLowerCase() === email.toLowerCase())) throw new Error("User already exists");
      const account = { id: id(), email, password: "welcome", role: systemRole === "admin" ? "Super Admin" : "User Department", verified: true, created_date: now() };
      saveAccounts([...accounts(), account]);
      return entities.User.create({ id: account.id, email, role: account.role });
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

// Temporary compatibility alias for existing feature modules during migration.
export const base44 = appClient;
