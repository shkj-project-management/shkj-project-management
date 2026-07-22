import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Shield } from "lucide-react";

export default function PPEChecklist() {
  return (
    <CrudModule
      title="PPE Checklist"
      subtitle="Personal Protective Equipment compliance checklist"
      icon={Shield}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listPPEChecklists(pid)}
      createMethod={(data) => appClient.hse.createPPEChecklist(data)}
      updateMethod={(id, changes) => appClient.hse.updatePPEChecklist(id, changes)}
      deleteMethod={(id) => appClient.hse.deletePPEChecklist(id)}
      columns={[
        { field: "check_date", label: "Check Date" },
        { field: "worker_name", label: "Worker" },
        { field: "ppe_type", label: "PPE Type" },
        { field: "compliant", label: "Compliant" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "check_date", label: "Check Date", type: "date", required: true },
        { name: "worker_name", label: "Worker Name", required: true },
        { name: "ppe_type", label: "PPE Type", type: "select", options: ["Helmet", "Safety Glasses", "Gloves", "Safety Shoes", "Harness", "Respirator", "Ear Protection", "Full Body"] },
        { name: "compliant", label: "Compliant", type: "select", options: ["Yes", "No", "N/A"] },
        { name: "notes", label: "Notes", type: "textarea", fullWidth: true },
        { name: "status", label: "Status", type: "select", options: ["Pass", "Fail", "Pending"] },
      ]}
      defaultForm={{ status: "Pending", compliant: "Yes", check_date: new Date().toISOString().split("T")[0] }}
    />
  );
}