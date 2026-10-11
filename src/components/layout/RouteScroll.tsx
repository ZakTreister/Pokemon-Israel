import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
// One SPA navigation boundary, including POP and programmatic navigation.
export default function RouteScroll() {
  const { pathname, search, hash, key } = useLocation();
  useLayoutEffect(() => {
    if (!window.history || !('scrollRestoration' in window.history)) return;
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);
  useLayoutEffect(() => {
    if (hash) {
      let anchor: string;
      try {
        anchor = decodeURIComponent(hash.slice(1));
      } catch {
        anchor = hash.slice(1);
      }
      const scroll = () => {
        const target = document.getElementById(anchor);
        if (target) {
          target.scrollIntoView?.();
          return true;
        }
        return false;
      };
      if (scroll()) return;
      // Async route content may render the requested anchor after initial loading.
      const observer = new MutationObserver(() => {
        if (scroll()) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return () => observer.disconnect();
    }
    window.scrollTo?.({
      top: 0,
      left: 0,
      behavior: 'instant' as ScrollBehavior,
    });
  }, [pathname, search, hash, key]);
  return null;
}
