import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Zap, ArrowRight } from 'lucide-react';
import { PUBLIC_NAV_LINKS, ForgeLogoFallback } from '@/config/hero';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/Button';

export function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  const handleNavClick = useCallback(
    (href: string) => {
      setMobileOpen(false);
      if (href.startsWith('#')) {
        const el = document.querySelector(href);
        if (el) {
          // Unlock body scroll before smooth-scrolling so the anchor jump isn't blocked
          document.body.style.overflow = '';
          el.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        navigate(href);
      }
    },
    [navigate]
  );

  const handleOpenWorkspace = useCallback(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  const headerBg = scrolled
    ? 'bg-[#0B0D10]/95 backdrop-blur-md'
    : 'bg-transparent';

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${headerBg}`}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          {/* Wordmark */}
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-2 shrink-0"
            aria-label="Forge home"
          >
            <ForgeLogoFallback size="sm" />
          </a>

          {/* Desktop nav */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            {PUBLIC_NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="px-3 py-1.5 text-sm text-white/70 hover:text-white transition-colors rounded-md hover:bg-white/5"
              >
                {link.label}
              </button>
            ))}
          </nav>

          {/* Desktop CTA + mobile hamburger */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="hidden md:inline-flex border border-white/20 text-white/90 hover:bg-white/10 hover:border-white/30 hover:text-white"
              onClick={handleOpenWorkspace}
            >
              Open workspace
            </Button>

            <button
              className="md:hidden p-2 rounded-md text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              aria-expanded={mobileOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[100] transition-opacity duration-300 md:hidden ${
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />

        {/* Drawer panel */}
        <div
          className={`absolute top-0 right-0 bottom-0 w-[280px] bg-[#0B0D10] border-l border-forge-border-subtle flex flex-col transition-transform duration-300 ${
            mobileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-forge-border-subtle">
            <ForgeLogoFallback size="sm" />
            <button
              onClick={() => setMobileOpen(false)}
              className="p-2 rounded-md text-white/70 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-1" aria-label="Mobile navigation">
            {PUBLIC_NAV_LINKS.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className="w-full text-left px-3 py-2.5 text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-md transition-colors"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-forge-border-subtle space-y-3">
            <Button
              variant="ghost"
              className="w-full border border-white/20 text-white/90 hover:bg-white/10 hover:border-white/30 hover:text-white"
              onClick={handleOpenWorkspace}
            >
              Open workspace
            </Button>
            <p className="text-[11px] text-forge-text-muted text-center">
              Local-first AI development workspace
            </p>
          </div>
        </div>
      </div>
    </>
  );
}