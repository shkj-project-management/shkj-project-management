import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Droplets } from "lucide-react";

export default function WaterQuality() {
  return (
    <CrudModule
      title="Water Quality Inspection"
      subtitle="IPCN water quality monitoring and inspection"
      icon={Droplets}
      projectFilter={true}
      listMethod={(pid) => appClient.ipcn.listWaterQualityInspections(pid)}
      createMethod={(data) => appClient.ipcn.createWaterQualityInspection(data)}
      updateMethod={(id, changes) => appClient.ipcn.updateWaterQualityInspection(id, changes)}
      deleteMethod={(id) => appClient.ipcn.deleteWaterQualityInspection(id)}
      columns={[
        { field: "inspection_date", label: "Date" },
        { field: "location", label: "Location" },
        { field: "ph_level", label: "pH Level" },
        { field: "turbidity", label: "Turbidity" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "inspection_date", label: "Inspection Date", type: "date", required: true },
        { name: "location", label: "Location", required: true },
        { name: "ph_level", label: "pH Level", type: "number" },
        { name: "turbidity", label: "Turbidity (NTU)", type: "number" },
        { name: "chlorine", label: "Chlorine (mg/L)", type: "number" },
        { name: "coliform", label: "Coliform (CFU/100mL)", type: "number" },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
        { name: "compliant", label: "Compliant", type: "select", options: ["Yes", "No"] },
      ]}
      defaultForm={{ compliant: "Yes", inspection_date: new Date().toISOString().split("T")[0] }}
    />
  );
}