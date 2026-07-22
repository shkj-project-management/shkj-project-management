import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Thermometer } from "lucide-react";

export default function Sterilization() {
  return (
    <CrudModule
      title="Sterilization Monitoring"
      subtitle="IPCN sterilization process monitoring"
      icon={Thermometer}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listSterilizationMonitoring(pid)}
      createMethod={(data) => appClient.ipcn.createSterilizationMonitoring(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateSterilizationMonitoring(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteSterilizationMonitoring(id)}
      columns={[
        { field: "monitoring_date", label: "Date" },
        { field: "equipment", label: "Equipment" },
        { field: "method", label: "Method" },
        { field: "result", label: "Result" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "monitoring_date", label: "Monitoring Date", type: "date", required: true },
        { name: "equipment", label: "Equipment", required: true },
        { name: "method", label: "Method", type: "select", options: ["Autoclave", "Chemical", "Dry Heat", "EO Gas", "Plasma", "UV"] },
        { name: "result", label: "Result", type: "select", options: ["Pass", "Fail", "Pending"] },
        { name: "temperature", label: "Temperature (°C)", type: "number" },
        { name: "pressure", label: "Pressure (psi)", type: "number" },
        { name: "cycle_time", label: "Cycle Time (min)", type: "number" },
        { name: "operator", label: "Operator" },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
      ]}
      defaultForm={{ status: "Pending", result: "Pending", monitoring_date: new Date().toISOString().split("T")[0] }}
    />
  );
}