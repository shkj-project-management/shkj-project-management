import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Eye } from "lucide-react";

export default function SafetyObservation() {
  return (
    <CrudModule
      title="Safety Observation"
      subtitle="HSE safety observations and tracking"
      icon={Eye}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listSafetyObservations(pid)}
      createMethod={(data) => appClient.hse.createSafetyObservation(data)}
      updateMethod={(id, changes) => appClient.hse.updateSafetyObservation(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteSafetyObservation(id)}
      columns={[
        { field: "observation_date", label: "Date" },
        { field: "observer", label: "Observer" },
        { field: "location", label: "Location" },
        { field: "observation_type", label: "Type" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "observation_date", label: "Observation Date", type: "date", required: true },
        { name: "observer", label: "Observer", required: true },
        { name: "location", label: "Location", required: true },
        { name: "observation_type", label: "Type", type: "select", options: ["Positive", "Negative", "At-Risk"] },
        { name: "description", label: "Description", type: "textarea", fullWidth: true },
        { name: "requires_action", label: "Requires Action", type: "select", options: ["Yes", "No"] },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Closed"] },
      ]}
      defaultForm={{ status: "Open", priority: "Medium", observation_date: new Date().toISOString().split("T")[0], requires_action: "No" }}
    />
  );
}