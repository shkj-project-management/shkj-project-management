import React from "react";
import CrudPage from "@/components/CrudPage";
import { AlertCircle } from "lucide-react";

export default function Issues() {
  return (
    <CrudPage
      entityName="IssueLog"
      title="Issue Log"
      subtitle="Track and resolve issues across projects"
      icon={AlertCircle}
      searchKeys={["title", "severity", "status", "category", "assignee", "project"]}
      columns={[
        { key: "title", label: "Title" },
        { key: "severity", label: "Severity" },
        { key: "category", label: "Category" },
        { key: "assignee", label: "Assignee" },
        { key: "date_reported", label: "Reported" },
        { key: "status", label: "Status" },
      ]}
      defaultForm={{
        title: "", description: "", severity: "Medium", status: "Open",
        category: "Other", assignee: "", project: "",
        date_reported: "", date_resolved: "", location: "",
      }}
      formFields={[
        { name: "title", label: "Title", required: true, placeholder: "Equipment malfunction" },
        { name: "severity", label: "Severity", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "category", label: "Category", type: "select", options: ["Safety", "Quality", "Technical", "Administrative", "Resource", "Other"] },
        { name: "status", label: "Status", type: "select", options: ["Open", "In Progress", "Resolved", "Closed"] },
        { name: "assignee", label: "Assignee", placeholder: "John Doe" },
        { name: "project", label: "Project", placeholder: "PRJ-001" },
        { name: "location", label: "Location" },
        { name: "date_reported", label: "Date Reported", type: "date" },
        { name: "date_resolved", label: "Date Resolved", type: "date" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}