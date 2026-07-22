import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { CheckSquare } from "lucide-react";

export default function ActionPlan() {
  return (
    <CrudModule
      title="Action Plan"
      subtitle="Action plan tracking and management"
      icon={CheckSquare}
      projectFilter={true}
      listMethod={(pid) => appClient.actionPlan.list(pid)}
      createMethod={(data) => appClient.actionPlan.create(data)}
      updateMethod={(id, changes) => appClient.actionPlan.update(id, changes)}
      deleteMethod={(id) => appClient.actionPlan.delete(id)}
      columns={[
        { field: "plan_number", label: "Plan #" },
        { field: "description", label: "Description" },
        { field: "source", label: "Source" },
        { field: "priority", label: "Priority" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "description", label: "Description", type: "textarea", fullWidth: true, required: true },
        { name: "category", label: "Category", type: "select", options: ["HSE", "IPCN", "Quality", "General", "Safety"] },
        { name: "source", label: "Source" },
        { name: "source_type", label: "Source Type" },
        { name: "root_cause", label: "Root Cause", type: "textarea", fullWidth: true },
        { name: "corrective_action", label: "Corrective Action", type: "textarea", fullWidth: true },
        { name: "preventive_action", label: "Preventive Action", type: "textarea", fullWidth: true },
        { name: "pic", label: "Person In Charge" },
        { name: "due_date", label: "Due Date", type: "date" },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Completed", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "Medium", category: "General" }}
    />
  );
}