import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { AlertTriangle } from "lucide-react";

export default function UnsafeAction() {
  return (
    <CrudModule
      title="Unsafe Action"
      subtitle="HSE unsafe action reporting and tracking"
      icon={AlertTriangle}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listUnsafeActions(pid)}
      createMethod={(data) => appClient.hse.createUnsafeAction(data)}
      updateMethod={(id, changes) => appClient.hse.updateUnsafeAction(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteUnsafeAction(id)}
      columns={[
        { field: "reported_date", label: "Date" },
        { field: "reported_by", label: "Reported By" },
        { field: "location", label: "Location" },
        { field: "action_taken", label: "Action Taken" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "reported_date", label: "Reported Date", type: "date", required: true },
        { name: "reported_by", label: "Reported By", required: true },
        { name: "location", label: "Location", required: true },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
        { name: "action_taken", label: "Action Taken", type: "textarea", fullWidth: true },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "High", reported_date: new Date().toISOString().split("T")[0] }}
    />
  );
}