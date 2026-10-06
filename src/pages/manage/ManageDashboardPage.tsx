import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { PanelLeft, Shield, Award } from 'lucide-react';
import Button from '../../components/ui/Button';
import ManageTeams from './ManageTeams';
import ManageBadges from './ManageBadges';

export default function ManageDashboardPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="cs-workspace min-h-[calc(100vh-16rem)]">
      <div className="container py-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5 mb-6">
          <h1 className="text-3xl font-extrabold text-foreground">אזור ניהול משותף</h1>
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={toggleSidebar}
            aria-label="פתיחה או סגירה של תפריט הניהול"
            aria-expanded={isSidebarOpen}
          >
            <PanelLeft size={20} />
          </Button>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className={`
            ${isSidebarOpen ? 'block' : 'hidden'}
            lg:block bg-card border border-border rounded-lg p-4 h-fit shadow-panel border-t-4 border-t-blue-500
          `}>
            <div className="mb-6 pb-4 border-b border-border">
              <div className="text-sm text-muted-foreground">שלום,</div>
              <div className="font-bold text-foreground">{user?.username}</div>
              <div className="text-xs bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 rounded-full px-2 py-0.5 w-fit mt-1 font-bold">
                {user?.role === 'admin' ? 'מנהל' : 'שופט'}
              </div>
            </div>

            <nav className="space-y-1">
              <NavLink
                to="/manage/teams"
                icon={<Shield size={18} />}
                label="ניהול נבחרות"
                isActive={location.pathname.includes('/manage/teams')}
              />
              <NavLink
                to="/manage/badges"
                icon={<Award size={18} />}
                label="ניהול תגים"
                isActive={location.pathname.includes('/manage/badges')}
              />
            </nav>
          </div>

          <div className="min-w-0 bg-card border border-border rounded-lg p-4 sm:p-6 shadow-panel">
            <Routes>
              <Route path="teams/*" element={<ManageTeams />} />
              <Route path="badges/*" element={<ManageBadges />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}

interface NavLinkProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
}

function NavLink({ to, icon, label, isActive }: NavLinkProps) {
  return (
    <Link
      to={to}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-md transition-colors
        ${isActive
          ? 'bg-navy-700 text-white border-s-4 border-gold font-bold'
          : 'text-foreground hover:bg-muted'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
