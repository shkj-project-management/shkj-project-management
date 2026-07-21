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
const DailyProgress = lazy(() => import('@/pages/DailyProgress'));
const PhotoProgress = lazy(() => import('@/pages/PhotoProgress'));
const KurvaS = lazy(() => import('@/pages/KurvaS'));
const ProgressFisik = lazy(() => import('@/pages/ProgressFisik'));
const ProjectDashboard = lazy(() => import('@/pages/ProjectDashboard'));
const Settings = lazy(() => import('@/pages/Settings'));
const UserManagement = lazy(() => import('@/pages/UserManagement'));

// Sprint 2 - HSE Pages
const HSESafetyInspection = lazy(() => import('@/pages/hse/SafetyInspection'));
const HSESafetyObservation = lazy(() => import('@/pages/hse/SafetyObservation'));
const HSEUnsafeAction = lazy(() => import('@/pages/hse/UnsafeAction'));
const HSEUnsafeCondition = lazy(() => import('@/pages/hse/UnsafeCondition'));
const HSENearMiss = lazy(() => import('@/pages/hse/NearMiss'));
const HSEIncidentReport = lazy(() => import('@/pages/hse/IncidentReport'));
const HSEPPEChecklist = lazy(() => import('@/pages/hse/PPEChecklist'));
const HSEPermitToWork = lazy(() => import('@/pages/hse/PermitToWork'));
const HSEToolboxMeeting = lazy(() => import('@/pages/hse/ToolboxMeeting'));
const HSESafetyMeeting = lazy(() => import('@/pages/hse/SafetyMeeting'));
const HSECorrectiveAction = lazy(() => import('@/pages/hse/CorrectiveAction'));
const HSEPreventiveAction = lazy(() => import('@/pages/hse/PreventiveAction'));

// Sprint 2 - IPCN Pages
const IPCNInspection = lazy(() => import('@/pages/ipcn/Inspection'));
const IPCNHousekeeping = lazy(() => import('@/pages/ipcn/Housekeeping'));
const IPCNEnvironmental = lazy(() => import('@/pages/ipcn/Environmental'));
const IPCNAirQuality = lazy(() => import('@/pages/ipcn/AirQuality'));
const IPCNWaterQuality = lazy(() => import('@/pages/ipcn/WaterQuality'));
const IPCNIsolationAudit = lazy(() => import('@/pages/ipcn/IsolationAudit'));
const IPCNHandHygiene = lazy(() => import('@/pages/ipcn/HandHygiene'));
const IPCNSterilization = lazy(() => import('@/pages/ipcn/Sterilization'));

// Sprint 2 - Action Plan
const ActionPlanPage = lazy(() => import('@/pages/ActionPlan'));

// Sprint 2 - Notification Center
const NotificationCenter = lazy(() => import('@/pages/NotificationCenter'));

// Sprint 2 - Email
const EmailNotification = lazy(() => import('@/pages/EmailNotification'));

// Sprint 2 - Report Pages
const DailyReport = lazy(() => import('@/pages/reports/DailyReport'));
const WeeklyReport = lazy(() => import('@/pages/reports/WeeklyReport'));
const MonthlyReport = lazy(() => import('@/pages/reports/MonthlyReport'));
const ExecutiveReport = lazy(() => import('@/pages/reports/ExecutiveReport'));
const ProjectReport = lazy(() => import('@/pages/reports/ProjectReport'));
const ProgressReport = lazy(() => import('@/pages/reports/ProgressReport'));
const BOQReport = lazy(() => import('@/pages/reports/BOQReport'));
const VendorReport = lazy(() => import('@/pages/reports/VendorReport'));
const SafetyReport = lazy(() => import('@/pages/reports/SafetyReport'));
const IPCNReport = lazy(() => import('@/pages/reports/IPCNReport'));
const ActionPlanReport = lazy(() => import('@/pages/reports/ActionPlanReport'));
const PhotoProgressReport = lazy(() => import('@/pages/reports/PhotoProgressReport'));

