import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Shield } from "lucide-react";

export default function PreventiveAction() {
  return (
    <CrudModule
      title="Preventive Action"
      subtitle="HSE preventive action planning and tracking"
      icon={Shield}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listPreventiveActions(pid)}
      createMethod={(data) => appClient.hse.createPreventiveAction(data)}
      updateMethod={(id, changes) => appClient.hse.updatePreventiveAction(id, changes)}
      deleteMethod={(id) => appClient.hse.deletePreventiveAction(id)}
      columns={[
        { field: "created_date", label: "Date" },
        { field: "risk_source", label: "Risk Source" },
        { field: "description", label: "Description" },
        { field: "assigned_to", label: "Assigned To" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "risk_source", label: "Risk Source", required: true },
        { name: "description", label: "Description", type: "textarea", fullWidth: true, required: true },
        { name: "mitigation_plan", label: "Mitigation Plan", type: "textarea", fullWidth: true },
        { name: "assigned_to", label: "Assigned To" },
        { name: "due_date", label: "Due Date", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Completed", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "Medium" }}
    />
  );
}