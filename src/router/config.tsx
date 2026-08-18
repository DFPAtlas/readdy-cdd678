import type { RouteObject } from "react-router-dom";
import NotFound from "@/pages/NotFound";

// Layouts
import PublicLayout from "@/layouts/PublicLayout";
import MainAppLayout from "@/layouts/MainAppLayout";
import ProjectLayout from "@/layouts/ProjectLayout";

// Auth
import AuthGuard from "@/components/feature/AuthGuard";

// Public pages
import HeroPage from "@/pages/hero/page";
import LoginPage from "@/pages/login/page";
import SetupPage from "@/pages/setup/page";
import OnboardingPage from "@/pages/onboarding/page";
import PricingPage from "@/pages/pricing/page";
import CheckoutPage from "@/pages/checkout/page";
import CheckoutCompletePage from "@/pages/checkout/complete/page";
import ConfirmEmailPage from "@/pages/confirm-email/page";
import CheckEmailPage from "@/pages/check-email/page";
import ResetPasswordPage from "@/pages/reset-password/page";

// App pages
import DashboardPage from "@/pages/dashboard/page";
import ProjectsPage from "@/pages/projects/page";
import NewProjectPage from "@/pages/projects/new/page";
import TemplatesPage from "@/pages/templates/page";
import AgentsPage from "@/pages/agents/page";
import ActivityPage from "@/pages/activity/page";
import SettingsLayout from "@/pages/settings/page";
import SettingsRedirect from "@/pages/settings/redirect";
import SettingsProfilePage from "@/pages/settings/profile/page";
import SettingsAppearancePage from "@/pages/settings/appearance/page";
import SettingsProvidersPage from "@/pages/settings/providers/page";
import SettingsBillingPage from "@/pages/settings/billing/page";
import SettingsSystemPage from "@/pages/settings/system/page";
import SystemStatusPage from "@/pages/system/status/page";
import HelpPage from "@/pages/help/page";

// Project pages
import ProjectRedirect from "@/pages/projects/redirect";
import ProjectOverviewPage from "@/pages/projects/overview/page";
import SandboxPage from "@/pages/projects/sandbox/page";
import CmsPage from "@/pages/projects/cms/page";
import MembersPage from "@/pages/projects/members/page";
import WorkflowsPage from "@/pages/projects/workflows/page";
import FilesPage from "@/pages/projects/files/page";
import AssetsPage from "@/pages/projects/assets/page";
import BuildsPage from "@/pages/projects/builds/page";
import VersionsPage from "@/pages/projects/versions/page";
import ExportsPage from "@/pages/projects/exports/page";
import ProjectSettingsPage from "@/pages/projects/settings/page";
import ForgeAdminPage from "@/pages/admin/page";
import AdminLogin from "@/pages/admin/AdminLogin";
import OwnerDashboard from "@/pages/admin/dashboard/OwnerDashboard";
import SystemPage from "@/pages/admin/SystemPage";
import UsagePage from "@/pages/admin/UsagePage";
import SupportPage from "@/pages/admin/SupportPage";
import AnnouncementsPage from "@/pages/admin/AnnouncementsPage";
import { FeaturesPage, AdminsPage, AuditPage, SettingsPage } from "@/pages/admin/pages";
import CustomersPage from "@/pages/admin/CustomersPage";
import AdminProjectsPage from "@/pages/admin/AdminProjectsPage";
import BillingPage from "@/pages/admin/BillingPage";
import { BuildsSection } from "@/pages/admin/BuildsSection";
import { AiDeploySection } from "@/pages/admin/AiDeploySection";
import { ModerationSection } from "@/pages/admin/ModerationSection";
import { IncidentsSection } from "@/pages/admin/IncidentsSection";
import { IntegrationsPage } from "@/pages/admin/IntegrationsPage";
import { AgentsPage as AdminAgentsPage } from "@/pages/admin/AgentsPage";

const routes: RouteObject[] = [
  // --- Public Routes ---
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HeroPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/setup", element: <SetupPage /> },
      { path: "/onboarding", element: <OnboardingPage /> },
      { path: "/help", element: <HelpPage /> },
      { path: "/pricing", element: <PricingPage /> },
      { path: "/subscriptions", element: <PricingPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/checkout/complete", element: <CheckoutCompletePage /> },
      { path: "/confirm-email", element: <ConfirmEmailPage /> },
      { path: "/check-email", element: <CheckEmailPage /> },
      { path: "/reset-password", element: <ResetPasswordPage /> },
    ],
  },

  // --- Protected Routes (require authentication) ---
  {
    element: <AuthGuard />,
    children: [
      // --- Main App Routes ---
      {
        element: <MainAppLayout />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/projects", element: <ProjectsPage /> },
          { path: "/projects/new", element: <NewProjectPage /> },
          { path: "/templates", element: <TemplatesPage /> },
          { path: "/agents", element: <AgentsPage /> },
          { path: "/activity", element: <ActivityPage /> },
          // Settings with nested routes
          {
            path: "/settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <SettingsRedirect /> },
              { path: "profile", element: <SettingsProfilePage /> },
              { path: "appearance", element: <SettingsAppearancePage /> },
              { path: "providers", element: <SettingsProvidersPage /> },
              { path: "billing", element: <SettingsBillingPage /> },
              { path: "system", element: <SettingsSystemPage /> },
            ],
          },

          // System
          { path: "/system/status", element: <SystemStatusPage /> },
        ],
      },

      // --- Project Routes ---
      {
        element: <ProjectLayout />,
        children: [
          { path: "/projects/:projectId", element: <ProjectRedirect /> },
          { path: "/projects/:projectId/overview", element: <ProjectOverviewPage /> },
          { path: "/projects/:projectId/cms", element: <CmsPage /> },
          { path: "/projects/:projectId/members", element: <MembersPage /> },
          { path: "/projects/:projectId/workflows", element: <WorkflowsPage /> },
          { path: "/projects/:projectId/files", element: <FilesPage /> },
          { path: "/projects/:projectId/assets", element: <AssetsPage /> },
          { path: "/projects/:projectId/builds", element: <BuildsPage /> },
          { path: "/projects/:projectId/versions", element: <VersionsPage /> },
          { path: "/projects/:projectId/exports", element: <ExportsPage /> },
          { path: "/projects/:projectId/settings", element: <ProjectSettingsPage /> },
        ],
      },

      // --- Sandbox Workspace (standalone, not inside ProjectLayout) ---
      { path: "/projects/:projectId/sandbox", element: <SandboxPage /> },
    ],
  },

  // --- Platform Admin Console (server-authorised, standalone) ---
  { path: "/forge-admin/login", element: <AdminLogin /> },
  {
    path: "/forge-admin",
    element: <ForgeAdminPage />,
    children: [
      { index: true, element: <OwnerDashboard /> },
      { path: "customers", element: <CustomersPage /> },
      { path: "projects", element: <AdminProjectsPage /> },
      { path: "billing", element: <BillingPage /> },
      { path: "usage", element: <UsagePage /> },
      { path: "ai", element: <AiDeploySection /> },
      { path: "integrations", element: <IntegrationsPage /> },
      { path: "agents", element: <AdminAgentsPage /> },
      { path: "builds", element: <BuildsSection /> },
      { path: "templates", element: <ModerationSection /> },
      { path: "support", element: <SupportPage /> },
      { path: "incidents", element: <IncidentsSection /> },
      { path: "system", element: <SystemPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "announcements", element: <AnnouncementsPage /> },
      { path: "features", element: <FeaturesPage /> },
      { path: "admins", element: <AdminsPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },

  // --- Catch-all ---
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;