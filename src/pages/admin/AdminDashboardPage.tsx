import { useState } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAppSelector } from '../../hooks/redux';
import { LayoutDashboard, Users, CalendarDays, PanelLeft, Newspaper, Library, CalendarClock, Users2 } from 'lucide-react';
import Button from '../../components/ui/Button';
import AdminTournaments from './AdminTournaments';
import AdminUsers from './AdminUsers';
import AdminOverview from './AdminOverview';
import AdminUpdates from './AdminUpdates';
import AdminDecks from './AdminDecks';
import AdminSeasons from './AdminSeasons';
import AdminPlayers from './AdminPlayers';

export default function AdminDashboardPage() {
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
          <h1 className="text-3xl font-bold">לוח בקרה למנהל</h1>
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
          {/* Sidebar */}
          <div className={`
            ${isSidebarOpen ? 'block' : 'hidden'} 
            md:block bg-card border border-border rounded-lg p-4 h-fit
          `}>
            <div className="mb-6 pb-4 border-b border-border">
              <div className="text-sm text-muted-foreground">שלום,</div>
              <div className="font-medium">{user?.username}</div>
              <div className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5 w-fit mt-1">
                מנהל
              </div>
            </div>
            
            <nav className="space-y-1">
              <NavLink 
                to="/admin" 
                icon={<LayoutDashboard size={18} />}
                label="סקירה כללית"
                isActive={location.pathname === '/admin' || location.pathname === '/admin/'}
              />
              <NavLink 
                to="/admin/tournaments" 
                icon={<CalendarDays size={18} />}
                label="ניהול טורנירים"
                isActive={location.pathname.includes('/admin/tournaments')}
              />
              <NavLink 
                to="/admin/users" 
                icon={<Users size={18} />}
                label="ניהול משתמשים"
                isActive={location.pathname.includes('/admin/users')}
              />
              <NavLink 
                to="/admin/updates" 
                icon={<Newspaper size={18} />}
                label="ניהול עדכונים"
                isActive={location.pathname.includes('/admin/updates')}
              />
              <NavLink 
                to="/admin/decks" 
                icon={<Library size={18} />}
                label="ניהול דקים"
                isActive={location.pathname.includes('/admin/decks')}
              />
              <NavLink 
                to="/admin/seasons" 
                icon={<CalendarClock size={18} />}
                label="ניהול עונות"
                isActive={location.pathname.includes('/admin/seasons')}
              />
              <NavLink 
                to="/admin/players" 
                icon={<Users2 size={18} />}
                label="שחקנים"
                isActive={location.pathname.includes('/admin/players')}
              />
            </nav>
          </div>

          {/* Content */}
          <div className="bg-card border border-border rounded-lg p-6">
            <Routes>
              <Route index element={<AdminOverview />} />
              <Route path="tournaments/*" element={<AdminTournaments />} />
              <Route path="users/*" element={<AdminUsers />} />
              <Route path="updates/*" element={<AdminUpdates />} />
              <Route path="decks/*" element={<AdminDecks />} />
              <Route path="seasons/*" element={<AdminSeasons />} />
              <Route path="players/*" element={<AdminPlayers />} />
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