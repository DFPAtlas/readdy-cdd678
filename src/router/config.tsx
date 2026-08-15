import type { RouteObject } from "react-router-dom";
import NotFound from "@/pages/NotFound";

// Layouts
import PublicLayout from "@/layouts/PublicLayout";
import MainAppLayout from "@/layouts/MainAppLayout";
import ProjectLayout from "@/layouts/ProjectLayout";

// Public pages
import HeroPage from "@/pages/hero/page";
import LoginPage from "@/pages/login/page";
import SetupPage from "@/pages/setup/page";
import OnboardingPage from "@/pages/onboarding/page";

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
import SettingsSystemPage from "@/pages/settings/system/page";
import SystemStatusPage from "@/pages/system/status/page";
import HelpPage from "@/pages/help/page";

// Project pages
import ProjectRedirect from "@/pages/projects/redirect";
import ProjectOverviewPage from "@/pages/projects/overview/page";
import SandboxPage from "@/pages/projects/sandbox/page";
import FilesPage from "@/pages/projects/files/page";
import AssetsPage from "@/pages/projects/assets/page";
import BuildsPage from "@/pages/projects/builds/page";
import VersionsPage from "@/pages/projects/versions/page";
import ExportsPage from "@/pages/projects/exports/page";
import ProjectSettingsPage from "@/pages/projects/settings/page";
import ForgeAdminPage from "@/pages/admin/page";

const routes: RouteObject[] = [
  // --- Public Routes ---
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HeroPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/setup", element: <SetupPage /> },
      { path: "/onboarding", element: <OnboardingPage /> },
    ],
  },

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
      { path: "/help", element: <HelpPage /> },

      // Settings with nested routes
      {
        path: "/settings",
        element: <SettingsLayout />,
        children: [
          { index: true, element: <SettingsRedirect /> },
          { path: "profile", element: <SettingsProfilePage /> },
          { path: "appearance", element: <SettingsAppearancePage /> },
          { path: "providers", element: <SettingsProvidersPage /> },
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

  // --- Platform Admin Console (server-authorised, standalone) ---
  { path: "/forge-admin", element: <ForgeAdminPage /> },

  // --- Catch-all ---
  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;