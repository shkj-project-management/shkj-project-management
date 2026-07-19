import React from "react";
import CrudPage from "@/components/CrudPage";
import { FolderKanban } from "lucide-react";

export default function Projects() {
  return (
    <CrudPage
      entityName="Project"
      title="Project Master"
      subtitle="Manage all projects with budget and progress tracking"
      icon={FolderKanban}
      searchKeys={["name", "code", "status", "manager", "location", "priority"]}
      columns={[
        { key: "name", label: "Project" },
        { key: "code", label: "Code" },
        { key: "status", label: "Status" },
        { key: "priority", label: "Priority" },
        { key: "progress", label: "Progress" },
        { key: "budget", label: "Budget" },
      ]}
      defaultForm={{
        name: "", code: "", status: "Planning", start_date: "", end_date: "",
        budget: 0, spent: 0, progress: 0, location: "", manager: "",
        priority: "Medium", description: "",
      }}
      formFields={[
        { name: "name", label: "Project Name", required: true, placeholder: "Clinic Wing A" },
        { name: "code", label: "Project Code", required: true, placeholder: "PRJ-001" },
        { name: "status", label: "Status", type: "select", options: ["Planning", "Active", "On Hold", "Completed", "Cancelled"] },
        { name: "priority", label: "Priority", type: "select", options: ["Low", "Medium", "High", "Critical"] },
        { name: "manager", label: "Project Manager", placeholder: "John Doe" },
        { name: "location", label: "Location", placeholder: "Building A, Floor 3" },
        { name: "start_date", label: "Start Date", type: "date" },
        { name: "end_date", label: "End Date", type: "date" },
        { name: "budget", label: "Budget", type: "number" },
        { name: "spent", label: "Spent", type: "number" },
        { name: "progress", label: "Progress (%)", type: "number" },
        { name: "description", label: "Description", type: "textarea" },
      ]}
    />
  );
}