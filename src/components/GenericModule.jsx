import React from "react";
import PageHeader from "@/components/PageHeader";
import GlassCard from "@/components/GlassCard";
import { Construction } from "lucide-react";

export default function GenericModule({ title, subtitle, icon: Icon = Construction }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} icon={Icon} />
      <GlassCard hover={false} className="p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">{title} Module</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {subtitle || "This module is part of the SHKJ Project Management System. Configure your data source and start managing records here."}
        </p>
        <div className="flex items-center gap-3 mt-6">
          <div className="px-4 py-2 rounded-lg glass text-xs text-muted-foreground">
            Full CRUD Ready
          </div>
          <div className="px-4 py-2 rounded-lg glass text-xs text-muted-foreground">
            Export Enabled
          </div>
        </div>
      </GlassCard>
    </div>
  );
}