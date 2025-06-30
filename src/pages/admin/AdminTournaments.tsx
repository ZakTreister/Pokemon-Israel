import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../../features/decks/decksSlice';
import { Plus, Calendar, MapPin, User, Search, X, Trash2, Edit, Eye } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Tournament } from '../../types/tournament';
import api from '../../services/api';

interface StandingsRow {
  position: number;
  playerName: string;
  playerId?: string;
  points: number;
  originalPoints: number; // Store original points for reference
  deck?: string;
  needsPlayerSelection?: boolean;
}

interface TournamentFormData {
  date: string;
  location: string;
  isRecurring: boolean;
  lastTournamentDate: string;
  maxParticipants?: number;
}

interface DeckSuggestion {
  id: string;
  archetype: string;
}

export default function AdminTournaments() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
  const { decks } = useAppSelector((state) => state.decks);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [standingsInput, setStandingsInput] = useState('');
  const [parsedStandings, setParsedStandings] = useState<StandingsRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TournamentFormData>({
    date: '',
    location: '',
    isRecurring: false,
    lastTournamentDate: '',
    maxParticipants: undefined
  });

  // Deck autocomplete states
  const [deckInputs, setDeckInputs] = useState<Record<number, string>>({});
  const [deckSuggestions, setDeckSuggestions] = useState<Record<number, DeckSuggestion[]>>({});
  const [showDeckSuggestions, setShowDeckSuggestions] = useState<Record<number, boolean>>({});
  const [selectedDecks, setSelectedDecks] = useState<Record<number, string>>({});

  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchDecks());
  }, [dispatch]);

  // Create a mutable copy of tournaments with updated statuses
  const processedTournaments = (tournaments || []).map(tournament => {
    const tournamentDate = new Date(tournament.date);
    const now = new Date();
    if (tournamentDate < now && tournament.status !== 'completed') {
      return { ...tournament, status: 'completed' as const };
    }
    return tournament;
  });

  // Filter tournaments
  const filteredTournaments = processedTournaments.filter((tournament) => {
    const matchesSearch = tournament.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tournament.location.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || tournament.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Sort tournaments by date (upcoming first)
  const sortedTournaments = [...filteredTournaments].sort((a, b) => {
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  // Helper function to check if tournament is in the past
  const isPastTournament = (tournament: Tournament) => {
    const now = new Date();
    const tournamentDate = new Date(tournament.date);
    return tournamentDate < now;
  };

  const resetForm = () => {
    setFormData({
      date: '',
      location: '',
      isRecurring: false,
      lastTournamentDate: '',
      maxParticipants: undefined
    });
  };

  // Helper function to convert UTC date to local datetime-local format
  const formatDateForInput = (dateString: string) => {
    const date = new Date(dateString);
    // Get the timezone offset in minutes and convert to milliseconds
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    // Create a new date adjusted for timezone
    const localDate = new Date(date.getTime() - timezoneOffset);
    // Return in the format required by datetime-local input
    return localDate.toISOString().slice(0, 16);
  };

  const handleCreateTournament = () => {
    setIsEditing(false);
    setSelectedTournament(null);
    resetForm();
    setShowTournamentModal(true);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setIsEditing(true);
    setSelectedTournament(tournament);
    
    // Format date for datetime-local input with proper timezone conversion
    const formattedDate = formatDateForInput(tournament.date);
    
    setFormData({
      date: formattedDate,
      location: tournament.location,
      isRecurring: tournament.isRecurring || false,
      lastTournamentDate: '',
      maxParticipants: tournament.maxParticipants
    });
    setShowTournamentModal(true);
  };

  const handleSubmitTournament = async () => {
    try {
      setIsSubmitting(true);
      
      // Validate required fields
      if (!formData.date || !formData.location) {
        alert('אנא מלא את כל השדות הנדרשים');
        return;
      }

      // If recurring is selected for new tournament, validate last tournament date
      if (!isEditing && formData.isRecurring && !formData.lastTournamentDate) {
        alert('אנא הזן תאריך טורניר אחרון עבור טורניר שבועי');
        return;
      }

      if (isEditing && selectedTournament) {
        // Update existing tournament - now using id consistently
        const updateData = {
          date: formData.date,
          location: formData.location,
          maxParticipants: formData.maxParticipants || 32
        };
        
        await api.put(`/api/tournaments/${selectedTournament.id}`, updateData);
        alert('הטורניר עודכן בהצלחה!');
      } else {
        // Create new tournament(s)
        const response = await api.post('/api/tournaments', formData);
        
        if (formData.isRecurring) {
          alert(`נוצרו ${response.data.tournaments?.length || 'מספר'} טורנירים שבועיים בהצלחה!`);
        } else {
          alert('הטורניר נוצר בהצלחה!');
        }
      }
      
      // Refresh tournaments list
      dispatch(fetchTournaments());
      
      // Reset form and close modal
      resetForm();
      setShowTournamentModal(false);
      setSelectedTournament(null);
      
    } catch (error: any) {
      console.error('Error with tournament:', error);
      alert(error.response?.data?.message || 'שגיאה בעיבוד הטורניר');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSingleTournament = async (tournament: Tournament) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את הטורניר הזה בלבד?')) return;

    try {
      // Now using id consistently
      await api.delete(`/api/tournaments/${tournament.id}`);
      dispatch(fetchTournaments());
      alert('הטורניר נמחק בהצלחה');
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      alert(error.response?.data?.message || 'שגיאה במחיקת הטורניר');
    }
  };

  const handleDeleteSeries = async (tournament: Tournament) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את כל הטורנירים העתידיים בסדרה?')) return;

    try {
      // Now using id consistently
      await api.delete(`/api/tournaments/${tournament.id}?deleteSeries=true`);
      dispatch(fetchTournaments());
      alert('כל הטורנירים העתידיים בסדרה נמחקו בהצלחה');
    } catch (error: any) {
      console.error('Error deleting series:', error);
      alert(error.response?.data?.message || 'שגיאה במחיקת הסדרה');
    }
  };

  const handleSubmitResults = (tournamentId: string) => {
    // Find the tournament object to pass to the modal
    const tournament = sortedTournaments.find(t => t.id === tournamentId);
    setSelectedTournament(tournament || null);
    setShowResultsModal(true);
  };

  const handleViewTournament = (tournamentId: string) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  // Get tournament participants for player matching
  const getTournamentParticipants = () => {
    if (!selectedTournament) return [];
    
    return selectedTournament.participants.map(participant => {
      if (typeof participant.user === 'string') {
        return { id: participant.user, name: participant.user };
      } else {
        return { 
          id: participant.user._id || participant.user.id, 
          name: participant.user.username 
        };
      }
    });
  };

  // Enhanced parsing function with improved points extraction and sorting
  const parseStandings = (input: string) => {
    if (!input.trim()) return;
    
    const lines = input.trim().split('\n');
    const participants = getTournamentParticipants();
    
    // Remove header lines if they exist
    const filteredLines = lines.filter(line => {
      const lowerLine = line.toLowerCase();
      return !lowerLine.includes('standings') && 
             !lowerLine.includes('player') && 
             !lowerLine.includes('points') &&
             line.trim().length > 0;
    });
    
    const standings: StandingsRow[] = filteredLines.map((line, index) => {
      const parts = line.trim().split(/\s+/);
      
      let position = index + 1; // Default position
      let playerName = '';
      let points = 0;
      let startIndex = 0;
      
      // Try to parse position if the first part looks like a position (number with optional colon)
      const firstPart = parts[0];
      if (/^\d+:?$/.test(firstPart)) {
        position = parseInt(firstPart.replace(':', ''));
        startIndex = 1;
      }
      
      // Find the first number after the player name - this will be the points
      let pointsIndex = -1;
      for (let i = startIndex; i < parts.length; i++) {
        if (/^\d+$/.test(parts[i])) {
          pointsIndex = i;
          break;
        }
      }
      
      if (pointsIndex > startIndex) {
        // Player name is everything from startIndex to pointsIndex
        playerName = parts.slice(startIndex, pointsIndex).join(' ');
        points = parseInt(parts[pointsIndex]);
      } else if (pointsIndex === startIndex) {
        // Edge case: only a number after position, treat as points with empty name
        points = parseInt(parts[pointsIndex]);
        playerName = `Player ${position}`;
      } else {
        // No points found, treat everything after position as player name
        playerName = parts.slice(startIndex).join(' ');
        points = 0;
      }

      // Try to match player with tournament participants
      const matchedPlayer = participants.find(p => 
        p.name.toLowerCase().includes(playerName.toLowerCase()) ||
        playerName.toLowerCase().includes(p.name.toLowerCase())
      );

      return {
        position,
        playerName,
        playerId: matchedPlayer?.id,
        points,
        originalPoints: points, // Store original points for reference
        needsPlayerSelection: !matchedPlayer
      };
    });

    // Sort by points (highest first) and reassign positions and tournament points
    const sortedStandings = standings.sort((a, b) => b.originalPoints - a.originalPoints);
    
    // Reassign positions and tournament points based on ranking
    const finalStandings = sortedStandings.map((standing, index) => {
      const newPosition = index + 1;
      let tournamentPoints = 1; // Default for 4th place and below
      
      if (newPosition === 1) tournamentPoints = 4;
      else if (newPosition === 2) tournamentPoints = 3;
      else if (newPosition > 2 && newPosition < 6) tournamentPoints = 2;
      
      return {
        ...standing,
        position: newPosition,
        points: tournamentPoints
      };
    });

    setParsedStandings(finalStandings);
    
    // Initialize deck inputs and selections
    const initialDeckInputs: Record<number, string> = {};
    const initialSelectedDecks: Record<number, string> = {};
    finalStandings.forEach((_, index) => {
      initialDeckInputs[index] = '';
      initialSelectedDecks[index] = '';
    });
    setDeckInputs(initialDeckInputs);
    setSelectedDecks(initialSelectedDecks);
  };

  // Handle player selection for unmatched players
  const handlePlayerSelection = (rowIndex: number, playerId: string) => {
    const participants = getTournamentParticipants();
    const selectedPlayer = participants.find(p => p.id === playerId);
    
    if (selectedPlayer) {
      setParsedStandings(prev => prev.map((row, index) => 
        index === rowIndex 
          ? { ...row, playerId, playerName: selectedPlayer.name, needsPlayerSelection: false }
          : row
      ));
    }
  };

  // Deck autocomplete functions
  const handleDeckInputChange = (rowIndex: number, value: string) => {
    setDeckInputs(prev => ({ ...prev, [rowIndex]: value }));
    
    if (value.length > 0) {
      const suggestions = (decks || []).filter(deck =>
        deck.archetype.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 5);
      
      setDeckSuggestions(prev => ({ ...prev, [rowIndex]: suggestions }));
      setShowDeckSuggestions(prev => ({ ...prev, [rowIndex]: true }));
    } else {
      setShowDeckSuggestions(prev => ({ ...prev, [rowIndex]: false }));
      setDeckSuggestions(prev => ({ ...prev, [rowIndex]: [] }));
    }
  };

  const handleDeckSelection = (rowIndex: number, deckId: string, deckName: string) => {
    setSelectedDecks(prev => ({ ...prev, [rowIndex]: deckId }));
    setDeckInputs(prev => ({ ...prev, [rowIndex]: deckName }));
    setShowDeckSuggestions(prev => ({ ...prev, [rowIndex]: false }));
  };

  const handleCreateDeck = async (rowIndex: number, archetype: string) => {
    try {
      const response = await api.post('/api/decks', {
        archetype,
        image: 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg'
      });
      
      // Refresh decks list
      dispatch(fetchDecks());
      
      // Select the newly created deck
      handleDeckSelection(rowIndex, response.data.id, response.data.archetype);
      
      alert(`דק "${archetype}" נוצר בהצלחה!`);
    } catch (error: any) {
      console.error('Error creating deck:', error);
      alert(error.response?.data?.message || 'שגיאה ביצירת הדק');
    }
  };

  const handleSaveResults = async () => {
    try {
      // Validate that all players are selected
      const unselectedPlayers = parsedStandings.filter(row => row.needsPlayerSelection);
      if (unselectedPlayers.length > 0) {
        alert('אנא בחר שחקן עבור כל השורות');
        return;
      }

      // Get tournament participants for name lookup
      const participants = getTournamentParticipants();

      // Prepare results data with player names and both raw points and tournament points
      const results = parsedStandings.map(row => {
        // Find the participant to get the display name
        const participant = participants.find(p => p.id === row.playerId);
        const playerName = participant ? participant.name : row.playerName;

        return {
          player: row.playerId,
          playerName: playerName, // Include player name in results
          position: row.position,
          points: row.points, // Tournament ranking points (4, 3, 2, 1)
          rawPoints: row.originalPoints, // Raw points from games (for calculating wins/draws/losses)
          omp: 0, // Default values for now
          gwp: 0,
          ogp: 0,
          deck: selectedDecks[parsedStandings.indexOf(row)] || null
        };
      });

      await api.post(`/api/tournaments/${selectedTournament?.id}/results`, { results });
      
      alert('התוצאות נשמרו בהצלחה!');
      
      // Refresh tournament data
      dispatch(fetchTournaments());
      
      // Close modal and reset
      setShowResultsModal(false);
      setStandingsInput('');
      setParsedStandings([]);
      setDeckInputs({});
      setSelectedDecks({});
      setDeckSuggestions({});
      setShowDeckSuggestions({});
      
    } catch (error: any) {
      console.error('Error saving results:', error);
      alert(error.response?.data?.message || 'שגיאה בשמירת התוצאות');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ניהול טורנירים</h2>
        <Button onClick={handleCreateTournament}>
          <Plus size={18} className="ml-1" />
          <span>טורניר חדש</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <Search className="h-5 w-5 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder="חפש טורנירים..."
              className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
            >
              הכל
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'upcoming' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('upcoming')}
            >
              קרובים
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'completed' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('completed')}
            >
              הסתיימו
            </Button>
          </div>
        </div>
      </div>

      {/* Tournaments List */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען טורנירים...</div>
      ) : (
        <>
          {sortedTournaments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg mb-4">לא נמצאו טורנירים התואמים את החיפוש שלך</p>
              <Button onClick={() => {
                setSearchQuery('');
                setFilterStatus('all');
              }}>
                נקה סינון
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-[180px_1fr] h-full">
                      <div className="relative h-[120px] md:h-full overflow-hidden">
                        <img
                          src={tournament.image}
                          alt={tournament.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 flex gap-1">
                          <span className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${tournament.status === 'upcoming' ? 'bg-primary/10 text-primary' : 
                                'bg-muted text-muted-foreground'}
                            `}
                          >
                            {tournament.status === 'upcoming' ? 'קרוב' : 'הסתיים'}
                          </span>
                          {tournament.seriesId && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary/10 text-secondary">
                              שבועי
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-4 flex flex-col justify-between">
                        <div>
                          <h3 className="font-medium text-lg mb-2">{tournament.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                            <div className="flex items-center gap-1">
                              <Calendar size={16} />
                              <span>{new Date(tournament.date).toLocaleDateString('he-IL')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin size={16} />
                              <span>{tournament.location}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <User size={16} />
                              <span>
                                {tournament.currentParticipants} / {tournament.maxParticipants}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewTournament(tournament.id)}
                          >
                            <Eye size={16} className="ml-1" />
                            <span>צפה</span>
                          </Button>
                          
                          {tournament.status === 'completed' ? (
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={() => handleSubmitResults(tournament.id)}
                            >
                              הזן תוצאות
                            </Button>
                          ) : (
                            // Only show edit button for future tournaments
                            !isPastTournament(tournament) && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleEditTournament(tournament)}
                              >
                                <Edit size={16} className="ml-1" />
                                <span>ערוך</span>
                              </Button>
                            )
                          )}
                          
                          {/* Delete options - only for future tournaments */}
                          {!isPastTournament(tournament) && (
                            <>
                              <Button 
                                variant="destructive" 
                                size="sm"
                                onClick={() => handleDeleteSingleTournament(tournament)}
                              >
                                <Trash2 size={16} className="ml-1" />
                                <span>מחק</span>
                              </Button>
                              
                              {tournament.seriesId && (
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDeleteSeries(tournament)}
                                >
                                  <Trash2 size={16} className="ml-1" />
                                  <span>מחק סדרה</span>
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tournament Modal (Create/Edit) */}
      {showTournamentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">
                {isEditing ? 'עריכת טורניר' : 'יצירת טורניר חדש'}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowTournamentModal(false)}
              >
                <X size={20} />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">תאריך ושעה *</label>
                <input
                  type="datetime-local"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">מיקום *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="מיקום הטורניר"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              
              {!isEditing && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    className="rounded border-input"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({...formData, isRecurring: e.target.checked})}
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium">
                    טורניר שבועי
                  </label>
                </div>
              )}
              
              {!isEditing && formData.isRecurring && (
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך טורניר אחרון *</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    value={formData.lastTournamentDate}
                    onChange={(e) => setFormData({...formData, lastTournamentDate: e.target.value})}
                  />
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium mb-1">מספר משתתפים מקסימלי (אופציונלי)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="32 (ברירת מחדל)"
                  value={formData.maxParticipants || ''}
                  onChange={(e) => setFormData({
                    ...formData, 
                    maxParticipants: e.target.value ? parseInt(e.target.value) : undefined
                  })}
                />
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowTournamentModal(false)}
                  disabled={isSubmitting}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleSubmitTournament}
                  disabled={isSubmitting}
                >
                  {isSubmitting 
                    ? (isEditing ? 'מעדכן...' : 'יוצר טורניר...') 
                    : (isEditing ? 'עדכן טורניר' : 'צור טורניר')
                  }
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {showResultsModal && selectedTournament && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">הזנת תוצאות טורניר</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">טבלת תוצאות</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                  rows={10}
                  placeholder={`הדבק את טבלת התוצאות בפורמט הבא:
1: PlayerA 7
2: PlayerB 6
או:
PlayerA 7
PlayerB 6
או:
1 PlayerA 7
2 PlayerB 6

הנקודות הן המספר הראשון אחרי שם השחקן
לאחר העיבוד, השחקנים יסודרו לפי נקודות ויקבלו נקודות טורניר:
מקום 1: 4 נקודות, מקום 2: 3 נקודות, מקום 3-5: 2 נקודות, שאר המקומות: 1 נקודה`}
                  value={standingsInput}
                  onChange={(e) => setStandingsInput(e.target.value)}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={() => parseStandings(standingsInput)}
                >
                  עבד תוצאות
                </Button>
              </div>

              {parsedStandings.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium mb-2">תוצאות מעובדות (ממוינות לפי נקודות)</h4>
                  <div className="mb-3 p-3 bg-muted rounded-md text-sm">
                    <strong>הערה:</strong> השחקנים סודרו לפי הנקודות המקוריות שלהם ונקודות הטורניר הוקצו מחדש:
                    <br />• מקום 1: 4 נקודות טורניר
                    <br />• מקום 2: 3 נקודות טורניר  
                    <br />• מקום 3-5: 2 נקודות טורניר
                    <br />• מקום 4 ומעלה: 1 נקודה טורניר
                    <br />• הנקודות המקוריות ישמשו לחישוב ניצחונות/תיקו/הפסדים
                  </div>
                  
                  {/* Desktop Table View */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b border-border text-right">
                          <th className="px-4 py-2 text-sm font-medium">מיקום סופי</th>
                          <th className="px-4 py-2 text-sm font-medium">שחקן</th>
                          <th className="px-4 py-2 text-sm font-medium">נקודות מקוריות</th>
                          <th className="px-4 py-2 text-sm font-medium">נקודות טורניר</th>
                          <th className="px-4 py-2 text-sm font-medium">דק</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedStandings.map((row, index) => (
                          <tr key={index} className="border-b border-border">
                            <td className="px-4 py-2">
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{row.position}</span>
                                {row.position === 1 && <span className="text-primary">🥇</span>}
                                {row.position === 2 && <span className="text-secondary">🥈</span>}
                                {row.position === 3 && <span className="text-accent">🥉</span>}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              {row.needsPlayerSelection ? (
                                <select
                                  className="w-full px-2 py-1 border border-input rounded-md bg-background"
                                  value={row.playerId || ''}
                                  onChange={(e) => handlePlayerSelection(index, e.target.value)}
                                >
                                  <option value="">בחר שחקן עבור "{row.playerName}"</option>
                                  {getTournamentParticipants().map(participant => (
                                    <option key={participant.id} value={participant.id}>
                                      {participant.name}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <div className="font-medium">{row.playerName}</div>
                              )}
                            </td>
                            <td className="px-4 py-2 text-muted-foreground">{row.originalPoints}</td>
                            <td className="px-4 py-2">
                              <span className="font-bold text-primary">{row.points}</span>
                            </td>
                            <td className="px-4 py-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  className="w-full px-2 py-1 border border-input rounded-md bg-background"
                                  placeholder="חפש דק..."
                                  value={deckInputs[index] || ''}
                                  onChange={(e) => handleDeckInputChange(index, e.target.value)}
                                  onFocus={() => {
                                    if (deckInputs[index] && deckInputs[index].length > 0) {
                                      setShowDeckSuggestions(prev => ({ ...prev, [index]: true }));
                                    }
                                  }}
                                  onBlur={() => {
                                    // Delay hiding suggestions to allow clicking on them
                                    setTimeout(() => {
                                      setShowDeckSuggestions(prev => ({ ...prev, [index]: false }));
                                    }, 200);
                                  }}
                                />
                                
                                {showDeckSuggestions[index] && (
                                  <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                    {deckSuggestions[index]?.length > 0 ? (
                                      deckSuggestions[index].map(deck => (
                                        <button
                                          key={deck.id}
                                          className="w-full px-3 py-2 text-right hover:bg-muted"
                                          onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                          onClick={() => handleDeckSelection(index, deck.id, deck.archetype)}
                                        >
                                          {deck.archetype}
                                        </button>
                                      ))
                                    ) : deckInputs[index] && deckInputs[index].trim().length > 0 ? (
                                      <button
                                        className="w-full px-3 py-2 text-right hover:bg-muted text-primary"
                                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                        onClick={() => handleCreateDeck(index, deckInputs[index].trim())}
                                      >
                                        + צור דק "{deckInputs[index].trim()}"
                                      </button>
                                    ) : null}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {parsedStandings.map((row, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          {/* Position and Player */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl font-bold text-primary">#{row.position}</span>
                              {row.position === 1 && <span className="text-xl">🥇</span>}
                              {row.position === 2 && <span className="text-xl">🥈</span>}
                              {row.position === 3 && <span className="text-xl">🥉</span>}
                            </div>
                            <div className="text-right">
                              <div className="text-sm text-muted-foreground">נקודות טורניר</div>
                              <div className="text-xl font-bold text-primary">{row.points}</div>
                            </div>
                          </div>

                          {/* Player Selection */}
                          <div>
                            <label className="block text-sm font-medium mb-1">שחקן</label>
                            {row.needsPlayerSelection ? (
                              <select
                                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                value={row.playerId || ''}
                                onChange={(e) => handlePlayerSelection(index, e.target.value)}
                              >
                                <option value="">בחר שחקן עבור "{row.playerName}"</option>
                                {getTournamentParticipants().map(participant => (
                                  <option key={participant.id} value={participant.id}>
                                    {participant.name}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="px-3 py-2 bg-muted rounded-md font-medium">
                                {row.playerName}
                              </div>
                            )}
                          </div>

                          {/* Original Points */}
                          <div className="flex justify-between items-center py-2 border-t border-border">
                            <span className="text-sm text-muted-foreground">נקודות מקוריות</span>
                            <span className="font-medium">{row.originalPoints}</span>
                          </div>

                          {/* Deck Selection */}
                          <div>
                            <label className="block text-sm font-medium mb-1">דק</label>
                            <div className="relative">
                              <input
                                type="text"
                                className="w-full px-3 py-2 border border-input rounded-md bg-background"
                                placeholder="חפש דק..."
                                value={deckInputs[index] || ''}
                                onChange={(e) => handleDeckInputChange(index, e.target.value)}
                                onFocus={() => {
                                  if (deckInputs[index] && deckInputs[index].length > 0) {
                                    setShowDeckSuggestions(prev => ({ ...prev, [index]: true }));
                                  }
                                }}
                                onBlur={() => {
                                  // Delay hiding suggestions to allow clicking on them
                                  setTimeout(() => {
                                    setShowDeckSuggestions(prev => ({ ...prev, [index]: false }));
                                  }, 200);
                                }}
                              />
                              
                              {showDeckSuggestions[index] && (
                                <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-10 max-h-40 overflow-y-auto">
                                  {deckSuggestions[index]?.length > 0 ? (
                                    deckSuggestions[index].map(deck => (
                                      <button
                                        key={deck.id}
                                        className="w-full px-3 py-2 text-right hover:bg-muted"
                                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                        onClick={() => handleDeckSelection(index, deck.id, deck.archetype)}
                                      >
                                        {deck.archetype}
                                      </button>
                                    ))
                                  ) : deckInputs[index] && deckInputs[index].trim().length > 0 ? (
                                    <button
                                      className="w-full px-3 py-2 text-right hover:bg-muted text-primary"
                                      onMouseDown={(e) => e.preventDefault()} // Prevent blur
                                      onClick={() => handleCreateDeck(index, deckInputs[index].trim())}
                                    >
                                      + צור דק "{deckInputs[index].trim()}"
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowResultsModal(false);
                    setStandingsInput('');
                    setParsedStandings([]);
                    setDeckInputs({});
                    setSelectedDecks({});
                    setDeckSuggestions({});
                    setShowDeckSuggestions({});
                  }}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleSaveResults}
                  disabled={parsedStandings.length === 0 || parsedStandings.some(row => row.needsPlayerSelection)}
                >
                  שמור תוצאות
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}