import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Sun, Moon, Menu as MenuIcon, Trophy } from 'lucide-react';
import { useAppSelector, useAppDispatch } from '../../hooks/redux';
import { logout } from '../../features/auth/authSlice';
import { useTheme } from '../ThemeProvider';
import Button from '../../components/ui/Button';

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

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="container py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link 
              to="/" 
              className="text-2xl font-bold text-primary flex items-center gap-2"
            >
              <span>ליגת הפוקימון</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              ראשי
            </Link>
            <Link to="/tournaments" className="text-foreground hover:text-primary transition-colors">
              טורנירים
            </Link>
            <Link to="/rankings" className="text-foreground hover:text-primary transition-colors">
              טבלת ניקוד
            </Link>
            {isAuthenticated && user?.role === 'admin' && (
              <Link to="/admin" className="text-foreground hover:text-primary transition-colors">
                ניהול
              </Link>
            )}
            {isAuthenticated && (user?.role === 'admin' || user?.role === 'judge') && (
              <Link to="/manage/teams" className="text-foreground hover:text-primary transition-colors">
                ניהול משותף
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/dashboard" className="text-foreground hover:text-primary transition-colors">
                אזור אישי
              </Link>
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>

            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium">
                  {user && user.name}
                  {user?.role === 'admin' && (
                    <span className="mr-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      מנהל
                    </span>
                  )}
                  {user?.role === 'judge' && (
                    <span className="mr-2 text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      שופט
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  aria-label="Logout"
                >
                  <LogOut size={20} />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button className="flex items-center">התחבר</Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="p-2 md:hidden text-foreground"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <MenuIcon size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden pt-4 pb-2 animate-fade-in">
            <nav className="flex flex-col gap-4">
              <Link 
                to="/" 
                className="px-2 py-1.5 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                ראשי
              </Link>
              <Link 
                to="/tournaments" 
                className="px-2 py-1.5 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                טורנירים
              </Link>
              <Link 
                to="/rankings" 
                className="px-2 py-1.5 text-foreground hover:text-primary transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                טבלת ניקוד
              </Link>
              {isAuthenticated && user?.role === 'admin' && (
                <Link 
                  to="/admin" 
                  className="px-2 py-1.5 text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ניהול
                </Link>
              )}
              {isAuthenticated && (user?.role === 'admin' || user?.role === 'judge') && (
                <Link 
                  to="/manage/teams" 
                  className="px-2 py-1.5 text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  ניהול משותף
                </Link>
              )}
              {isAuthenticated && (
                <Link 
                  to="/dashboard" 
                  className="px-2 py-1.5 text-foreground hover:text-primary transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  אזור אישי
                </Link>
              )}
              
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                >
                  {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                </button>
                
                {isAuthenticated ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {user?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                      aria-label="Logout"
                    >
                      <LogOut size={20} />
                    </Button>
                  </div>
                ) : (
                  <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                    <Button size="sm" className="flex items-center">התחבר</Button>
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