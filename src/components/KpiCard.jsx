import React from "react";
import { cn } from "@/lib/utils";

export default function KpiCard({ icon: Icon, label, value, trend, trendLabel, color = "primary", className }) {
  const colorMap = {
    primary: "text-primary bg-primary/10",
    green: "text-green-400 bg-green-400/10",
    orange: "text-orange-400 bg-orange-400/10",
    purple: "text-purple-400 bg-purple-400/10",
  };

  const trendColor = trend >= 0 ? "text-green-400" : "text-red-400";

  return (
    <div className={cn("glass-card p-5 rounded-xl animate-slide-up", className)}>
      <div className="flex items-start justify-between mb-3">
        <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center", colorMap[color])}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
            <span>{trend >= 0 ? "↑" : "↓"}</span>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
      {trendLabel && (
        <p className="text-[11px] text-muted-foreground/70 mt-2">{trendLabel}</p>
      )}
    </div>
  );
}