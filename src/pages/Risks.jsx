import React from "react";
import CrudPage from "@/components/CrudPage";
import { ShieldAlert } from "lucide-react";

export default function Risks() {
  return (
    <CrudPage
      entityName="RiskRegister"
      title="Risk Register"
      subtitle="Identify, assess, and mitigate project risks"
      icon={ShieldAlert}
      searchKeys={["title", "category", "risk_level", "probability", "impact", "owner", "status"]}
      columns={[
        { key: "title", label: "Risk" },
        { key: "category", label: "Category" },
        { key: "probability", label: "Probability" },
        { key: "impact", label: "Impact" },
        { key: "risk_level", label: "Level" },
        { key: "status", label: "Status" },
      ]}
      defaultForm={{
        title: "", description: "", category: "Other", probability: "Medium",
        impact: "Medium", risk_level: "Medium", mitigation: "",
        owner: "", status: "Identified", date_identified: "",
      }}
      formFields={[
        { name: "title", label: "Risk Title", required: true, placeholder: "Budget overrun" },
        { name: "category", label: "Category", type: "select", options: ["Financial", "Operational", "Clinical", "Compliance", "Strategic", "Technical", "Other"] },
        { name: "probability", label: "Probability", type: "select", options: ["Low", "Medium", "High"] },
        { name: "impact", label: "Impact", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "risk_level", label: "Risk Level", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "status", label: "Status", type: "select", options: ["Identified", "Assessed", "Mitigating", "Monitoring", "Closed"] },
        { name: "owner", label: "Risk Owner", placeholder: "John Doe" },
        { name: "date_identified", label: "Date Identified", type: "date" },
        { name: "description", label: "Description", type: "textarea" },
        { name: "mitigation", label: "Mitigation Plan", type: "textarea" },
      ]}
    />
  );
}