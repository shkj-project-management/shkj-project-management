import React from "react";
import { cn } from "@/lib/utils";

export default function GlassCard({ children, className, hover = true }) {
  return (
    <div
      className={cn(
        "glass-card p-5 rounded-xl",
        hover && "hover:neon-glow",
        className
      )}
    >
      {children}
    </div>
  );
}