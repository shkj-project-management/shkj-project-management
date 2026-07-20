import React from "react";
import CrudPage from "@/components/CrudPage";
import { appClient } from "@/api/appClient";
import { toast } from "sonner";
import { Database } from "lucide-react";

async function sendScheduleNotification(formData, isEdit) {
  if (!formData.start_date && !formData.end_date) return;
  try {
    const users = await appClient.entities.User.list();
    const subject = isEdit
      ? `[Update Jadwal] ${formData.name} — ${formData.code}`
      : `[Proyek Baru] ${formData.name} — ${formData.code}`;
    const body = `
      <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9; border-bottom: 2px solid #0ea5e9; padding-bottom: 10px;">
          ${isEdit ? "Jadwal Proyek Diperbarui" : "Proyek Baru Dibuat"}
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <tr><td style="padding: 8px; font-weight: bold; width: 180px;">Nama Proyek</td><td style="padding: 8px;">${formData.name}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Nomor Proyek</td><td style="padding: 8px;">${formData.code}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Tanggal Mulai</td><td style="padding: 8px;">${formData.start_date || "-"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Tanggal Selesai</td><td style="padding: 8px;">${formData.end_date || "-"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Durasi</td><td style="padding: 8px;">${formData.durasi_hari || 0} hari kalender</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Lokasi</td><td style="padding: 8px;">${formData.location || "-"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Project Manager</td><td style="padding: 8px;">${formData.manager || "-"}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Kontraktor</td><td style="padding: 8px;">${formData.kontraktor || "-"}</td></tr>
        </table>
        <p style="margin-top: 20px; color: #64748b;">Mohon pastikan kesiapan tim sesuai jadwal di atas. Terima kasih.</p>
      </div>
    `;

    let sent = 0;
    for (const user of users) {
      if (user.email) {
        try {
          await appClient.integrations.Core.SendEmail({
            to: user.email,
            subject,
            body,
            from_name: "SHKJ Project Management",
          });
          sent++;
        } catch {}
      }
    }
    if (sent > 0) {
      toast.success(`Notifikasi jadwal terkirim ke ${sent} anggota tim`);
    }
  } catch {
    toast.error("Gagal mengirim notifikasi jadwal");
  }
}

export default function InputDataProject() {
  return (
    <CrudPage
      entityName="Project"
      title="Input Data Project"
      subtitle="Pendaftaran proyek konstruksi rumah sakit dengan informasi lengkap"
      icon={Database}
      searchKeys={["name", "code", "owner", "kontraktor", "manager", "location", "status"]}
      columns={[
        { key: "name", label: "Nama Proyek" },
        { key: "code", label: "No. Proyek" },
        { key: "location", label: "Lokasi" },
        { key: "owner", label: "Owner" },
        { key: "manager", label: "PM" },
        { key: "budget", label: "Nilai Kontrak" },
        { key: "status", label: "Status" },
      ]}
      defaultForm={{
        name: "", code: "", status: "Planning", start_date: "", end_date: "",
        durasi_hari: 0, budget: 0, spent: 0, progress: 0,
        jenis_proyek: "Renovasi", location: "", owner: "", konsultan_mk: "",
        kontraktor: "", manager: "", project_officer: "",
        priority: "Medium", description: "",
      }}
      formFields={[
        { name: "name", label: "Nama Proyek", required: true, placeholder: "Renovasi Gedung RS" },
        { name: "code", label: "Nomor Proyek", required: true, placeholder: "PRJ-2026-001" },
        { name: "jenis_proyek", label: "Jenis Proyek", type: "select", options: ["Renovasi", "Baru", "Addendum", "Maintenance"] },
        { name: "status", label: "Status", type: "select", options: ["Planning", "Active", "On Hold", "Completed", "Cancelled"] },
        { name: "owner", label: "Owner", placeholder: "PT Rumah Sakit Sehat" },
        { name: "konsultan_mk", label: "Konsultan MK", placeholder: "CV Konsultan Manajemen Konstruksi" },
        { name: "kontraktor", label: "Kontraktor", placeholder: "PT Kontraktor Utama" },
        { name: "manager", label: "Project Manager", placeholder: "Nama PM" },
        { name: "project_officer", label: "Project Officer", placeholder: "Nama PO" },
        { name: "location", label: "Lokasi", placeholder: "Jl. Sudirman No. 1, Jakarta" },
        { name: "start_date", label: "Tanggal Mulai", type: "date" },
        { name: "end_date", label: "Tanggal Selesai", type: "date" },
        { name: "durasi_hari", label: "Durasi (Hari Kalender)", type: "number" },
        { name: "budget", label: "Nilai Kontrak (Rp)", type: "number" },
        { name: "priority", label: "Prioritas", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "description", label: "Deskripsi", type: "textarea" },
      ]}
      onAfterSave={sendScheduleNotification}
    />
  );
}
