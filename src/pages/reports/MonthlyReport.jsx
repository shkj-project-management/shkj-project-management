import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { FileText, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";

export default function MonthlyReport() {
  const [projectId, setProjectId] = useState("");
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generate = async () => {
    if (!projectId) { toast.error("Please select a project"); return; }
    setLoading(true);
    try {
      const data = await appClient.reports.generateMonthlyReport(projectId, month, year);
      setReport(data);
      toast.success("Report generated");
    } catch (e) {
      toast.error(e.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Monthly Report" subtitle="Generate monthly progress reports" icon={FileText} />
      <GlassCard className="p-6">
        <div className="space-y-4 max-w-lg">
          <div>
            <Label className="mb-1.5 block text-sm">Project ID</Label>
            <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Enter project ID" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm">Month</Label>
              <Input type="number" min={1} max={12} value={month} onChange={(e) => setMonth(Number(e.target.value))} />
            </div>
            <div className="flex-1">
              <Label className="mb-1.5 block text-sm">Year</Label>
              <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
            </div>
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Download className="w-4 h-4 mr-2" />
            Generate Monthly Report
          </Button>
        </div>
        {report && (
          <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700/50">
            <pre className="text-sm text-muted-foreground overflow-auto">{JSON.stringify(report, null, 2)}</pre>
          </div>
        )}
      </GlassCard>
    </div>
  );
}