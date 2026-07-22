import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Activity } from "lucide-react";

export default function Environmental() {
  return (
    <CrudModule
      title="Environmental Monitoring"
      subtitle="IPCN environmental monitoring and tracking"
      icon={Activity}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listEnvironmentalMonitoring(pid)}
      createMethod={(data) => appClient.ipcn.createEnvironmentalMonitoring(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateEnvironmentalMonitoring(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteEnvironmentalMonitoring(id)}
      columns={[
        { field: "monitoring_date", label: "Date" },
        { field: "parameter", label: "Parameter" },
        { field: "location", label: "Location" },
        { field: "result", label: "Result" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "monitoring_date", label: "Monitoring Date", type: "date", required: true },
        { name: "parameter", label: "Parameter", required: true },
        { name: "location", label: "Location", required: true },
        { name: "result", label: "Result", type: "textarea", fullWidth: true },
        { name: "standard_range", label: "Standard Range" },
        { name: "compliant", label: "Compliant", type: "select", options: ["Yes", "No"] },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
      ]}
      defaultForm={{ compliant: "Yes", monitoring_date: new Date().toISOString().split("T")[0] }}
    />
  );
}