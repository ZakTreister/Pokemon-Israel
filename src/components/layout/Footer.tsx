import { Link } from 'react-router-dom';
import {LeagueLogo} from '../../features/siteSettings/LeagueLogo';
import {useSiteSettings} from '../../features/siteSettings/SiteSettingsProvider';
import {navigationPages,TRAILING_PAGES,SOCIAL_PLATFORMS,validSocialUrl} from '../../../shared/siteSettings';
import { Zap, ArrowUpLeft, Mail, Facebook, Instagram, Youtube, Music2, MessageCircle } from 'lucide-react';

export default function Footer() {
  const {settings}=useSiteSettings();
  const fixed=navigationPages(settings,'footer');
  const links=[...fixed.filter(p=>!TRAILING_PAGES.includes(p.to)),{to:'/login',label:'כניסת צוות',construction:false},...fixed.filter(p=>TRAILING_PAGES.includes(p.to))];
  const socials=settings.socials.filter(s=>s.enabled&&s.url&&validSocialUrl(s.key,s.url));
  const icons={facebook:Facebook,instagram:Instagram,youtube:Youtube,tiktok:Music2,whatsapp:MessageCircle};
  const currentYear = new Date().getFullYear();
  return (
    <footer className="relative border-t-4 border-gold bg-navy-700 text-white">
      <div className="container py-10 md:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-3 text-white">
              {!settings.logos?.kids&&!settings.logos?.allStars&&<span className="flex h-10 w-10 items-center justify-center rounded-md bg-gold text-navy-700"><Zap size={23} fill="currentColor"/></span>}
              <span dir="ltr" className="text-2xl font-black">
                CardSchool <span className="text-gold">IL</span>
              </span>
            </Link>
            {(settings.logos?.kids||settings.logos?.allStars)&&<div className="flex flex-wrap items-center gap-4 mb-4"><LeagueLogo league="kids" className="h-16 max-w-[8rem]"/><LeagueLogo league="allStars" className="h-16 max-w-[8rem]"/></div>}
            <p className="max-w-xs text-sm leading-relaxed text-white">
              הבית של ליגת הפוקימון הישראלית. אירועים, נבחרות ודירוגים — כל
              הליגה במקום אחד.
            </p>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">ניווט באתר</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {links.map(({to,label,construction}) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-1 transition-colors hover:text-gold focus-visible:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
                >
                  {label}{construction?' · בהקמה':''}
                  <ArrowUpLeft size={13} />
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h2 className="mb-4 text-sm font-bold text-white">נשארים בקשר</h2>
            <a
              href="mailto:adam@cardschool.co.il"
              className="inline-flex items-center gap-2 text-sm hover:text-gold focus-visible:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
            >
              <Mail size={17} />
              <span dir="ltr">adam@cardschool.co.il</span>
            </a>
            {!!socials.length&&<nav aria-label="רשתות חברתיות" className="mt-4 flex flex-wrap gap-3">{socials.map(s=>{const Icon=icons[s.key];const label=SOCIAL_PLATFORMS.find(p=>p.key===s.key)?.label;return <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="inline-flex size-11 items-center justify-center rounded-full border border-white/40 hover:text-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"><Icon size={21} aria-hidden="true"/></a>;})}</nav>}
            <div aria-hidden="true" className="cs-section-mark mt-5" />
          </div>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-white/15 pt-5 text-xs text-white">
          <p>© {currentYear} CardSchool IL. כל הזכויות שמורות.</p>
          <span dir="ltr" className="font-bold tracking-[.15em]">
            PLAY. COMPETE. CONNECT.
          </span>
        </div>
      </div>
    </footer>
  );
}
