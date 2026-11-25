import { ReactNode } from 'react';
import RouteScroll from './RouteScroll';
import Header from './Header';
import Footer from './Footer';
import FloatingTrialCTA from './FloatingTrialCTA';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <RouteScroll />
      <Header />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-navy-700"
      >
        דילוג לתוכן
      </a>
      <main
        id="main-content"
        className="min-w-0 flex-1"
        tabIndex={-1}
      >
        {children}
      </main>
      <Footer />
      <FloatingTrialCTA />
    </div>
  );
}
