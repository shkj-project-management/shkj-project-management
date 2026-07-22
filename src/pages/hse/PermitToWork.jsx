import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { FileText } from "lucide-react";

export default function PermitToWork() {
  return (
    <CrudModule
      title="Permit to Work"
      subtitle="HSE work permit issuance and tracking"
      icon={FileText}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listPermitsToWork(pid)}
      createMethod={(data) => appClient.hse.createPermitToWork(data)}
      updateMethod={(id, changes) => appClient.hse.updatePermitToWork(id, changes)}
      deleteMethod={(id) => appClient.hse.deletePermitToWork(id)}
      columns={[
        { field: "issued_date", label: "Issued Date" },
        { field: "permit_type", label: "Permit Type" },
        { field: "location", label: "Location" },
        { field: "issued_to", label: "Issued To" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "issued_date", label: "Issued Date", type: "date", required: true },
        { name: "expiry_date", label: "Expiry Date", type: "date" },
        { name: "permit_type", label: "Permit Type", type: "select", options: ["Hot Work", "Cold Work", "Confined Space", "Working at Height", "Excavation", "Electrical", "Lifting", "Other"] },
        { name: "location", label: "Location", required: true },
        { name: "issued_to", label: "Issued To", required: true },
        { name: "scope_of_work", label: "Scope of Work", type: "textarea", fullWidth: true },
        { name: "hazard_assessment", label: "Hazard Assessment", type: "textarea", fullWidth: true },
        { name: "control_measures", label: "Control Measures", type: "textarea", fullWidth: true },
        { name: "status", label: "Status", type: "select", options: ["Active", "Expired", "Cancelled", "Completed"] },
      ]}
      defaultForm={{ status: "Active", issued_date: new Date().toISOString().split("T")[0] }}
    />
  );
}