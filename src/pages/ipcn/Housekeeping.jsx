import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { ClipboardList } from "lucide-react";

export default function Housekeeping() {
  return (
    <CrudModule
      title="Housekeeping Audit"
      subtitle="IPCN housekeeping and cleanliness audits"
      icon={ClipboardList}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listHousekeepingAudits(pid)}
      createMethod={(data) => appClient.ipcn.createHousekeepingAudit(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateHousekeepingAudit(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteHousekeepingAudit(id)}
      columns={[
        { field: "audit_date", label: "Date" },
        { field: "area", label: "Area" },
        { field: "auditor", label: "Auditor" },
        { field: "score", label: "Score" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "audit_date", label: "Audit Date", type: "date", required: true },
        { name: "area", label: "Area", required: true },
        { name: "auditor", label: "Auditor", required: true },
        { name: "score", label: "Score", type: "number" },
        { name: "findings", label: "Findings", type: "textarea", fullWidth: true },
        { name: "recommendations", label: "Recommendations", type: "textarea", fullWidth: true },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]}
      defaultForm={{ status: "Open", audit_date: new Date().toISOString().split("T")[0] }}
    />
  );
}