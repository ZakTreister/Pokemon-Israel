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
    <div className="min-h-[calc(100vh-16rem)]">
      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">אזור ניהול משותף</h1>
          <Button
            variant="outline"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
          >
            <PanelLeft size={20} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-6">
          <div className={`
            ${isSidebarOpen ? 'block' : 'hidden'}
            md:block bg-card border border-border rounded-lg p-4 h-fit
          `}>
            <div className="mb-6 pb-4 border-b border-border">
              <div className="text-sm text-muted-foreground">שלום,</div>
              <div className="font-medium">{user?.username}</div>
              <div className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 w-fit mt-1">
                {user?.role === 'admin' ? 'מנהל' : 'שופט'}
              </div>
            </div>

            <nav className="space-y-1">
              <NavLink
                to="/manage/teams"
                icon={<Shield size={18} />}
                label="ניהול קבוצות"
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

          <div className="bg-card border border-border rounded-lg p-6">
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
          ? 'bg-primary/10 text-primary'
          : 'text-foreground hover:bg-muted'
        }
      `}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}
