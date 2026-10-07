import { Link } from 'react-router-dom';
import { Zap, ArrowUpLeft, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="relative border-t-4 border-gold bg-navy-700 text-blue-100">
      <div className="container py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-3 text-white">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-gold text-navy-700">
                <Zap size={23} fill="currentColor" />
              </span>
              <span dir="ltr" className="text-2xl font-black">
                CardSchool <span className="text-gold">IL</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-blue-200">
              הבית של ליגת הפוקימון הישראלית. אירועים, נבחרות ודירוגים
              — כל הליגה במקום אחד.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">על המגרש</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ['/', 'דף הבית'],
                ['/tournaments', 'אירועים'],
                ['/rankings', 'הליגה הישראלית'],
                ['/all-stars', 'All Stars'],
                ['/news', 'חדשות'],
                ['/store', 'חנות · בהקמה'],
                ['/about', 'על הליגה · בהקמה'],
                ['/birthday', 'הזמנת יום הולדת · בהקמה'],
                ['/login', 'כניסת צוות'],
              ].map(([to, label]) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1 transition-colors hover:text-gold"
                >
                  {label}
                  <ArrowUpLeft size={13} />
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">נשארים בקשר</h2>
            <a
              href="mailto:adam@cardschool.co.il"
              className="inline-flex items-center gap-2 text-sm hover:text-gold"
            >
              <Mail size={17} />
              <span dir="ltr">adam@cardschool.co.il</span>
            </a>
            <div aria-hidden="true" className="cs-section-mark mt-5" />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs text-blue-200">
          <p>© {currentYear} CardSchool IL. כל הזכויות שמורות.</p>
          <span dir="ltr" className="font-bold tracking-[.15em]">
            PLAY. COMPETE. CONNECT.
          </span>
        </div>
      </div>
    </footer>
  );
}
