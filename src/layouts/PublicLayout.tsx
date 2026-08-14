import { Outlet } from 'react-router-dom';
import { useThemeStore, applyThemeToDocument } from '@/stores/themeStore';
import { useEffect } from 'react';

export default function PublicLayout() {
  const effectiveTheme = useThemeStore((s) => s.effectiveTheme);

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  return (
    <div className="min-h-screen bg-forge-bg">
      <Outlet />
    </div>
  );
}