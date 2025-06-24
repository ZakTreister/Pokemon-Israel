import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournamentById, registerForTournament, unregisterFromTournament, clearError } from '../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../features/decks/decksSlice';
import { Calendar, MapPin, User, Clock, Trash2, UserMinus, UserPlus, Search, Trophy, Medal, Award } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { TournamentParticipant } from '../types/tournament';
import api from '../services/api';

interface AvailableUser {
  id: string;
  name: string;
  username: string;
  role: 'player' | 'admin';
}

export default function TournamentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { activeTournament, isLoading, error } = useAppSelector((state) => state.tournaments);
  const { decks } = useAppSelector((state) => state.decks);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);
  
  // Add user modal states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<AvailableUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [addingUser, setAddingUser] = useState<string | null>(null);

  const isAdmin = user?.role === 'admin';

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

  // Load available users when modal opens
  useEffect(() => {
    if (showAddUserModal && isAdmin) {
      loadAvailableUsers();
    }
  }, [showAddUserModal, isAdmin]);

  // Filter users based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredUsers(availableUsers);
    } else {
      const filtered = availableUsers.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, availableUsers]);

  const loadAvailableUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data } = await api.get('/api/users');
      
      // Filter out users who are already registered for this tournament
      const registeredUserIds = activeTournament?.participants.map(participant => {
        if (typeof participant.user === 'string') {
          return participant.user;
        } else if (participant.user && typeof participant.user === 'object') {
          return participant.user._id || participant.user.id;
        }
        return '';
      }) || [];

      const available = data.filter((user: AvailableUser) => 
        !registeredUserIds.includes(user.id)
      );
      
      setAvailableUsers(available);
      setFilteredUsers(available);
    } catch (error: any) {
      console.error('Error loading users:', error);
      alert('שגיאה בטעינת רשימת המשתמשים');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAddUserToTournament = async (userId: string, userName: string) => {
    try {
      setAddingUser(userId);
      
      // Add user to tournament via API
      await api.post(`/api/tournaments/${id}/participants`, { userId });
      
      // Refresh tournament data
      if (id) {
        dispatch(fetchTournamentById(id));
      }
      
      // Update available users list
      setAvailableUsers(prev => prev.filter(user => user.id !== userId));
      
      alert(`${userName} נוסף לטורניר בהצלחה!`);
      
    } catch (error: any) {
      console.error('Error adding user to tournament:', error);
      alert(error.response?.data?.message || 'שגיאה בהוספת המשתמש לטורניר');
    } finally {
      setAddingUser(null);
    }
  };

  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setSearchQuery('');
    setAvailableUsers([]);
    setFilteredUsers([]);
  };

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
    
    if (window.confirm('האם אתה בטוח שברצונך לבטל את ההרשמה לטורניר?')) {
      await dispatch(unregisterFromTournament(id));
    }
  };

  const handleRemoveParticipant = async (participantId: string, participantName: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך להסיר את ${participantName} מהטורניר?`)) {
      return;
    }

    try {
      setRemovingParticipant(participantId);
      await api.delete(`/api/tournaments/${id}/participants/${participantId}`);
      
      // Refresh tournament data
      if (id) {
        dispatch(fetchTournamentById(id));
      }
      
      alert(`${participantName} הוסר מהטורניר בהצלחה`);
    } catch (error: any) {
      console.error('Error removing participant:', error);
      alert(error.response?.data?.message || 'שגיאה בהסרת המשתתף');
    } finally {
      setRemovingParticipant(null);
    }
  };

  const getParticipantName = (participant: TournamentParticipant) => {
    if (typeof participant.user === 'string') {
      return participant.user;
    } else if (participant.user && typeof participant.user === 'object') {
      return participant.user.username || participant.user._id;
    }
    return 'משתתף לא ידוע';
  };

  const getParticipantId = (participant: TournamentParticipant) => {
    if (typeof participant.user === 'string') {
      return participant.user;
    } else if (participant.user && typeof participant.user === 'object') {
      return participant.user._id || participant.user.id;
    }
    return '';
  };

  // Helper function to get deck name
  const getDeckName = (deckId: string) => {
    const deck = decks.find(d => d.id === deckId);
    return deck ? deck.archetype : 'לא ידוע';
  };

  // Helper function to get position icon
  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 3:
        return <Award className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  // Helper function to get unique key for results
  const getResultKey = (result: any, index: number) => {
    // Try to get player ID first
    if (typeof result.player === 'string') {
      return result.player;
    } else if (result.player && typeof result.player === 'object') {
      return result.player._id || result.player.id || `result-${index}`;
    }
    // Fallback to position + player name + index
    return `${result.position}-${result.playerName || 'unknown'}-${index}`;
  };

  if (isLoading) {
    return (
      <div className="container py-16">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse">טוען פרטי טורניר...</div>
        </div>
      </div>
    );
  }

  if (!activeTournament) {
    return (
      <div className="container py-16">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">טורניר לא נמצא</h1>
          <p className="text-muted-foreground mb-6">
            הטורניר המבוקש לא נמצא במערכת.
          </p>
          <Button onClick={() => navigate('/tournaments')}>
            חזרה לרשימת הטורנירים
          </Button>
        </div>
      </div>
    );
  }

  const isFull = activeTournament.currentParticipants >= activeTournament.maxParticipants;
  const isRegistrationClosed = new Date(activeTournament.registrationDeadline) < new Date();
  const userRegistered = isUserRegistered();
  const isPastTournament = new Date(activeTournament.date) < new Date();
  const hasResults = activeTournament.results && activeTournament.results.length > 0;

  return (
    <div className="container py-12">
      {/* Admin View - No Banner */}
      {isAdmin ? (
        <div className="space-y-8">
          {/* Tournament Header */}
          <div className="border-b border-border pb-6">
            <h1 className="text-3xl font-bold mb-2">{activeTournament.title}</h1>
            <p className="text-muted-foreground mb-4">{activeTournament.description}</p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">תאריך</p>
                  <p className="font-medium">{new Date(activeTournament.date).toLocaleDateString('he-IL')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">שעה</p>
                  <p className="font-medium">{new Date(activeTournament.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">מיקום</p>
                  <p className="font-medium">{activeTournament.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">משתתפים</p>
                  <p className="font-medium">{activeTournament.currentParticipants} / {activeTournament.maxParticipants}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Results or Participants Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {hasResults ? (
                  <>
                    <Trophy className="h-5 w-5" />
                    <span>תוצאות הטורניר</span>
                  </>
                ) : (
                  <>
                    <User className="h-5 w-5" />
                    <span>רשימת משתתפים ({activeTournament.participants.length})</span>
                  </>
                )}
              </CardTitle>
              
              {!hasResults && !isPastTournament && !isFull && (
                <div className="flex justify-end">
                  <Button 
                    onClick={() => setShowAddUserModal(true)}
                    className="flex items-center gap-2"
                  >
                    <UserPlus size={16} />
                    <span>הוסף משתתף</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {hasResults ? (
                /* Tournament Results Table */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted border-b border-border text-right">
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מיקום</th>
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שחקן</th>
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">נקודות</th>
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דק</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...activeTournament.results]
                        .sort((a, b) => a.position - b.position)
                        .map((result, index) => (
                        <tr key={getResultKey(result, index)} className="border-b border-border">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{result.position}</span>
                              {getPositionIcon(result.position)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-medium">{result.playerName}</td>
                          <td className="px-4 py-3 font-bold text-primary">{result.points}</td>
                          <td className="px-4 py-3">
                            {result.deck ? getDeckName(result.deck) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Participants List */
                <>
                  {activeTournament.participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      אין משתתפים רשומים עדיין
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {activeTournament.participants.map((participant, index) => {
                        const participantName = getParticipantName(participant);
                        const participantId = getParticipantId(participant);
                        
                        return (
                          <div key={participantId || index} className="flex items-center justify-between p-3 border border-border rounded-md">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground w-8">#{index + 1}</span>
                              <span className="font-medium">{participantName}</span>
                              <span className="text-sm text-muted-foreground">
                                נרשם: {new Date(participant.registeredAt).toLocaleDateString('he-IL')}
                              </span>
                            </div>
                            
                            {!isPastTournament && (
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRemoveParticipant(participantId, participantName)}
                                disabled={removingParticipant === participantId}
                              >
                                {removingParticipant === participantId ? (
                                  'מסיר...'
                                ) : (
                                  <>
                                    <UserMinus size={16} className="ml-1" />
                                    <span>הסר</span>
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Regular User View - With Banner */
        <div className="grid md:grid-cols-[2fr_1fr] gap-8">
          {/* Main Content */}
          <div>
            <div className="relative rounded-lg overflow-hidden h-[300px] mb-8">
              <img
                src={activeTournament.image}
                alt={activeTournament.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-end p-6">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {activeTournament.title}
                </h1>
                <div className="flex items-center text-white gap-2">
                  <Calendar size={18} />
                  <span>{new Date(activeTournament.date).toLocaleDateString('he-IL')}</span>
                  <span className="mx-2">•</span>
                  <MapPin size={18} />
                  <span>{activeTournament.location}</span>
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">פרטי הטורניר</h2>
              <p className="mb-6">{activeTournament.description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">תאריך</p>
                    <p>{new Date(activeTournament.date).toLocaleDateString('he-IL')}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">שעה</p>
                    <p>{new Date(activeTournament.date).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">מיקום</p>
                    <p>{activeTournament.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">משתתפים</p>
                    <p>{activeTournament.currentParticipants} / {activeTournament.maxParticipants}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tournament Results Section for Regular Users */}
            {hasResults && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  <span>תוצאות הטורניר</span>
                </h2>
                
                {/* Desktop Results Table */}
                <div className="hidden md:block">
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted border-b border-border text-right">
                            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">מיקום</th>
                            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שחקן</th>
                            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">נקודות</th>
                            <th className="px-4 py-3 text-sm font-medium text-muted-foreground">דק</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...activeTournament.results]
                            .sort((a, b) => a.position - b.position)
                            .map((result, index) => (
                            <tr key={getResultKey(result, index)} className="border-b border-border">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold">{result.position}</span>
                                  {getPositionIcon(result.position)}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium">{result.playerName}</td>
                              <td className="px-4 py-3 font-bold text-primary">{result.points}</td>
                              <td className="px-4 py-3">
                                {result.deck ? getDeckName(result.deck) : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>

                {/* Mobile Results Cards */}
                <div className="md:hidden space-y-4">
                  {[...activeTournament.results]
                    .sort((a, b) => a.position - b.position)
                    .map((result, index) => (
                    <Card key={getResultKey(result, index)} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-primary">#{result.position}</span>
                          {getPositionIcon(result.position)}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-muted-foreground">נקודות</div>
                          <div className="text-xl font-bold text-primary">{result.points}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">שחקן</span>
                          <span className="font-medium">{result.playerName}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">דק</span>
                          <span>{result.deck ? getDeckName(result.deck) : '-'}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
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
                      {activeTournament.currentParticipants} / {activeTournament.maxParticipants}
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
                          ? 'התחבר כדי להירשם'
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
                        עליך להתחבר כדי להירשם לטורניר
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <UserPlus size={20} />
                <span>הוסף משתתף לטורניר</span>
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeAddUserModal}
              >
                ×
              </Button>
            </div>
            
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <Search className="h-5 w-5 text-muted-foreground" />
                </div>
                <input
                  type="text"
                  placeholder="חפש משתמש לפי שם או שם משתמש..."
                  className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Users List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {loadingUsers ? (
                <div className="text-center py-8">
                  <div className="animate-pulse">טוען משתמשים...</div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? 'לא נמצאו משתמשים התואמים לחיפוש' : 'אין משתמשים זמינים להוספה'}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                      <div className="flex items-center gap-3">
                        <div>
                          <div className="font-medium">{user.name}</div>
                          <div className="text-sm text-muted-foreground">@{user.username}</div>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-primary/10 text-primary' 
                            : 'bg-secondary/10 text-secondary'
                        }`}>
                          {user.role === 'admin' ? 'מנהל' : 'שחקן'}
                        </span>
                      </div>
                      
                      <Button
                        size="sm"
                        onClick={() => handleAddUserToTournament(user.id, user.name)}
                        disabled={addingUser === user.id}
                      >
                        {addingUser === user.id ? (
                          'מוסיף...'
                        ) : (
                          <>
                            <UserPlus size={16} className="ml-1" />
                            <span>הוסף</span>
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <Button variant="outline" onClick={closeAddUserModal}>
                סגור
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}