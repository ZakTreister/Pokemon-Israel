import { requestError } from '../utils/requestError';
import type { Tournament } from '../types/tournament';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournamentById, registerForTournament, unregisterFromTournament, clearError } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Calendar, MapPin, User, Trophy, Medal, Award } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import type { Deck } from '../types/deck';
import { TournamentParticipant } from '../types/tournament';
import api from '../services/api';
import { useToast } from '../components/ui/ToastProvider';
import { useConfirm } from '../components/ui/ConfirmProvider';
import ClubTournamentEditDialog from '../features/tournaments/components/ClubTournamentEditDialog';
import ClubTournamentStartAction from '../features/tournaments/components/ClubTournamentStartAction';
import ClubParticipantsManager from '../features/tournaments/components/ClubParticipantsManager';
import { clubDateKey, clubRegistrationOpen, isClubTournament } from '../../shared/tournamentDomain';

export default function LegacyTournamentManagementPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { activeTournament: publicTournament, isLoading, error } = useAppSelector((state) => state.tournaments);
  const [managedTournament, setManagedTournament] = useState<Tournament | null>(null);
  const [managedLoading, setManagedLoading] = useState(false);
  const [managedError, setManagedError] = useState('');
  const { decks } = useAppSelector((state) => state.decks);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [editingTournament, setEditingTournament] = useState(false);

  const isAdmin = user?.role === 'admin';
  // Public tournament responses deliberately omit child/registration details.
  // The management page must load the authorized full DTO instead.
  const activeTournament = isAdmin ? managedTournament : publicTournament;
  useEffect(() => {
    if (!id || !isAdmin) return;
    let active = true;
    setManagedTournament(null);
    setManagedLoading(true);
    setManagedError('');
    api.get<Tournament>(`/api/tournaments/management/legacy/${id}`)
      .then(({ data }) => {
        if (active) setManagedTournament(data);
      })
      .catch(e => {
        if (active) setManagedError(requestError(e));
      })
      .finally(() => { if (active) setManagedLoading(false); });
    return () => { active = false; };
  }, [id, isAdmin]);

  useEffect(() => {
    if (id) {
      dispatch(fetchTournamentById(id));
    }
    dispatch(fetchDecks());

    // Cleanup
    return () => {
      dispatch(clearError());
    };
  }, [dispatch, id]);

  // Helper function to check if user is registered
  const isUserRegistered = () => {
    if (!isAuthenticated || !user || !activeTournament) return false;

    return activeTournament.participants.some((participant: TournamentParticipant) => {
      // Handle both populated and non-populated participant data
      if (typeof participant.user === 'string') {
        return participant.user === user.id;
      } else if (participant.user && typeof participant.user === 'object') {
        return participant.user._id === user.id || participant.user.id === user.id;
      }
      return false;
    });
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/tournaments/${id}` } });
      return;
    }

    if (id) {
      await dispatch(registerForTournament(id));
    }
  };

  const handleUnregister = async () => {
    if (!isAuthenticated || !id) return;

    const confirmed = await showConfirm({
      title: 'ביטול הרשמה',
      message: 'האם אתה בטוח שברצונך לבטל את ההרשמה לטורניר?',
      confirmText: 'בטל הרשמה',
      cancelText: 'חזור',
      variant: 'destructive',
    });
    if (confirmed) {
      await dispatch(unregisterFromTournament(id));
    }
  };

  // Helper function to get deck information with icons
  const getDeckInfo = (deckData: Deck | string | null | undefined) => {
    if (!deckData) return { name: '-', icons: [] };

    // If deckData is populated (object), use it directly
    if (typeof deckData === 'object' && deckData.archetype) {
      const icons = [];
      if (deckData.iconImage1) icons.push(deckData.iconImage1);
      if (deckData.iconImage2) icons.push(deckData.iconImage2);

      return {
        name: deckData.archetype,
        icons: icons,
        attackerImages: [deckData.attackerImage1, deckData.attackerImage2].filter(Boolean)
      };
    }

    // If deckData is just an ID (string), try to find it in the decks array
    if (typeof deckData === 'string') {
      const deck = decks.find(d => d.id === deckData);
      if (deck) {
        const icons = [];
        if (deck.iconImage1) icons.push(deck.iconImage1);
        if (deck.iconImage2) icons.push(deck.iconImage2);

        return {
          name: deck.archetype,
          icons: icons,
          attackerImages: [deck.attackerImage1, deck.attackerImage2].filter(Boolean)
        };
      }
    }

    return { name: 'לא ידוע', icons: [] };
  };

  // Helper function to get position icon
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-gold-600" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  // Helper function to get unique key for results
  const getResultKey = (result: { player?: string | { _id?: string; id?: string }; position: number; playerName?: string }, index: number) => {
    // Try to get player ID first
    if (typeof result.player === 'string') {
      return result.player;
    } else if (result.player && typeof result.player === 'object') {
      return result.player._id || result.player.id || `result-${index}`;
    }
    // Fallback to position + player name + index
    return `${result.position}-${result.playerName || 'unknown'}-${index}`;
  };

  if (isLoading || (isAdmin && managedLoading)) {
    return (
      <div className="container py-16">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse text-muted-foreground">טוען פרטי טורניר...</div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-foreground mb-4">{managedError || 'טורניר לא נמצא'}</h1>
          <p className="text-muted-foreground mb-6">
            הטורניר המבוקש לא נמצא במערכת.
          </p>
          <Button variant="outline" onClick={() => navigate('/tournaments')}>
            חזרה לרשימת הטורנירים
          </Button>
        </div>
      </div>
    );
  }

  const clubTournament = isClubTournament(activeTournament);
  const isFull = !clubTournament && activeTournament.maxParticipants != null &&
    activeTournament.currentParticipants >= activeTournament.maxParticipants;
  const isRegistrationClosed = clubTournament
    ? !clubRegistrationOpen(activeTournament)
    : new Date(activeTournament.registrationDeadline) < new Date();
  const userRegistered = isUserRegistered();
  const isPastTournament = activeTournament.status === 'completed' ||
    (clubTournament
      ? clubDateKey(activeTournament.date) < clubDateKey(new Date())
      : new Date(activeTournament.date) < new Date());
  const hasResults = activeTournament.results && activeTournament.results.length > 0;

  return (
    <div className={`container py-8 md:py-12 ${isAdmin ? 'cs-workspace' : ''}`}>
      {isAdmin && clubTournament && editingTournament && (
        <ClubTournamentEditDialog
          tournament={activeTournament}
          onClose={() => setEditingTournament(false)}
          onSaved={() => {
            setEditingTournament(false);
            if (id) {
              void dispatch(fetchTournamentById(id));
              void api.get<Tournament>(`/api/tournaments/management/legacy/${id}`)
                .then(({ data }) => setManagedTournament(data));
            }
            showToast('הטורניר עודכן בהצלחה', 'success');
          }}
        />
      )}
      {/* Admin View - No Banner */}
      {isAdmin ? (
        <div className="space-y-8">
          {/* Tournament Header */}
          <div className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <h1 className="text-3xl font-extrabold text-foreground">{activeTournament.title}</h1>
              {clubTournament && <Button variant="outline" onClick={() => setEditingTournament(true)}>עריכת טורניר</Button>}
            </div>
            <p className="text-muted-foreground mb-4">{activeTournament.description}</p>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">תאריך</p>
                  <p className="font-bold text-foreground">{new Date(activeTournament.date).toLocaleDateString('he-IL')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">מיקום</p>
                  <p className="font-bold text-foreground">{activeTournament.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">משתתפים</p>
                  <p className="font-bold text-foreground">{activeTournament.currentParticipants}{!clubTournament && ` / ${activeTournament.maxParticipants}`}</p>
                </div>
              </div>
            </div>
          </div>

          {clubTournament && <ClubTournamentStartAction tournament={activeTournament} />}

          {/* Tournament Results */}
          {hasResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  <span>תוצאות הטורניר</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                  {/* Desktop Results Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-navy-700 text-right">
                          <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מיקום</th>
                          <th className="px-4 py-3.5 text-sm font-bold text-blue-100">שחקן</th>
                          <th className="px-4 py-3.5 text-sm font-bold text-blue-100">נקודות</th>
                          <th className="px-4 py-3.5 text-sm font-bold text-blue-100">דק</th>
                          <th className="px-4 py-3.5"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...activeTournament.results]
                          .sort((a, b) => a.position - b.position)
                          .map((result, index) => {
                            const deckInfo = getDeckInfo(result.deck);
                            return (
                              <tr key={getResultKey(result, index)} className="border-b border-border hover:bg-muted/50 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-foreground">{result.position}</span>
                                    {getPositionIcon(result.position)}
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-bold text-foreground">{result.playerName}</td>
                                <td className="px-4 py-3"><span className="text-lg font-extrabold text-blue-500">{result.points}</span></td>
                                <td className="px-4 py-3 text-sm">{deckInfo.name}</td>
                                <td className="px-4 py-3">
                                  {deckInfo.icons.length > 0 && (
                                    <div className="flex gap-1">
                                      {deckInfo.icons.map((icon, iconIndex) => (
                                        <div
                                          key={iconIndex}
                                          className="w-6 h-6 rounded overflow-hidden flex-shrink-0"
                                        >
                                          <img
                                            src={icon}
                                            alt={`${deckInfo.name} icon ${iconIndex + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Results Cards */}
                  <div className="md:hidden space-y-4">
                    {[...activeTournament.results]
                      .sort((a, b) => a.position - b.position)
                      .map((result, index) => {
                        const deckInfo = getDeckInfo(result.deck);
                        return (
                          <Card key={getResultKey(result, index)} className="p-4">
                            <div className="space-y-3">
                              {/* Position and Player */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl font-bold text-primary">#{result.position}</span>
                                  {getPositionIcon(result.position)}
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-lg">{result.playerName}</div>
                                  <div className="text-sm text-muted-foreground">נקודות: {result.points}</div>
                                </div>
                              </div>

                              {/* Deck Info */}
                              <div className="flex justify-between items-center pt-3 border-t border-border">
                                <span className="text-sm text-muted-foreground">דק</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{deckInfo.name}</span>
                                  {deckInfo.icons.length > 0 && (
                                    <div className="flex gap-1">
                                      {deckInfo.icons.map((icon, iconIndex) => (
                                        <div
                                          key={iconIndex}
                                          className="w-6 h-6 rounded overflow-hidden flex-shrink-0"
                                        >
                                          <img
                                            src={icon}
                                            alt={`${deckInfo.name} icon ${iconIndex + 1}`}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                            }}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                  </div>
              </CardContent>
            </Card>
          )}

          {clubTournament && id && (
            <ClubParticipantsManager
              tournamentId={id}
              onChanged={() => {
                void api.get<Tournament>(`/api/tournaments/management/legacy/${id}`)
                  .then(({ data }) => setManagedTournament(data));
              }}
            />
          )}
        </div>
      ) : (
        /* Regular User View - With Banner */
        <div className="grid min-w-0 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
          {/* Main Content */}
          <div>
            <div className="cs-public-card relative overflow-hidden h-[280px] sm:h-[340px] mb-8 bg-hero-navy shadow-card-hover">
              <img
                src={activeTournament.image}
                alt={activeTournament.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-800/90 via-navy-700/40 to-transparent flex flex-col justify-end p-6">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
                  {activeTournament.title}
                </h1>
                <div className="flex flex-wrap items-center text-white gap-2 text-sm">
                  <Calendar size={18} className="text-gold" />
                  <span>{new Date(activeTournament.date).toLocaleDateString('he-IL')}</span>
                  <span className="mx-2">•</span>
                  <MapPin size={18} className="text-gold" />
                  <span>{activeTournament.location}</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-extrabold text-foreground mb-4">פרטי הטורניר</h2>
              <p className="mb-6 text-muted-foreground leading-relaxed">{activeTournament.description}</p>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5 mb-6">
                <div className="cs-stat relative flex min-w-0 flex-col items-start gap-3 p-4 rounded-md bg-card shadow-panel border border-border sm:flex-row">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">תאריך</p>
                    <p className="font-bold text-foreground">{new Date(activeTournament.date).toLocaleDateString('he-IL')}</p>
                  </div>
                </div>

                <div className="cs-stat relative flex min-w-0 flex-col items-start gap-3 p-4 rounded-md bg-card shadow-panel border border-border sm:flex-row">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <MapPin className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">מיקום</p>
                    <p className="font-bold text-foreground">{activeTournament.location}</p>
                  </div>
                </div>

                <div className="cs-stat relative flex min-w-0 flex-col items-start gap-3 p-4 rounded-md bg-card shadow-panel border border-border sm:flex-row">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <User className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">משתתפים</p>
                    <p className="font-bold text-foreground">{activeTournament.currentParticipants}{!clubTournament && ` / ${activeTournament.maxParticipants}`}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Results Section for Regular Users */}
            {hasResults && (
              <div className="mb-8">
                <h2 className="text-2xl font-extrabold text-foreground mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-gold-600" />
                  <span>תוצאות הטורניר</span>
                </h2>

                {/* Desktop Results Table */}
                <div className="hidden md:block">
                  <Card className="overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-navy-700 text-right">
                            <th className="px-4 py-3.5 text-sm font-bold text-blue-100">מיקום</th>
                            <th className="px-4 py-3.5 text-sm font-bold text-blue-100">שחקן</th>
                            <th className="px-4 py-3.5 text-sm font-bold text-blue-100">נקודות</th>
                            <th className="px-4 py-3.5 text-sm font-bold text-blue-100">דק</th>
                            <th className="px-4 py-3.5"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...activeTournament.results]
                            .sort((a, b) => a.position - b.position)
                            .map((result, index) => {
                              const deckInfo = getDeckInfo(result.deck);
                              return (
                                <tr key={getResultKey(result, index)} className="border-b border-border hover:bg-muted/50 transition-colors">
                                  <td className="px-4 py-3">
                                    <div className="flex items-center gap-2">
                                      <span className="font-extrabold text-foreground">{result.position}</span>
                                      {getPositionIcon(result.position)}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 font-bold text-foreground">{result.playerName}</td>
                                  <td className="px-4 py-3"><span className="text-lg font-extrabold text-blue-500">{result.points}</span></td>
                                  <td className="px-4 py-3 text-sm">{deckInfo.name}</td>
                                  <td className="px-4 py-3">
                                    {deckInfo.icons.length > 0 && (
                                      <div className="flex gap-1">
                                        {deckInfo.icons.map((icon, iconIndex) => (
                                          <div
                                            key={iconIndex}
                                            className="h-6 rounded overflow-hidden flex-shrink-0"
                                          >
                                            <img
                                              src={icon}
                                              alt={`${deckInfo.name} icon ${iconIndex + 1}`}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                              }}
                                            />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile Results Cards */}
                <div className="md:hidden space-y-4">
                  {[...activeTournament.results]
                    .sort((a, b) => a.position - b.position)
                    .map((result, index) => {
                      const deckInfo = getDeckInfo(result.deck);
                      return (
                        <Card key={getResultKey(result, index)} className="p-4">
                          <div className="space-y-3">
                            {/* Position and Player */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="text-2xl font-bold text-primary">#{result.position}</span>
                                {getPositionIcon(result.position)}
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-lg">{result.playerName}</div>
                                <div className="text-sm text-muted-foreground">נקודות: {result.points}</div>
                              </div>
                            </div>

                            {/* Deck Info */}
                            <div className="flex justify-between items-center pt-3 border-t border-border">
                              <span className="text-sm text-muted-foreground">דק</span>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{deckInfo.name}</span>
                                {deckInfo.icons.length > 0 && (
                                  <div className="flex gap-1">
                                    {deckInfo.icons.map((icon, iconIndex) => (
                                      <div
                                        key={iconIndex}
                                        className="h-6 rounded overflow-hidden flex-shrink-0"
                                      >
                                        <img
                                          src={icon}
                                          alt={`${deckInfo.name} icon ${iconIndex + 1}`}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div>
            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>
                  {userRegistered ? 'אתה רשום לטורניר' : 'הרשמה לטורניר'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">סטטוס</span>
                    <span className="font-medium">
                      {isPastTournament ? 'הסתיים' : 'קרוב'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">משתתפים</span>
                    <span className="font-medium">
                      {activeTournament.currentParticipants}{!clubTournament && ` / ${activeTournament.maxParticipants}`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-muted-foreground">הרשמה עד</span>
                    <span className="font-medium">
                      {new Date(activeTournament.registrationDeadline).toLocaleDateString('he-IL')}
                    </span>
                  </div>

                  {userRegistered && (
                    <div className="p-3 rounded-md bg-success/10 text-success text-sm">
                      ✓ אתה רשום לטורניר זה!
                    </div>
                  )}

                  {error && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  )}

                  <div className="pt-4 space-y-2">
                    {userRegistered ? (
                      <Button
                        className="w-full"
                        variant="destructive"
                        disabled={isPastTournament || isLoading}
                        onClick={handleUnregister}
                      >
                        {isLoading ? 'מבטל הרשמה...' : 'בטל הרשמה'}
                      </Button>
                    ) : (
                      <Button
                        variant="cta"
                        className="w-full"
                        disabled={
                          isPastTournament ||
                          isFull ||
                          isRegistrationClosed ||
                          isLoading
                        }
                        onClick={handleRegister}
                      >
                        {isLoading
                          ? 'מבצע רישום...'
                          : !isAuthenticated
                          ? 'כניסת צוות להרשמה'
                          : isPastTournament
                          ? 'הטורניר הסתיים'
                          : isFull
                          ? 'הטורניר מלא'
                          : isRegistrationClosed
                          ? 'ההרשמה נסגרה'
                          : 'הרשם לטורניר'}
                      </Button>
                    )}

                    {!isAuthenticated && (
                      <p className="text-sm text-muted-foreground text-center">
                        להרשמה פנו לצוות. ילדים אינם נדרשים לחשבון התחברות.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
}
