import React from "react";
import CrudModule from "@/components/CrudModule";
import { appClient } from "@/api/appClient";
import { ShieldCheck } from "lucide-react";

export default function SafetyMeeting() {
  return (
    <CrudModule
      title="Safety Meeting"
      subtitle="HSE safety committee meeting records"
      icon={ShieldCheck}
      projectFilter={true}
      listMethod={(pid) => appClient.hse.listSafetyMeetings(pid)}
      createMethod={(data) => appClient.hse.createSafetyMeeting(data)}
      updateMethod={(id, changes) => appClient.hse.updateSafetyMeeting(id, changes)}
      deleteMethod={(id) => appClient.hse.deleteSafetyMeeting(id)}
      columns={[
        { field: "meeting_date", label: "Date" },
        { field: "meeting_type", label: "Type" },
        { field: "chairperson", label: "Chairperson" },
        { field: "attendees", label: "Attendees" },
        { field: "status", label: "Status" },
      ]}
      formFields={[
        { name: "meeting_date", label: "Meeting Date", type: "date", required: true },
        { name: "meeting_type", label: "Meeting Type", required: true },
        { name: "chairperson", label: "Chairperson", required: true },
        { name: "attendees", label: "Attendees", fullWidth: true },
        { name: "agenda", label: "Agenda", type: "textarea", fullWidth: true },
        { name: "minutes", label: "Minutes", type: "textarea", fullWidth: true },
        { name: "action_items", label: "Action Items", type: "textarea", fullWidth: true },
        { name: "status", label: "Status", type: "select", options: ["Scheduled", "Completed", "Cancelled"] },
      ]}
      defaultForm={{ status: "Scheduled", meeting_date: new Date().toISOString().split("T")[0] }}
    />
  );
}