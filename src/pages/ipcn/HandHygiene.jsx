import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Hand } from "lucide-react";

export default function HandHygiene() {
  return (
    <CrudModule
      title="Hand Hygiene Audit"
      subtitle="IPCN hand hygiene compliance audits"
      icon={Hand}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listHandHygieneAudits(pid)}
      createMethod={(data) => appClient.ipcn.createHandHygieneAudit(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateHandHygieneAudit(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteHandHygieneAudit(id)}
      columns={[
        { field: "audit_date", label: "Date" },
        { field: "unit", label: "Unit" },
        { field: "auditor", label: "Auditor" },
        { field: "compliance_rate", label: "Compliance" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "audit_date", label: "Audit Date", type: "date", required: true },
        { name: "unit", label: "Unit/Department", required: true },
        { name: "auditor", label: "Auditor", required: true },
        { name: "compliance_rate", label: "Compliance Rate (%)", type: "number" },
        { name: "observed_opportunities", label: "Observed Opportunities", type: "number" },
        { name: "compliant_actions", label: "Compliant Actions", type: "number" },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
      ]}
      defaultForm={{ audit_date: new Date().toISOString().split("T")[0] }}
    />
  );
}