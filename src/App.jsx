import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { lazy, Suspense } from "react";
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
// Add page imports here
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout';
import GenericModule from '@/components/GenericModule';
import { Navigate } from 'react-router-dom';
import {
  Database, Layers, HardHat, Package, Wrench, List, Calculator,
  CalendarClock, BarChart3, TrendingUp, Activity, DollarSign,
  ShieldCheck, ClipboardCheck, CheckSquare, FolderOpen, Camera,
  CheckCircle, PenTool, History, MessageCircle, Mail, Table,
  Presentation, FileText, Construction, Users,
} from 'lucide-react';

const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const Reports = lazy(() => import('@/pages/Reports'));
const Projects = lazy(() => import('@/pages/Projects'));
const Vendors = lazy(() => import('@/pages/Vendors'));
const Issues = lazy(() => import('@/pages/Issues'));
const Risks = lazy(() => import('@/pages/Risks'));
const InputDataProject = lazy(() => import('@/pages/InputDataProject'));
const BOQManagement = lazy(() => import('@/pages/BOQManagement'));
const KurvaS = lazy(() => import('@/pages/KurvaS'));
const ProgressFisik = lazy(() => import('@/pages/ProgressFisik'));
const ProjectDashboard = lazy(() => import('@/pages/ProjectDashboard'));
const Settings = lazy(() => import('@/pages/Settings'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError?.type === 'user_not_registered') {
    return <UserNotRegisteredError />;
  }

  // Render the main app
  return (
    <Routes>
      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected app routes */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/user-management" element={<UserManagement />} />
          <Route path="/project-dashboard" element={<ProjectDashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/reports/daily" element={<GenericModule title="Daily Report" subtitle="Daily operational reports and field activity summaries" icon={FileText} />} />
          <Route path="/reports/weekly" element={<GenericModule title="Weekly Report" subtitle="Weekly progress and performance summaries" icon={FileText} />} />
          <Route path="/reports/monthly" element={<GenericModule title="Monthly Report" subtitle="Monthly executive and operational summaries" icon={FileText} />} />
          <Route path="/reports/safety" element={<GenericModule title="Safety Report" subtitle="HSE incidents, inspections, and safety metrics" icon={ShieldCheck} />} />
          <Route path="/reports/ipc" element={<GenericModule title="IPC Report" subtitle="Interim Payment Certificate reports" icon={FileText} />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/issues" element={<Issues />} />
          <Route path="/risks" element={<Risks />} />
          <Route path="/input-data" element={<InputDataProject />} />
          <Route path="/multi-project" element={<GenericModule title="Multi Project" subtitle="Cross-project management and comparison" icon={Layers} />} />
          <Route path="/manpower" element={<GenericModule title="Manpower" subtitle="Workforce planning and utilization tracking" icon={HardHat} />} />
          <Route path="/materials" element={<GenericModule title="Material Tracking" subtitle="Material procurement, stock, and usage tracking" icon={Package} />} />
          <Route path="/equipment" element={<GenericModule title="Equipment Tracking" subtitle="Equipment allocation, maintenance, and status" icon={Wrench} />} />
          <Route path="/boq" element={<BOQManagement />} />
          <Route path="/rab" element={<GenericModule title="RAB" subtitle="Rencana Anggaran Biaya — budget planning" icon={Calculator} />} />
          <Route path="/schedule" element={<GenericModule title="Schedule" subtitle="Project scheduling and timeline management" icon={CalendarClock} />} />
          <Route path="/gantt" element={<GenericModule title="Gantt Chart" subtitle="Visual project timeline and task dependencies" icon={BarChart3} />} />
          <Route path="/kurva-s" element={<KurvaS />} />
          <Route path="/progress-fisik" element={<ProgressFisik />} />
          <Route path="/progress-keuangan" element={<GenericModule title="Progress Keuangan" subtitle="Financial progress and budget utilization" icon={DollarSign} />} />
          <Route path="/quality-inspection" element={<GenericModule title="Quality Inspection" subtitle="Quality control inspections and checklists" icon={ClipboardCheck} />} />
          <Route path="/action-plan" element={<GenericModule title="Action Plan" subtitle="Action items, owners, and follow-up tracking" icon={CheckSquare} />} />
          <Route path="/meetings" element={<GenericModule title="Meeting Minutes" subtitle="Meeting records, decisions, and action items" icon={Users} />} />
          <Route path="/documents" element={<GenericModule title="Document Management" subtitle="Document repository and version control" icon={FolderOpen} />} />
          <Route path="/photo-progress" element={<GenericModule title="Photo Progress" subtitle="Before/after photo documentation" icon={Camera} />} />
          <Route path="/approvals" element={<GenericModule title="Approval Workflow" subtitle="Multi-step approval routing and tracking" icon={CheckCircle} />} />
          <Route path="/signatures" element={<GenericModule title="Digital Signature" subtitle="Digital signature capture and verification" icon={PenTool} />} />
          <Route path="/audit-log" element={<GenericModule title="Audit Log" subtitle="System activity and change audit trail" icon={History} />} />
          <Route path="/whatsapp" element={<GenericModule title="WhatsApp Notification" subtitle="WhatsApp message templates and automation" icon={MessageCircle} />} />
          <Route path="/email-notification" element={<GenericModule title="Email Notification" subtitle="Email templates and notification settings" icon={Mail} />} />
          <Route path="/export/pdf" element={<GenericModule title="PDF Export" subtitle="Generate and download PDF reports" icon={FileText} />} />
          <Route path="/export/excel" element={<GenericModule title="Excel Export" subtitle="Export data to Excel/CSV format" icon={Table} />} />
          <Route path="/export/powerpoint" element={<GenericModule title="PowerPoint Export" subtitle="Generate presentation slides from data" icon={Presentation} />} />
        </Route>
      </Route>

      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <Suspense fallback={<div className="fixed inset-0 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" /></div>}>
            <AuthenticatedApp />
          </Suspense>
        </Router>
        <Toaster />
        <SonnerToaster theme="dark" position="bottom-right" richColors closeButton />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
