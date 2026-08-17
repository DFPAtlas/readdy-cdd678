import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scrolls the window to the top whenever the route pathname changes.
 *
 * Only reacts to `pathname`, not `hash` / `search`, so same-page anchor
 * scrolling on the homepage is left untouched. Uses instant behaviour so
 * routed pages always open at the top without an animated jump.
 */
export function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}