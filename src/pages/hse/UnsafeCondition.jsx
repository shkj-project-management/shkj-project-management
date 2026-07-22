import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { ShieldAlert } from "lucide-react";

export default function UnsafeCondition() {
  return (
    <CrudModule
      title="Unsafe Condition"
      subtitle="HSE unsafe condition reporting and tracking"
      icon={ShieldAlert}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listUnsafeConditions(pid)}
      createMethod={(data) => appClient.hse.createUnsafeCondition(data)}
      updateMethod={(id, changes) => appClient.hse.updateUnsafeCondition(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteUnsafeCondition(id)}
      columns={[
        { field: "reported_date", label: "Date" },
        { field: "reported_by", label: "Reported By" },
        { field: "location", label: "Location" },
        { field: "condition_type", label: "Type" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "reported_date", label: "Reported Date", type: "date", required: true },
        { name: "reported_by", label: "Reported By", required: true },
        { name: "location", label: "Location", required: true },
        { name: "condition_type", label: "Condition Type", type: "text" },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "High", reported_date: new Date().toISOString().split("T")[0] }}
    />
  );
}