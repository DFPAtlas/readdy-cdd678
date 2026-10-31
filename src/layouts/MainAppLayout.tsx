import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useThemeStore, applyThemeToDocument } from '@/stores/themeStore';
import { TopBar } from '@/components/feature/TopBar';
import { Sidebar } from '@/components/feature/Sidebar';
import { StatusBar } from '@/components/feature/StatusBar';
import { useSidebarStore } from '@/stores/sidebarStore';

export default function MainAppLayout() {
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const isExpanded = useSidebarStore((s) => s.isExpanded);

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  return (
    <div className="h-screen flex flex-col bg-forge-bg overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
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