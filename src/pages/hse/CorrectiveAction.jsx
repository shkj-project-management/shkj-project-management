import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { CheckSquare } from "lucide-react";

export default function CorrectiveAction() {
  return (
    <CrudModule
      title="Corrective Action"
      subtitle="HSE corrective action tracking and management"
      icon={CheckSquare}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listCorrectiveActions(pid)}
      createMethod={(data) => appClient.hse.createCorrectiveAction(data)}
      updateMethod={(id, changes) => appClient.hse.updateCorrectiveAction(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteCorrectiveAction(id)}
      columns={[
        { field: "created_date", label: "Date" },
        { field: "finding_source", label: "Source" },
        { field: "description", label: "Description" },
        { field: "assigned_to", label: "Assigned To" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "finding_source", label: "Finding Source", required: true },
        { name: "description", label: "Description", type: "textarea", fullWidth: true, required: true },
        { name: "root_cause", label: "Root Cause", type: "textarea", fullWidth: true },
        { name: "action_plan", label: "Action Plan", type: "textarea", fullWidth: true },
        { name: "assigned_to", label: "Assigned To" },
        { name: "due_date", label: "Due Date", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Completed", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "Medium" }}
    />
  );
}