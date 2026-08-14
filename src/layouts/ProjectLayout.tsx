import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useThemeStore, applyThemeToDocument } from '@/stores/themeStore';
import { useSidebarStore } from '@/stores/sidebarStore';
import { TopBar } from '@/components/feature/TopBar';
import { ProjectSidebar } from '@/components/feature/ProjectSidebar';
import { StatusBar } from '@/components/feature/StatusBar';

export default function ProjectLayout() {
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const isExpanded = useSidebarStore((s) => s.isExpanded);

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  return (
    <div className="h-screen flex flex-col bg-forge-bg overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <ProjectSidebar />
        <main
          className="flex-1 overflow-y-auto transition-all duration-200"
          style={{ marginLeft: isExpanded ? '220px' : '56px' }}
        >
          <div className="p-6 min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
      <StatusBar />
    </div>
  );
}