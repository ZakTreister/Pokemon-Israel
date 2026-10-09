import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import FloatingTrialCTA from './FloatingTrialCTA';
import { isPublicPage } from '../../config/publicSite';
import { useLocation } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const publicPage = isPublicPage(useLocation().pathname);
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:right-2 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-navy-700"
      >
        דילוג לתוכן
      </a>
      <main
        id="main-content"
        className={`min-w-0 flex-1 ${publicPage ? 'pb-24' : ''}`}
        tabIndex={-1}
      >
        {children}
      </main>
      <Footer />
      <FloatingTrialCTA />
    </div>
  );
}
