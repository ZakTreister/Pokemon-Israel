import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-card border-t border-border">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">פוקימון טורנירים</h3>
            <p className="text-muted-foreground mb-4">
              המערכת המובילה לניהול תחרויות פוקימון, מעקב דירוגים ופרופילים של שחקנים.
            </p>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">קישורים מהירים</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-primary transition-colors block">
                  דף הבית
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-muted-foreground hover:text-primary transition-colors block">
                  טורנירים
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors block">
                  התחברות
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-muted-foreground hover:text-primary transition-colors block">
                  הרשמה
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">צור קשר</h3>
            <p className="text-muted-foreground">
              אימייל: info@pokemon-tournaments.com
            </p>
            <p className="text-muted-foreground">
              טלפון: 03-1234567
            </p>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {currentYear} פוקימון טורנירים. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  );
}