// Sprint 2 - Export Pages
const PDFExport = lazy(() => import('@/pages/export/PDFExport'));
const ExcelExport = lazy(() => import('@/pages/export/ExcelExport'));
const PowerPointExport = lazy(() => import('@/pages/export/PowerPointExport'));

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
          <Route path="/action-plan" element={<ActionPlanPage />} />
          <Route path="/meetings" element={<GenericModule title="Meeting Minutes" subtitle="Meeting records, decisions, and action items" icon={Users} />} />
          <Route path="/documents" element={<GenericModule title="Document Management" subtitle="Document repository and version control" icon={FolderOpen} />} />
          <Route path="/daily-progress" element={<DailyProgress />} />
          <Route path="/photo-progress" element={<PhotoProgress />} />
          <Route path="/approvals" element={<GenericModule title="Approval Workflow" subtitle="Multi-step approval routing and tracking" icon={CheckCircle} />} />
          <Route path="/signatures" element={<GenericModule title="Digital Signature" subtitle="Digital signature capture and verification" icon={PenTool} />} />
          <Route path="/audit-log" element={<GenericModule title="Audit Log" subtitle="System activity and change audit trail" icon={History} />} />
          <Route path="/whatsapp" element={<GenericModule title="WhatsApp Notification" subtitle="WhatsApp message templates and automation" icon={MessageCircle} />} />
          <Route path="/email-notification" element={<EmailNotification />} />
          <Route path="/notifications" element={<NotificationCenter />} />

          {/* Sprint 2: Report Routes */}
          <Route path="/reports/daily" element={<DailyReport />} />
          <Route path="/reports/weekly" element={<WeeklyReport />} />
          <Route path="/reports/monthly" element={<MonthlyReport />} />
          <Route path="/reports/executive" element={<ExecutiveReport />} />
          <Route path="/reports/project" element={<ProjectReport />} />
          <Route path="/reports/progress" element={<ProgressReport />} />
          <Route path="/reports/boq" element={<BOQReport />} />
          <Route path="/reports/vendor" element={<VendorReport />} />
          <Route path="/reports/safety" element={<SafetyReport />} />
          <Route path="/reports/ipc" element={<GenericModule title="IPC Report" subtitle="Interim Payment Certificate reports" icon={FileText} />} />
          <Route path="/reports/ipcn" element={<IPCNReport />} />
          <Route path="/reports/action-plan" element={<ActionPlanReport />} />
          <Route path="/reports/photo-progress" element={<PhotoProgressReport />} />

          {/* Sprint 2: HSE Routes */}
          <Route path="/hse/safety-inspection" element={<HSESafetyInspection />} />
          <Route path="/hse/safety-observation" element={<HSESafetyObservation />} />
          <Route path="/hse/unsafe-action" element={<HSEUnsafeAction />} />
          <Route path="/hse/unsafe-condition" element={<HSEUnsafeCondition />} />
          <Route path="/hse/near-miss" element={<HSENearMiss />} />
          <Route path="/hse/incident" element={<HSEIncidentReport />} />
          <Route path="/hse/ppe" element={<HSEPPEChecklist />} />
          <Route path="/hse/permit-to-work" element={<HSEPermitToWork />} />
          <Route path="/hse/toolbox-meeting" element={<HSEToolboxMeeting />} />
          <Route path="/hse/safety-meeting" element={<HSESafetyMeeting />} />
          <Route path="/hse/corrective-action" element={<HSECorrectiveAction />} />
          <Route path="/hse/preventive-action" element={<HSEPreventiveAction />} />

          {/* Sprint 2: IPCN Routes */}
          <Route path="/ipcn/inspection" element={<IPCNInspection />} />
          <Route path="/ipcn/housekeeping" element={<IPCNHousekeeping />} />
          <Route path="/ipcn/environmental" element={<IPCNEnvironmental />} />
          <Route path="/ipcn/air-quality" element={<IPCNAirQuality />} />
          <Route path="/ipcn/water-quality" element={<IPCNWaterQuality />} />
          <Route path="/ipcn/isolation-audit" element={<IPCNIsolationAudit />} />
          <Route path="/ipcn/hand-hygiene" element={<IPCNHandHygiene />} />
          <Route path="/ipcn/sterilization" element={<IPCNSterilization />} />

          {/* Sprint 2: Export Routes */}
          <Route path="/export/pdf" element={<PDFExport />} />
          <Route path="/export/excel" element={<ExcelExport />} />
          <Route path="/export/powerpoint" element={<PowerPointExport />} />
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