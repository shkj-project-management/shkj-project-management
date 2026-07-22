import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { Users } from "lucide-react";

export default function ToolboxMeeting() {
  return (
    <CrudModule
      title="Toolbox Meeting"
      subtitle="Daily HSE toolbox meeting records"
      icon={Users}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listToolboxMeetings(pid)}
      createMethod={(data) => appClient.hse.createToolboxMeeting(data)}
      updateMethod={(id, changes) => appClient.hse.updateToolboxMeeting(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteToolboxMeeting(id)}
      columns={[
        { field: "meeting_date", label: "Date" },
        { field: "topic", label: "Topic" },
        { field: "facilitator", label: "Facilitator" },
        { field: "attendees", label: "Attendees" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "meeting_date", label: "Meeting Date", type: "date", required: true },
        { name: "topic", label: "Topic", required: true },
        { name: "facilitator", label: "Facilitator", required: true },
        { name: "attendees", label: "Attendees", fullWidth: true },
        { name: "discussion_points", label: "Discussion Points", type: "textarea", fullWidth: true },
        { name: "action_items", label: "Action Items", type: "textarea", fullWidth: true },
        { name: "status", label: "Status", type: "select", options: ["Completed", "Scheduled", "Cancelled"] },
      ]}
      defaultForm={{ status: "Completed", meeting_date: new Date().toISOString().split("T")[0] }}
    />
  );
}