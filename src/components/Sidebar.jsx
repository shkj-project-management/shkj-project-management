import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { resolveRole, getNavItems } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Activity } from "lucide-react";

import {
  LayoutDashboard, Users, Calendar, FileText, CreditCard,
  Database, FolderKanban, Layers, Truck, HardHat, Package,
  Wrench, List, Calculator, CalendarClock, BarChart3, TrendingUp,
  DollarSign, ShieldCheck, ClipboardCheck, AlertCircle, ShieldAlert,
  CheckSquare, FolderOpen, Camera, CheckCircle, PenTool, History,
  MessageCircle, Mail, Table, Presentation, Circle, Settings, Shield,
  Bell, Eye,
} from "lucide-react";

const ICON_MAP = {
  LayoutDashboard, Users, Calendar, FileText, CreditCard,
  Database, FolderKanban, Layers, Truck, HardHat, Package,
  Wrench, List, Calculator, CalendarClock, BarChart3, TrendingUp,
  Activity, DollarSign, ShieldCheck, ClipboardCheck, AlertCircle,
  ShieldAlert, CheckSquare, FolderOpen, Camera, CheckCircle, PenTool,
  History, MessageCircle, Mail, Table, Presentation, Settings, Shield,
  Bell, Eye, AlertTriangle: AlertCircle, Wind: Activity, Droplets: Activity,
  Hand: Users, Thermometer: Activity,
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const role = resolveRole(user?.role);
  const navGroups = getNavItems(role);

  return (
    <aside
      className={cn(
        "fixed top-0 left-0 z-50 h-full w-64 bg-sidebar border-r border-sidebar-border transition-transform duration-300 lg:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-sidebar-border shrink-0">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center neon-glow">
            <Activity className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-foreground truncate">SHKJ</p>
            <p className="text-[10px] text-muted-foreground truncate">Project Management</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = ICON_MAP[item.icon] || Circle;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                          isActive
                            ? "bg-primary/10 text-primary font-medium border border-primary/20"
                            : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 border border-transparent"
                        )
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Role badge */}
        <div className="p-4 border-t border-sidebar-border shrink-0">
          <div className="glass-card p-3 rounded-xl">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Access Level</p>
            <p className="text-sm font-semibold text-foreground">{role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}