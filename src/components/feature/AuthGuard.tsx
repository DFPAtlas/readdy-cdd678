import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';

/**
 * Protects authenticated routes. While the session is still initialising it
 * renders a spinner (never a protected page or a login flash). Once resolved,
 * an unauthenticated visitor is redirected to /login with a safe return path.
 */
export default function AuthGuard() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (initialized && !user) {
      const redirect = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?redirect=${redirect}`, { replace: true });
    }
  }, [initialized, user, navigate, location.pathname, location.search]);

  if (!initialized) {
    return (
      <div className="min-h-screen bg-forge-bg flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <Outlet />;
}