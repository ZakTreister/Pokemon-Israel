import TeacherTeams from './TeacherTeams';
import InterTeamManagePage from './InterTeamManagePage';
import LiveClubTournaments from './LiveClubTournaments';
import ActiveInterTeamMeetings from './ActiveInterTeamMeetings';
import LegacyTournamentManagementPage from '../LegacyTournamentManagementPage';
import { useState } from 'react';
import {
  Routes,
  Route,
  Link,
  Navigate,
  useLocation,
  useParams,
} from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAppSelector } from '../../hooks/redux';
import Button from '../../components/ui/Button';
import ManageTeams from './ManageTeams';
import ManageBadges from './ManageBadges';
import ManageTournaments from './ManageTournaments';
import ManageEvents from './ManageEvents';
import ManageEventPage from './ManageEventPage';
import ManageGallery from './ManageGallery';
import ManageContentPages from './ManageContentPages';
import AdminTournaments from '../admin/AdminTournaments';
import AdminUsers from '../admin/AdminUsers';
import AdminOverview from '../admin/AdminOverview';
import AdminUpdates from '../admin/AdminUpdates';
import AdminDecks from '../admin/AdminDecks';
import AdminPlayers from '../admin/AdminPlayers';
import TeamPage from '../TeamPage';
import InternalTournamentPage from './InternalTournamentPage';
import ClubTournamentLaunchPage from './ClubTournamentLaunchPage';
import InternalTournamentsPage from './InternalTournamentsPage';
import HistoricalTournamentPage from './HistoricalTournamentPage';
export function LegacyAdminRedirect() {
  const location = useLocation();
  return (
    <Navigate
      replace
      to={`${location.pathname.replace(/^\/admin/, '/manage').replace('/seasons', '/badges')}${location.search}${location.hash}`}
    />
  );
}
function LegacyInternalRedirect() {
  const location = useLocation();
  const team = new URLSearchParams(location.search).get('teamId');
  return (
    <Navigate
      replace
      to={team ? `/manage/teams/${team}/history` : '/manage/tournaments'}
    />
  );
}
function LegacyTournamentRedirect() {
  const { id } = useParams();
  return <Navigate replace to={`/manage/tournaments/${id}`} />;
}
function LegacyHistoricalRedirect() {
  const location = useLocation();
  const team = new URLSearchParams(location.search).get('teamId');
  return (
    <Navigate
      replace
      to={team ? `/manage/teams/${team}/historical` : '/manage/teams'}
    />
  );
}
export default function ManageDashboardPage() {
  const { user } = useAppSelector((state) => state.auth);
  const admin = user?.role === 'admin';
  const location = useLocation();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === location.pathname;
  const links = [
    ['', 'סקירה כללית'],
    ['teams', 'נבחרות All-Stars'],
    ['tournaments', 'טורנירים'],
    ...(admin ? [['events', 'אירועים'],['content-pages','עמודי תוכן'],['gallery','גלריה']] : []),
    ...(admin
      ? [
          ['players', 'שחקנים'],
          ['users', 'משתמשים'],
          ['updates', 'עדכונים'],
          ['decks', 'דקים'],
          ['badges', 'תגים'],
        ]
      : []),
  ];
  const teamParent = location.pathname
    .split('/')
    .filter(Boolean)
    .slice(0, 3)
    .join('/');
  const interTeamOperation = /^\/manage\/inter-team\/[^/]+\/?$/.test(location.pathname);
  // Individual tournament workspaces are not wrapped in the dashboard card:
  // their match cards need the available width, as in regular round management.
  const tournamentOperation =
    interTeamOperation ||
    /^\/manage\/tournaments\/(?!regular(?:\/|$))[^/]+\/?$/.test(
      location.pathname,
    );
  const nested = location.pathname.split('/').filter(Boolean).length > 2;
  return (
    <div className="cs-workspace cs-management">
      <div className="container py-6">
        <div
          className={`flex items-center justify-between ${tournamentOperation ? 'mb-3' : 'mb-6'}`}
        >
          <h1
            className={
              tournamentOperation ? 'sr-only' : 'text-3xl font-extrabold'
            }
          >
            ניהול
          </h1>
          {tournamentOperation && (
            <Button asChild variant="outline">
              <Link to={interTeamOperation ? '/manage' : '/manage/tournaments'}>
                {interTeamOperation ? '→ חזרה לדשבורד' : '→ חזרה לטורנירים'}
              </Link>
            </Button>
          )}
          <Button
            contextual
            className="lg:hidden"
            variant="outline"
            size="icon"
            aria-label="פתח תפריט ניהול"
            aria-expanded={open}
            onClick={() => setOpenPath(open ? null : location.pathname)}
          >
            <Menu size={20} />
          </Button>
        </div>
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav
            aria-label="ניהול"
            className={`${open ? 'block' : 'hidden'} lg:block bg-card border rounded-lg p-3 h-fit shadow-panel`}
          >
            <div className="flex justify-between items-center border-b mb-2">
              <p className="font-bold p-3">
                {user?.name} · {admin ? 'מנהל' : 'שופט'}
              </p>
              <Button
                className="lg:hidden"
                variant="ghost"
                size="icon"
                aria-label="סגור תפריט ניהול"
                onClick={() => setOpenPath(null)}
              >
                <X size={20} />
              </Button>
            </div>
            {links.map(([path, label]) => {
              const active = path
                ? location.pathname.startsWith(`/manage/${path}`)
                : /^\/manage\/?$/.test(location.pathname);
              return (
                <Link
                  key={path}
                  to={`/manage/${path}`}
                  onClick={() => setOpenPath(null)}
                  aria-current={active ? 'page' : undefined}
                  className={`block px-3 py-2 rounded-md font-bold ${active ? 'bg-navy-700 text-white border-s-4 border-gold' : 'hover:bg-muted'}`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
          <div
            className={
              tournamentOperation
                ? 'min-w-0'
                : 'min-w-0 bg-card border rounded-lg p-4 sm:p-6 shadow-panel'
            }
          >
            {nested && !tournamentOperation && (
              <Button asChild variant="outline" className="mb-5">
                <Link
                  to={
                    location.pathname.startsWith('/manage/teams/')
                      ? location.pathname.split('/').filter(Boolean).length > 3
                        ? `/${teamParent}`
                        : '/manage/teams'
                      : location.pathname.startsWith('/manage/events/') ? '/manage/events' : '/manage/tournaments'
                  }
                >
                  → חזרה ל
                  {location.pathname.startsWith('/manage/teams/')
                    ? location.pathname.split('/').filter(Boolean).length > 3
                      ? 'נבחרת'
                      : 'נבחרות All-Stars'
                    : location.pathname.startsWith('/manage/events/') ? 'אירועים' : 'טורנירים'}
                </Link>
              </Button>
            )}
            <Routes>
              <Route
                index
                element={
                  <>
                    <ActiveInterTeamMeetings />
                    <LiveClubTournaments />
                    {admin && <AdminOverview />}
                    <TeacherTeams />
                  </>
                }
              />
              <Route path="teams" element={<ManageTeams />} />
              <Route path="inter-team/:id" element={<InterTeamManagePage />} />
              <Route path="teams/:id" element={<TeamPage />} />
              <Route
                path="teams/:teamId/history"
                element={<InternalTournamentsPage />}
              />
              <Route
                path="teams/:teamId/historical"
                element={
                  admin ? (
                    <HistoricalTournamentPage />
                  ) : (
                    <Navigate replace to="/manage/teams" />
                  )
                }
              />
              <Route path="tournaments" element={<ManageTournaments />} />
              {admin && <Route path="events" element={<ManageEvents />} />}
              {admin && <Route path="gallery" element={<ManageGallery />} />}
              {admin && <Route path="content-pages" element={<ManageContentPages />} />}
              {admin && <Route path="events/:id" element={<ManageEventPage />} />}
              <Route
                path="tournaments/:id"
                element={<InternalTournamentPage />}
              />
              <Route
                path="internal-tournaments"
                element={<LegacyInternalRedirect />}
              />
              <Route
                path="internal-tournaments/:id"
                element={<LegacyTournamentRedirect />}
              />
              <Route path="historical" element={<LegacyHistoricalRedirect />} />
              <Route
                path="seasons"
                element={<Navigate replace to="/manage/badges" />}
              />
              <Route path="tournaments/regular/:id/rounds" element={<InternalTournamentPage mode="club" />} />
              <Route path="tournaments/regular/:id" element={admin ? <LegacyTournamentManagementPage /> : <ClubTournamentLaunchPage />} />
              {admin && (
                <>
                  <Route
                    path="tournaments/regular/*"
                    element={<AdminTournaments embeddedCreate />}
                  />
                  <Route path="users/*" element={<AdminUsers />} />
                  <Route path="updates/*" element={<AdminUpdates />} />
                  <Route path="decks/*" element={<AdminDecks />} />
                  <Route path="players/*" element={<AdminPlayers />} />
                  <Route path="badges/*" element={<ManageBadges />} />
                </>
              )}
              <Route path="*" element={<Navigate replace to="/manage" />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
}
