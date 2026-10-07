import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { X, LogOut, Sun, Moon, Menu as MenuIcon, Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../features/auth/authSlice';
import { useTheme } from '../ThemeProvider';
import Button from '../ui/Button';
import { Badge } from '../ui/Badge';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
    setIsMenuOpen(false);
  };
  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');
  const isStaff =
    isAuthenticated && (user?.role === 'admin' || user?.role === 'judge');
  const links = [
    ...(isStaff ? [{ to: '/manage', label: 'ניהול', construction: false }] : []),
    { to: '/rankings', label: 'הליגה הישראלית', construction: false },
    { to: '/all-stars', label: 'All Stars', construction: false },
    { to: '/tournaments', label: 'אירועים', construction: false },
    { to: '/news', label: 'חדשות', construction: false },
    { to: '/store', label: 'חנות', construction: true },
    { to: '/about', label: 'על הליגה', construction: true },
    { to: '/birthday', label: 'הזמנת יום הולדת', construction: true },
  ];
  const actions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        className="text-navy-700 hover:bg-blue-50"
        aria-label={theme === 'light' ? 'מעבר לתצוגה כהה' : 'מעבר לתצוגה בהירה'}
      >
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </Button>
      {isAuthenticated ? (
        <div className="flex min-w-0 items-center gap-2">
          <span className="max-w-24 truncate text-sm font-bold text-navy-700">
            {user?.name}
          </span>
          {user?.role === 'admin' && (
            <Badge variant="rank-1" className="text-[10px]">
              מנהל
            </Badge>
          )}
          {user?.role === 'judge' && (
            <Badge variant="info" className="text-[10px]">
              שופט
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            aria-label="התנתקות"
            className="text-navy-700 hover:bg-blue-50"
          >
            <LogOut size={18} />
          </Button>
        </div>
      ) : (
        <Button asChild size="sm">
          <Link to="/login" onClick={() => setIsMenuOpen(false)}>
            כניסת צוות
          </Link>
        </Button>
      )}
    </>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-navy-700/10 bg-white/90 shadow-panel backdrop-blur-[15px]">
      <div className="container">
        <div className="flex min-h-[72px] items-center justify-between gap-3">
          <Link
            to="/"
            className="flex shrink-0 items-center gap-2.5 text-navy-700"
            onClick={() => setIsMenuOpen(false)}
            aria-label="CardSchool — דף הבית"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gold-gradient shadow-button-gold">
              <Zap size={24} fill="currentColor" />
            </span>
            <span>
              <span
                dir="ltr"
                className="block text-xl font-black tracking-tight"
              >
                CardSchool<span className="text-blue-500"> IL</span>
              </span>
              <span className="block text-[10px] font-bold tracking-wide text-ink-muted">
                ליגת הפוקימון הישראלית
              </span>
            </span>
          </Link>
          <nav
            aria-label="ניווט ראשי"
            className="hidden items-center gap-3 text-sm xl:flex"
          >
            {links.map(({ to, label, construction }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className="cs-nav-link"
              >
                {label}{construction && <span className="block text-[9px] text-blue-500 leading-tight">בהקמה</span>}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-1 xl:flex">{actions}</div>
          <Button
            variant="ghost"
            size="icon"
            className="text-navy-700 xl:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'סגירת תפריט' : 'פתיחת תפריט'}
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </Button>
        </div>
        {isMenuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-line py-4 xl:hidden"
          >
            <nav
              aria-label="ניווט ראשי בנייד"
              className="grid grid-cols-2 gap-2"
            >
              {links.map(({ to, label, construction }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className="cs-nav-link px-3"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}{construction && <span className="block text-[9px] text-blue-500 leading-tight">בהקמה</span>}
                </NavLink>
              ))}
            </nav>
            <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
              {actions}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
