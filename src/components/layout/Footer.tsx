import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-navy-700 text-blue-100">
      <div className="container py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-extrabold mb-4 text-white flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold text-navy-700">
                <Zap size={18} fill="currentColor" />
              </span>
              ליגת הפוקימון
            </h3>
            <p className="text-blue-200/80 text-sm mb-4">
              המערכת לניהול ליגת הפוקימון, מעקב דירוגים ופרופילים של שחקנים
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-white">קישורים מהירים</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-blue-200/80 hover:text-gold transition-colors block">
                  דף הבית
                </Link>
              </li>
              <li>
                <Link to="/tournaments" className="text-blue-200/80 hover:text-gold transition-colors block">
                  טורנירים
                </Link>
              </li>
              <li>
                <Link to="/rankings" className="text-blue-200/80 hover:text-gold transition-colors block">
                  טבלת ניקוד
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-blue-200/80 hover:text-gold transition-colors block">
                  התחברות
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold mb-4 text-white">צור קשר</h3>
            <p className="text-blue-200/80 text-sm">
              אימייל: adam@cardschool.co.il
            </p>
          </div>
        </div>

        <div className="border-t border-navy-600/50 mt-8 pt-6 text-center text-sm text-blue-200/60">
          <p>© {currentYear} פוקימון. כל הזכויות שמורות.</p>
        </div>
      </div>
    </footer>
  );
}
