import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { ShieldCheck } from "lucide-react";

export default function IsolationAudit() {
  return (
    <CrudModule
      title="Isolation Audit"
      subtitle="IPCN isolation precautions audit tracking"
      icon={ShieldCheck}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listIsolationAudits(pid)}
      createMethod={(data) => appClient.ipcn.createIsolationAudit(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateIsolationAudit(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteIsolationAudit(id)}
      columns={[
        { field: "audit_date", label: "Date" },
        { field: "unit", label: "Unit" },
        { field: "auditor", label: "Auditor" },
        { field: "compliance_score", label: "Compliance" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "audit_date", label: "Audit Date", type: "date", required: true },
        { name: "unit", label: "Unit/Department", required: true },
        { name: "auditor", label: "Auditor", required: true },
        { name: "compliance_score", label: "Compliance Score (%)", type: "number" },
        { name: "findings", label: "Findings", type: "textarea", fullWidth: true },
        { name: "recommendations", label: "Recommendations", type: "textarea", fullWidth: true },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]}
      defaultForm={{ status: "Open", audit_date: new Date().toISOString().split("T")[0] }}
    />
  );
}