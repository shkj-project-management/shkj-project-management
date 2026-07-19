// Google Apps Script REST API Client
// Set API_BASE to your /exec URL when ready. Until then, the app uses Base44 entities directly.

// const API_BASE = "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec";
const API_BASE = null;

export const GAS_ENABLED = !!API_BASE;

/**
 * Call the Google Apps Script API.
 * @param {string} action - "list" | "create" | "update" | "delete"
 * @param {string} table - "Patients" | "Appointments" | "MedicalRecords" | "Doctors"
 * @param {object} data - payload (record data or filter)
 */
export async function gasRequest(action, table, data = {}) {
  if (!API_BASE) {
    throw new Error("API_BASE not configured. Using local database.");
  }

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, table, ...data }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Table name mapping for when GAS is enabled
export const TABLE_MAP = {
  Patient: "Patients",
  Appointment: "Appointments",
  MedicalRecord: "MedicalRecords",
  Doctor: "Doctors",
};