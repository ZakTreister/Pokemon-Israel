import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-card border-t border-border">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">ליגת הקיץ של פוקימון</h3>
            <p className="text-muted-foreground mb-4">
              המערכת לניהול ליגת הקיץ של פוקימון, מעקב דירוגים ופרופילים של שחקנים
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
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-bold mb-4">צור קשר</h3>
            <p className="text-muted-foreground">
              אימייל: adam@cardschool.co.il
            </p>
          </div>
        </div>
        
        <div className="border-t border-border mt-8 pt-6 text-center text-sm text-muted-foreground">
          <p>© {currentYear} פוקימון. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  );
}