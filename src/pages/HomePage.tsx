import AllStarsTeamsSection from '../components/teams/AllStarsTeamsSection';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchUpdates } from '../features/updates/updatesSlice';
import {
  getNationalRankings,
  type NationalRanking,
} from '../services/rankings';
import { requestError } from '../utils/requestError';
import { ravMesserUrl } from '../config/publicSite';
import {
  Calendar,
  User,
  Trophy,
  Zap,
  Layers,
  ArrowUpLeft,
  Newspaper,
} from 'lucide-react';
import Button from '../components/ui/Button';
import { SectionHeading } from '../components/ui/SectionHeading';
export default function HomePage() {
  const dispatch = useAppDispatch();
  const {
    tournaments,
    isLoading: tournamentsLoading,
    error: tournamentsError,
  } = useAppSelector((state) => state.tournaments);
  const {
    updates,
    isLoading: updatesLoading,
    error: updatesError,
  } = useAppSelector((state) => state.updates);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [rankings, setRankings] = useState<NationalRanking[] | null>(null);
  const [rankingsError, setRankingsError] = useState('');
  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchUpdates());
  }, [dispatch]);
  useEffect(() => {
    let active = true;
    getNationalRankings()
      .then((data) => {
        if (active) setRankings(data.rankings);
      })
      .catch((e) => {
        if (active) setRankingsError(requestError(e));
      });
    return () => {
      active = false;
    };
  }, []);
  const regular = tournaments.filter((t) => !t.type || t.type === 'quarterly');
  const upcomingTournaments = regular
    .filter(
      (t) =>
        t.status !== 'completed' && new Date(t.date).getTime() > Date.now(),
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const totalTournaments = regular.length;
  const upcomingCount = upcomingTournaments.length;
  const featuredTournament = upcomingTournaments[0];
  const latest = [...updates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )[0];
  return (
    <div>
      {!!updates.length && (
        <aside className="cs-ticker py-3 text-white" aria-label="חדשות הליגה">
          <div className="container flex items-center gap-4">
            <Newspaper size={20} className="shrink-0 text-gold" />
            <strong className="shrink-0">חדשות הליגה</strong>
            <div className="flex gap-8 overflow-x-auto whitespace-nowrap py-1">
              {[...updates]
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .slice(0, 5)
                .map((update) => (
                  <Link
                    key={update.id}
                    className="hover:text-gold"
                    to={`/news/${update.id}`}
                  >
                    {update.title} ←
                  </Link>
                ))}
            </div>
          </div>
        </aside>
      )}
      <section className="relative overflow-hidden bg-hero-navy text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 halftone-dots"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 diagonal-lines"
        />
        <div className="container relative grid items-center gap-2 py-10 sm:py-12 lg:grid-cols-[1.03fr_.97fr] lg:gap-8 lg:py-16">
          <div className="relative z-10 min-w-0">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-cyan/30 bg-navy-700/30 px-3 py-1.5 text-xs font-bold text-blue-100">
              <span
                className="h-2 w-2 rounded-full bg-gold"
                aria-hidden="true"
              />
              <span dir="ltr">CARDSCHOOL IL • POKÉMON TCG</span>
            </div>
            <h1 className="text-5xl font-black leading-[1.08] tracking-tight sm:text-6xl lg:text-7xl">
              המשחק שלך.
              <br />
              <span className="text-gold">הליגה שלנו.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-blue-100 sm:text-lg">
              הבית של ליגת הפוקימון הישראלית. בחר את הטורניר הבא שלך, עקוב אחרי
              הדירוגים ופגוש את הקהילה.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Button asChild variant="cta" size="lg">
                <Link to="/tournaments">
                  לטורניר הבא <ArrowUpLeft className="ms-2 h-5 w-5" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/70 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                <Link to="/rankings">
                  טבלת הדירוג <Trophy className="ms-2 h-4 w-4" />
                </Link>
              </Button>
              {!isAuthenticated && (
                <Link
                  to="/login"
                  className="text-sm font-bold text-blue-100 underline decoration-blue-cyan/50 underline-offset-4 hover:text-gold"
                >
                  כניסת צוות
                </Link>
              )}
            </div>
            <div className="mt-9 flex gap-6 border-t border-white/20 pt-5 sm:gap-9">
              <div>
                <strong className="block text-2xl font-black text-white tabular-nums">
                  {tournamentsLoading || tournamentsError
                    ? '—'
                    : totalTournaments}
                </strong>
                <span className="text-xs text-blue-200">טורנירים בליגה</span>
              </div>
              <div>
                <strong className="block text-2xl font-black text-gold tabular-nums">
                  {tournamentsLoading || tournamentsError ? '—' : upcomingCount}
                </strong>
                <span className="text-xs text-blue-200">טורנירים קרובים</span>
              </div>
              <div>
                <strong className="block text-2xl font-black text-white tabular-nums">
                  {rankings === null || rankingsError
                    ? '—'
                    : (rankings?.length ?? 0)}
                </strong>
                <span className="text-xs text-blue-200">שחקנים מדורגים</span>
              </div>
            </div>
          </div>
          <HeroArtwork />
        </div>
      </section>
      <AllStarsTeamsSection />
      <section className="bg-section-light py-12">
        <div className="container">
          <SectionHeading
            title="מובילי הליגה הישראלית"
            subtitle="דירוג שחקני החוגים המצטבר מכל שנות הפעילות"
            icon={<Trophy size={20} />}
          />
          {rankingsError && (
            <p role="alert" className="text-destructive">
              {rankingsError}
            </p>
          )}
          {rankings === null ? (
            <p>טוען דירוג...</p>
          ) : !rankings.length ? (
            <p className="text-muted-foreground">
              הדירוג יופיע לאחר פרסום תוצאות טורנירי החוגים.
            </p>
          ) : (
            <div className="border rounded-lg bg-card shadow-panel overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-navy-700 text-white">
                  <tr>
                    {['מקום', 'שחקן', 'נקודות', 'טורנירים'].map((h) => (
                      <th className="p-4" key={h}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankings.slice(0, 8).map((row) => (
                    <tr className="border-t" key={row.playerId}>
                      <td className="p-4 font-bold">{row.position}</td>
                      <td className="p-4 font-bold">{row.playerName}</td>
                      <td className="p-4 text-blue-500 font-extrabold">
                        {row.points}
                      </td>
                      <td className="p-4">{row.tournaments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Button asChild variant="outline" className="mt-6">
            <Link to="/rankings">לטבלת הליגה הישראלית המלאה ←</Link>
          </Button>
        </div>
      </section>
      {featuredTournament && (
        <section className="py-12 md:py-14">
          <div className="container">
            <div className="cs-public-card relative overflow-hidden bg-feature p-6 text-white shadow-card-hover sm:p-8 md:p-10">
              <div
                aria-hidden="true"
                className="absolute inset-0 halftone-dots opacity-50"
              />
              <div className="relative grid items-center gap-6 md:grid-cols-[1.4fr_1fr]">
                <div>
                  <p className="mb-3 flex items-center gap-2 text-xs font-bold text-blue-cyan">
                    <Calendar size={16} /> האירוע הבא בליגה
                  </p>
                  <h2 className="text-3xl font-black sm:text-4xl">
                    {featuredTournament.title}
                  </h2>
                  <p className="mt-3 text-blue-100">
                    {new Date(featuredTournament.date).toLocaleDateString(
                      'he-IL',
                    )}{' '}
                    · {featuredTournament.location}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-4">
                    <Button asChild variant="cta">
                      <Link to={`/tournaments/${featuredTournament.id}`}>
                        פרטים והרשמה
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      className="border-white/60 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    >
                      <Link to="/tournaments">כל אירועי הליגה</Link>
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-5 border-s-4 border-gold ps-5">
                  <Trophy className="h-16 w-16 shrink-0 text-gold" />
                  <div>
                    <p className="text-xs font-bold text-blue-200">
                      פרסים בטורניר
                    </p>
                    <p className="mt-2 text-xl font-extrabold">
                      {featuredTournament.prizePool}
                    </p>
                    <p className="mt-2 text-sm text-blue-100">
                      {featuredTournament.currentParticipants} /{' '}
                      {featuredTournament.maxParticipants} משתתפים
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {!featuredTournament && (
        <section className="container py-8">
          <h2 className="text-2xl font-bold mb-3">אירוע החוגים הבא</h2>
          {tournamentsError ? (
            <p role="alert">{tournamentsError}</p>
          ) : (
            <p className="text-muted-foreground">
              {tournamentsLoading
                ? 'טוען אירועים...'
                : 'האירוע הבא יופיע כאן כשיפורסם.'}
            </p>
          )}
          <Link className="text-blue-500 font-bold" to="/tournaments">
            לכל האירועים והארכיון ←
          </Link>
        </section>
      )}
      <section className="bg-navy-700 py-12">
        <div className="container grid gap-5 md:grid-cols-2">
          <article className="cs-public-card p-6 sm:p-8 border-t-4 border-t-gold">
            <p className="text-blue-500 font-bold mb-3">מצטרפים לקהילה</p>
            <h2 className="text-2xl font-extrabold mb-4">
              הרשמה לחוג הקרוב לביתכם
            </h2>
            <p className="text-muted-foreground mb-6">
              מצאו את החוג הקרוב והצטרפו למשחק, ללמידה ולקהילה.
            </p>
            {ravMesserUrl ? (
              <Button asChild variant="cta">
                <a
                  href={ravMesserUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  להרשמה לחוג ←
                </a>
              </Button>
            ) : (
              <Button variant="cta" disabled>
                קישור ההרשמה יעודכן בקרוב
              </Button>
            )}
          </article>
          <article className="cs-public-card p-6 sm:p-8 border-t-4 border-t-blue-500">
            <p className="text-blue-500 font-bold mb-3">העדכון האחרון</p>
            {updatesError && <p role="alert">{updatesError}</p>}
            {latest ? (
              <>
                <h2 className="text-2xl font-extrabold mb-3">{latest.title}</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  {new Date(latest.date).toLocaleDateString('he-IL')}
                </p>
                <p className="text-muted-foreground mb-6 line-clamp-3">
                  {latest.content}
                </p>
                <Button asChild>
                  <Link to={`/news/${latest.id}`}>לעדכון המלא ←</Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                {updatesLoading
                  ? 'טוען עדכונים...'
                  : 'העדכון הבא יופיע כאן לאחר פרסומו.'}
              </p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}

function HeroArtwork() {
  return (
    <div className="cs-hero-art" aria-hidden="true">
      <div className="cs-orbit" />
      <div className="cs-hero-lightning absolute start-[8%] top-[6%] h-32 w-14 rotate-12 bg-gold" />
      <div className="cs-hero-lightning absolute end-[7%] bottom-[8%] h-24 w-10 rotate-12 bg-gold" />
      <div className="cs-trading-card cs-trading-card-back">
        <div className="flex justify-between text-[10px] font-black">
          <span>STRATEGY</span>
          <Zap size={14} className="text-gold" />
        </div>
        <div className="cs-card-art">
          <Layers className="relative h-20 w-20 text-blue-cyan" />
        </div>
        <div className="text-center text-sm font-black text-white">
          כל קלף קובע.
        </div>
        <div className="mx-auto mt-3 h-1 w-20 bg-gold" />
      </div>
      <div className="cs-trading-card cs-trading-card-front">
        <div className="flex justify-between text-[10px] font-black">
          <span>COMMUNITY</span>
          <User size={14} className="text-gold" />
        </div>
        <div className="cs-card-art">
          <Trophy className="relative h-20 w-20 text-gold" />
        </div>
        <div className="text-center text-sm font-black text-white">
          משחקים ביחד.
        </div>
        <div className="mx-auto mt-3 h-1 w-20 bg-gold" />
      </div>
      <div className="cs-trading-card cs-trading-card-main">
        <div className="flex items-center justify-between text-[10px] font-black">
          <span dir="ltr">CARDSCHOOL IL</span>
          <Zap size={14} className="text-gold" fill="currentColor" />
        </div>
        <div className="cs-card-art">
          <div className="cs-pokeball" />
        </div>
        <p className="text-center text-base font-black text-white">
          נפגשים בליגה.
        </p>
        <p
          dir="ltr"
          className="mt-2 text-center text-[9px] font-bold tracking-[.16em] text-blue-200"
        >
          POKÉMON TRADING CARD GAME
        </p>
      </div>
      <img
        src="/pokemon_kids_logo.png"
        alt=""
        className="absolute bottom-1 left-1/2 h-9 max-w-40 -translate-x-1/2 rounded bg-white/95 px-2 object-contain sm:h-10"
      />
    </div>
  );
}
