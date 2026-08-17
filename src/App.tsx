import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { ToastProvider } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/feature/CommandPalette";
import { ErrorBoundary } from "@/components/feature/ErrorBoundary";
import { OfflineBanner } from "@/components/feature/OfflineBanner";
import { LoadingScreen } from "@/components/feature/LoadingScreen";
import { ScrollToTop } from "@/components/feature/ScrollToTop";
import AuthBootstrap from "@/components/feature/AuthBootstrap";
import { useThemeStore, applyThemeToDocument } from "@/stores/themeStore";
import { useState, useEffect } from "react";

function ThemeInitializer() {
  const { effectiveTheme, updateEffectiveTheme } = useThemeStore();

  useEffect(() => {
    updateEffectiveTheme();
  }, [updateEffectiveTheme]);

  useEffect(() => {
    applyThemeToDocument(effectiveTheme);
  }, [effectiveTheme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const { theme } = useThemeStore.getState();
      if (theme === 'system') {
        useThemeStore.getState().updateEffectiveTheme();
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return null;
}

function App() {
  const [loadingVisible, setLoadingVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoadingVisible(false), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <BrowserRouter basename={__BASE_PATH__}>
          <ThemeInitializer />
          <ScrollToTop />
          <ToastProvider>
            <OfflineBanner />
            <CommandPalette />
            <AppRoutes />
            <AuthBootstrap />
          </ToastProvider>
          <LoadingScreen visible={loadingVisible} />
        </BrowserRouter>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;