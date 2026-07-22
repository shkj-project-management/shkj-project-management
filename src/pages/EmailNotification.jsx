import React, { useState, useEffect } from "react";
import { appClient } from "@/api/appClient";
import { Mail, Send, Loader2, Trash2, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";

export default function EmailNotification() {
  const [emailTo, setEmailTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [queue, setQueue] = useState([]);
  const [loadingQueue, setLoadingQueue] = useState(true);

  useEffect(() => {
    loadQueue();
  }, []);

  const loadQueue = async () => {
    setLoadingQueue(true);
    try {
      const data = await appClient.email.getQueue();
      setQueue(data || []);
    } catch (e) {
      // Silently fail
    } finally {
      setLoadingQueue(false);
    }
  };

  const handleSend = async () => {
    if (!emailTo || !subject) {
      toast.error("Email and subject are required");
      return;
    }
    setSending(true);
    try {
      const emails = emailTo.split(",").map((e) => e.trim());
      await appClient.email.send(emails, subject, body);
      toast.success("Email queued successfully");
      setEmailTo("");
      setSubject("");
      setBody("");
      loadQueue();
    } catch (e) {
      toast.error(e.message || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleProcessQueue = async () => {
    try {
      const result = await appClient.email.processQueue();
      toast.success(`${result.processed} emails processed`);
      loadQueue();
    } catch (e) {
      toast.error("Failed to process queue");
    }
  };

  const handleDelete = async (id) => {
    try {
      await appClient.email.delete(id);
      setQueue((prev) => prev.filter((item) => item.id !== id));
      toast.success("Email deleted");
    } catch (e) {
      toast.error("Failed to delete email");
    }
  };

  const statusBadge = (status) => {
    const colors = {
      queued: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      sent: "bg-green-500/20 text-green-300 border-green-500/30",
      failed: "bg-red-500/20 text-red-300 border-red-500/30",
    };
    return (
      <Badge className={`${colors[status] || "bg-slate-500/20 text-slate-300"} border text-xs`}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Email Notification" subtitle="Send emails and manage email queue" icon={Mail} />

      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Send Email</h3>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-sm">To (comma separated)</Label>
            <Input
              value={emailTo}
              onChange={(e) => setEmailTo(e.target.value)}
              placeholder="user@example.com, user2@example.com"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Email subject"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-sm">Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body content..."
              rows={5}
            />
          </div>
          <Button onClick={handleSend} disabled={sending}>
            {sending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            <Send className="w-4 h-4 mr-2" />
            Send Email
          </Button>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Email Queue</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadQueue}>
              <Clock className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleProcessQueue}>
              <CheckCircle className="w-4 h-4 mr-2" />
              Process Queue
            </Button>
          </div>
        </div>

        {loadingQueue ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No emails in queue</p>
          </div>
        ) : (
          <div className="space-y-2">
            {queue.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border border-slate-700/30">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-foreground truncate">{item.subject}</p>
                    {statusBadge(item.status)}
                  </div>
                  <p className="text-xs text-muted-foreground">To: {(item.to || []).join(", ")}</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">
                    {new Date(item.created_date).toLocaleString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8 text-red-400 hover:text-red-300 shrink-0"
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}