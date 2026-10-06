import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, LogOut, Sun, Moon, Menu as MenuIcon, Zap } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../features/auth/authSlice';
import { useTheme } from '../ThemeProvider';
import Button from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const isStaff = isAuthenticated && (user?.role === 'admin' || user?.role === 'judge');

  return (
    <header className="bg-navy-700 border-b border-navy-600/50 sticky top-0 z-40 shadow-card">
      <div className="container py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="text-xl md:text-2xl font-extrabold text-white flex items-center gap-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold text-navy-700">
                <Zap size={20} fill="currentColor" />
              </span>
              <span>ליגת הפוקימון</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-blue-100 hover:text-gold transition-colors font-medium">
              ראשי
            </Link>
            <Link to="/tournaments" className="text-blue-100 hover:text-gold transition-colors font-medium">
              טורנירים
            </Link>
            <Link to="/rankings" className="text-blue-100 hover:text-gold transition-colors font-medium">
              טבלת ניקוד
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className="text-blue-100 hover:text-gold transition-colors font-medium">
                ניהול
              </Link>
            )}
            {isStaff && (
              <Link to="/manage/teams" className="text-blue-100 hover:text-gold transition-colors font-medium">
                ניהול משותף
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="text-blue-100 hover:text-gold transition-colors font-medium">
                אזור אישי
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-navy-600/50 text-blue-100 transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{user?.name}</span>
                  {user?.role === 'admin' && (
                    <Badge variant="rank-1" className="text-[10px]">מנהל</Badge>
                  )}
                  {user?.role === 'judge' && (
                    <Badge variant="info" className="text-[10px]">שופט</Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Logout"
                  className="text-blue-100 hover:bg-navy-600/50"
                >
                  <LogOut size={18} />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button variant="cta" size="sm">התחבר</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="p-2 md:hidden text-white"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pt-4 pb-2 animate-fade-in">
            <nav className="flex flex-col gap-3">
              <Link
                to="/"
                className="px-3 py-2 text-blue-100 hover:text-gold transition-colors font-medium rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                ראשי
              </Link>
              <Link
                to="/tournaments"
                className="px-3 py-2 text-blue-100 hover:text-gold transition-colors font-medium rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                טורנירים
              </Link>
              <Link
                to="/rankings"
                className="px-3 py-2 text-blue-100 hover:text-gold transition-colors font-medium rounded-lg"
                onClick={() => setIsMenuOpen(false)}
              >
                טבלת ניקוד
              </Link>
              {isAuthenticated && user?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="px-3 py-2 text-blue-100 hover:text-gold transition-colors font-medium rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ניהול
                </Link>
              )}
              {isStaff && (
                <Link
                  to="/manage/teams"
                  className="px-3 py-2 text-blue-100 hover:text-gold transition-colors font-medium rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ניהול משותף
                </Link>
              )}
              {isAuthenticated && (
                <Link
                  to="/dashboard"
                  className="px-3 py-2 text-blue-100 hover:text-gold transition-colors font-medium rounded-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  אזור אישי
                </Link>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-navy-600/50">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-lg hover:bg-navy-600/50 text-blue-100 transition-colors"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>

                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{user?.name}</span>
                    {user?.role === 'admin' && (
                      <Badge variant="rank-1" className="text-[10px]">מנהל</Badge>
                    )}
                    {user?.role === 'judge' && (
                      <Badge variant="info" className="text-[10px]">שופט</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      aria-label="Logout"
                      className="text-blue-100 hover:bg-navy-600/50"
                    >
                      <LogOut size={20} />
                    </Button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button variant="cta" size="sm">התחבר</Button>
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
