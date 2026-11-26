import { ReactNode } from 'react';
import {useLocation} from 'react-router-dom';
import SiteSettingsProvider,{useSiteSettings} from '../../features/siteSettings/SiteSettingsProvider';
import {pageActive} from '../../../shared/siteSettings';
import {staticContentLinkTarget} from '../../../shared/contentLinkTargets';
import NotFoundPage from '../../pages/NotFoundPage';
import RouteScroll from './RouteScroll';
import Header from './Header';
import Footer from './Footer';
import {StaticContentPageLinks} from '../content/ContentPageLinks';
import FloatingTrialCTA from './FloatingTrialCTA';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({children}:LayoutProps){const {pathname}=useLocation();return <SiteSettingsProvider navigationKey={pathname}><LayoutContent>{children}</LayoutContent></SiteSettingsProvider>;}
function LayoutContent({ children }: LayoutProps) {
  const {pathname}=useLocation();
  const {settings,status}=useSiteSettings();
  const target=staticContentLinkTarget(pathname);
  const waiting=!!target&&target!=='/'&&status==='loading';
  const unavailable=!!target&&target!=='/'&&status==='error';
  const disabled=!pageActive(settings,pathname);
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
        {waiting?<p role="status" className="container py-8">טוען עמוד...</p>:unavailable?<p role="alert" className="container py-8">לא ניתן לטעון את הגדרות האתר. נסו לרענן את העמוד.</p>:disabled?<NotFoundPage/>:<>{children}<StaticContentPageLinks /></>}
      </main>
      <Footer />
      {!disabled&&!waiting&&!unavailable&&<FloatingTrialCTA />}
    </div>
  );
}
