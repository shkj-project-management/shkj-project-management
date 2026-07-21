import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { ClipboardCheck } from "lucide-react";

export default function SafetyInspection() {
  return (
    <CrudModule
      title="Safety Inspection"
      subtitle="HSE safety inspections and findings tracking"
      icon={ClipboardCheck}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listSafetyInspections(pid)}
      createMethod={(data) => appClient.hse.createSafetyInspection(data)}
      updateMethod={(id, changes) => appClient.hse.updateSafetyInspection(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteSafetyInspection(id)}
      columns={[
        { field: "inspection_date", label: "Date" },
        { field: "area", label: "Area" },
        { field: "inspector", label: "Inspector" },
        { field: "findings", label: "Findings" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "inspection_date", label: "Inspection Date", type: "date", required: true },
        { name: "area", label: "Area", required: true },
        { name: "inspector", label: "Inspector", required: true },
        { name: "findings", label: "Findings", type: "textarea", fullWidth: true },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
      ]}
      defaultForm={{ status: "Open", priority: "Medium", inspection_date: new Date().toISOString().split("T")[0] }}
    />
  );
}