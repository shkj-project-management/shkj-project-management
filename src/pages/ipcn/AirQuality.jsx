import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Wind } from "lucide-react";

export default function AirQuality() {
  return (
    <CrudModule
      title="Air Quality Inspection"
      subtitle="IPCN air quality monitoring and inspection"
      icon={Wind}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listAirQualityInspections(pid)}
      createMethod={(data) => appClient.ipcn.createAirQualityInspection(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateAirQualityInspection(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteAirQualityInspection(id)}
      columns={[
        { field: "inspection_date", label: "Date" },
        { field: "location", label: "Location" },
        { field: "pm25", label: "PM2.5" },
        { field: "pm10", label: "PM10" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "inspection_date", label: "Inspection Date", type: "date", required: true },
        { name: "location", label: "Location", required: true },
        { name: "pm25", label: "PM2.5 (µg/m³)", type: "number" },
        { name: "pm10", label: "PM10 (µg/m³)", type: "number" },
        { name: "temperature", label: "Temperature (°C)", type: "number" },
        { name: "humidity", label: "Humidity (%)", type: "number" },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
        { name: "compliant", label: "Compliant", type: "select", options: ["Yes", "No"] },
      ]}
      defaultForm={{ compliant: "Yes", inspection_date: new Date().toISOString().split("T")[0] }}
    />
  );
}