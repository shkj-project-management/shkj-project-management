import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { Presentation, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";

const REPORT_TYPES = [
  { value: "daily", label: "Daily Report" },
  { value: "weekly", label: "Weekly Report" },
  { value: "monthly", label: "Monthly Report" },
  { value: "executive", label: "Executive Report" },
  { value: "project", label: "Project Report" },
  { value: "progress", label: "Progress Report" },
  { value: "boq", label: "BOQ Report" },
  { value: "vendor", label: "Vendor Report" },
  { value: "safety", label: "Safety Report" },
  { value: "ipcn", label: "IPCN Report" },
  { value: "action_plan", label: "Action Plan Report" },
  { value: "photo", label: "Photo Progress Report" },
];

const REPORT_GENERATORS = {
  daily: (pid) => appClient.reports.generateDailyReport(pid),
  weekly: (pid) => appClient.reports.generateWeeklyReport(pid),
  monthly: (pid) => appClient.reports.generateMonthlyReport(pid),
  executive: (pid) => appClient.reports.generateExecutiveReport(pid),
  project: (pid) => appClient.reports.generateProjectReport(pid),
  progress: (pid) => appClient.reports.generateProgressReport(pid),
  boq: (pid) => appClient.reports.generateBOQReport(pid),
  vendor: (pid) => appClient.reports.generateVendorReport(pid),
  safety: (pid) => appClient.reports.generateHSEReport(pid),
  ipcn: (pid) => appClient.reports.generateIPCNReport(pid),
  action_plan: (pid) => appClient.reports.generateActionPlanReport(pid),
  photo: (pid) => appClient.reports.generatePhotoProgressReport(pid),
};

export default function PowerPointExport() {
  const [reportType, setReportType] = useState("");
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleExport = async () => {
    if (!projectId || !reportType) {
      toast.error("Select project and report type");
      return;
    }
    setLoading(true);
    try {
      const generator = REPORT_GENERATORS[reportType];
      const reportData = await generator(projectId);
      reportData.project_id = projectId;
      const pptResult = await appClient.export.toPowerPoint(reportData);
      setResult(pptResult);
      toast.success("PowerPoint exported successfully");
    } catch (e) {
      toast.error(e.message || "Failed to export PowerPoint");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="PowerPoint Export" subtitle="Export reports to PowerPoint format" icon={Presentation} />
      <GlassCard className="p-6">
        <div className="space-y-4 max-w-lg">
          <div>
            <Label className="mb-1.5 block text-sm">Project ID</Label>
            <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Enter project ID" />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Report Type</Label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
              <SelectContent>
                {REPORT_TYPES.map((rt) => (
                  <SelectItem key={rt.value} value={rt.value}>{rt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleExport} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Download className="w-4 h-4 mr-2" />
            Export PowerPoint
          </Button>
        </div>
        {result && (
          <div className="mt-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
            <p className="text-sm text-green-400">PowerPoint exported successfully (Job ID: {result.job_id})</p>
          </div>
        )}
      </GlassCard>
    </div>
  );
}