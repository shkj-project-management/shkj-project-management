import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { AlertTriangle } from "lucide-react";

export default function IncidentReport() {
  return (
    <CrudModule
      title="Incident Report"
      subtitle="HSE incident reporting and investigation"
      icon={AlertTriangle}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listIncidentReports(pid)}
      createMethod={(data) => appClient.hse.createIncidentReport(data)}
      updateMethod={(id, changes) => appClient.hse.updateIncidentReport(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteIncidentReport(id)}
      columns={[
        { field: "incident_date", label: "Date" },
        { field: "incident_type", label: "Type" },
        { field: "location", label: "Location" },
        { field: "severity", label: "Severity" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "incident_date", label: "Incident Date", type: "date", required: true },
        { name: "incident_type", label: "Incident Type", required: true },
        { name: "location", label: "Location", required: true },
        { name: "severity", label: "Severity", type: "select", options: ["Minor", "Moderate", "Major", "Critical"] },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
        { name: "reported_by", label: "Reported By" },
        { name: "investigation", label: "Investigation Notes", type: "textarea", fullWidth: true },
        { name: "root_cause", label: "Root Cause", type: "textarea", fullWidth: true },
        { name: "corrective_action", label: "Corrective Action", type: "textarea", fullWidth: true },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "Under Investigation", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "Critical", severity: "Minor", incident_date: new Date().toISOString().split("T")[0] }}
    />
  );
}