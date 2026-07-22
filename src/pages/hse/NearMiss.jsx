import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { AlertCircle } from "lucide-react";

export default function NearMiss() {
  return (
    <CrudModule
      title="Near Miss"
      subtitle="HSE near miss reporting and tracking"
      icon={AlertCircle}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listNearMisses(pid)}
      createMethod={(data) => appClient.hse.createNearMiss(data)}
      updateMethod={(id, changes) => appClient.hse.updateNearMiss(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteNearMiss(id)}
      columns={[
        { field: "reported_date", label: "Date" },
        { field: "reported_by", label: "Reported By" },
        { field: "location", label: "Location" },
        { field: "incident_type", label: "Type" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "reported_date", label: "Reported Date", type: "date", required: true },
        { name: "reported_by", label: "Reported By", required: true },
        { name: "location", label: "Location", required: true },
        { name: "incident_type", label: "Incident Type", type: "text" },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
        { name: "corrective_action", label: "Corrective Action", type: "textarea", fullWidth: true },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "Medium", reported_date: new Date().toISOString().split("T")[0] }}
    />
  );
}