import React, { useState } from "react";
import { appClient } from "@/api/appClient";
import { FolderKanban, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";

export default function ProjectReport() {
  const [projectId, setProjectId] = useState("");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const generate = async () => {
    if (!projectId) { toast.error("Please select a project"); return; }
    setLoading(true);
    try {
      const data = await appClient.reports.generateProjectReport(projectId);
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
      <PageHeader title="Project Report" subtitle="Generate comprehensive project reports" icon={FolderKanban} />
      <GlassCard className="p-6">
        <div className="space-y-4 max-w-lg">
          <div>
            <Label className="mb-1.5 block text-sm">Project ID</Label>
            <Input value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="Enter project ID" />
          </div>
          <Button onClick={generate} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Download className="w-4 h-4 mr-2" />
            Generate Project Report
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