import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useThemeStore, applyThemeToDocument } from '@/stores/themeStore';
import { useSystemStore } from '@/stores/index';
import { getServiceStatuses } from '@/services/mock/demoData';
import { TopBar } from '@/components/feature/TopBar';
import { Sidebar } from '@/components/feature/Sidebar';
import { StatusBar } from '@/components/feature/StatusBar';
import { useSidebarStore } from '@/stores/sidebarStore';

export default function MainAppLayout() {
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);
  const isExpanded = useSidebarStore((s) => s.isExpanded);
  const setHealth = useSystemStore((s) => s.setHealth);

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    const services = getServiceStatuses();
    setHealth({
      forgeApi: { status: services[0].status, latency: services[0].latency, version: services[0].version },
      supabase: { status: services[1].status, latency: services[1].latency, version: services[1].version },
      n8n: { status: services[2].status, latency: services[2].latency, version: services[2].version },
      previewManager: { status: services[3].status, latency: services[3].latency, version: services[3].version },
      ollama: { status: services[4].status, latency: services[4].latency, version: services[4].version },
    });
  }, [setHealth]);

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