import { TRIAL_REGISTRATION_URL, isPublicPage } from '../../config/publicSite';
import { useLocation } from 'react-router-dom';
import Button from '../ui/Button';

export default function FloatingTrialCTA() {
  const { pathname } = useLocation();
  if (!isPublicPage(pathname)) return null;
  return (
    <aside
      className="fixed bottom-3 left-3 z-20 flex justify-end pointer-events-none"
      aria-label="הרשמה לשיעור ניסיון"
    >
      <Button
        asChild
        variant="cta"
        className="pointer-events-auto h-auto min-h-11 gap-2 rounded-xl border-2 border-navy-700 px-3 py-2 whitespace-normal"
      >
        <a
          href={TRIAL_REGISTRATION_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="/pokemon_kids_logo.png"
            alt="CardSchool"
            className="h-9 w-9 object-contain"
          />
          הירשמו לשיעור ניסיון
        </a>
      </Button>
    </aside>
  );
}
