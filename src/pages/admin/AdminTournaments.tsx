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
  player: string;
  points: number;
  omp: number;
  gwp: number;
  ogp: number;
  deck?: string;
}

interface TournamentFormData {
  date: string;
  location: string;
  isRecurring: boolean;
  lastTournamentDate: string;
  maxParticipants?: number;
}

export default function AdminTournaments() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);
  const { decks } = useAppSelector((state) => state.decks);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'upcoming' | 'completed'>('all');
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [showTournamentModal, setShowTournamentModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [standingsInput, setStandingsInput] = useState('');
  const [parsedStandings, setParsedStandings] = useState<StandingsRow[]>([]);
  const [playerDecks, setPlayerDecks] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<TournamentFormData>({
    date: '',
    location: '',
    isRecurring: false,
    lastTournamentDate: '',
    maxParticipants: undefined
  });

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
    resetForm();
    setShowTournamentModal(true);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setIsEditing(true);
    setSelectedTournament(tournament.id);
    
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
        // Update existing tournament
        const updateData = {
          date: formData.date,
          location: formData.location,
          maxParticipants: formData.maxParticipants || 32
        };
        
        await api.put(`/api/tournaments/${selectedTournament}`, updateData);
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
      await api.delete(`/api/tournaments/${tournament.id}`);
      dispatch(fetchTournaments());
      alert('הטורניר נמחק בהצלחה');
    } catch (error: any) {
      console.error('Error deleting tournament:', error);
      alert(error.response?.data?.message || 'שגיאה במחיקת הטורניר');
    }
  };

  const handleDeleteSeries = async (tournament: Tournament) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את כל הטורנירים בסדרה?')) return;

    try {
      await api.delete(`/api/tournaments/${tournament.id}?deleteSeries=true`);
      dispatch(fetchTournaments());
      alert('כל הטורנירים בסדרה נמחקו בהצלחה');
    } catch (error: any) {
      console.error('Error deleting series:', error);
      alert(error.response?.data?.message || 'שגיאה במחיקת הסדרה');
    }
  };

  const handleSubmitResults = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    setShowResultsModal(true);
  };

  const handleViewTournament = (tournamentId: string) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const parseStandings = (input: string) => {
    if (!input.trim()) return;
    
    const lines = input.trim().split('\n');
    
    // Remove header lines if they exist
    if (lines[0].toLowerCase().includes('standings')) {
      lines.shift();
    }
    if (lines[0].toLowerCase().includes('player points')) {
      lines.shift();
    }
    
    const standings: StandingsRow[] = lines.map(line => {
      const parts = line.trim().split(/\s+/);
      
      // Get position (remove the colon)
      const position = parseInt(parts[0].replace(':', ''));
      
      // Get player name (it's always the second part)
      const player = parts[1];
      
      // Get the numbers (they're always the last 4 parts)
      const [points, omp, gwp, ogp] = parts.slice(2).map(Number);
      
      return {
        position,
        player,
        points,
        omp,
        gwp,
        ogp,
      };
    });

    setParsedStandings(standings);
    // Initialize deck selections as empty strings (optional selection)
    const initialDecks: Record<string, string> = {};
    standings.forEach(row => {
      initialDecks[row.player] = '';
    });
    setPlayerDecks(initialDecks);
  };

  const handleSaveResults = () => {
    // Here you would handle saving the results with the optional deck selections
    console.log('Saving results with decks:', {
      tournamentId: selectedTournament,
      standings: parsedStandings.map(row => ({
        ...row,
        deck: playerDecks[row.player] || null // Convert empty string to null
      }))
    });
    
    setShowResultsModal(false);
    setStandingsInput('');
    setParsedStandings([]);
    setPlayerDecks({});
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
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleEditTournament(tournament)}
                            >
                              <Edit size={16} className="ml-1" />
                              <span>ערוך</span>
                            </Button>
                          )}
                          
                          {/* Delete options */}
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">הזנת תוצאות טורניר</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">טבלת תוצאות</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md font-mono text-sm"
                  rows={10}
                  placeholder={`הדבק את טבלת התוצאות בפורמט הבא:
Standings
Player Points OMP GWP OGP
1: PlayerA 7 48.15 83.33 50
2: PlayerB 6 62.96 66.67 66.67`}
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
                  <h4 className="text-lg font-medium mb-2">תוצאות מעובדות</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-muted border-b border-border text-right">
                          <th className="px-4 py-2 text-sm font-medium">מיקום</th>
                          <th className="px-4 py-2 text-sm font-medium">שחקן</th>
                          <th className="px-4 py-2 text-sm font-medium">נקודות</th>
                          <th className="px-4 py-2 text-sm font-medium">OMP</th>
                          <th className="px-4 py-2 text-sm font-medium">GWP</th>
                          <th className="px-4 py-2 text-sm font-medium">OGP</th>
                          <th className="px-4 py-2 text-sm font-medium">דק</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedStandings.map((row) => (
                          <tr key={row.player} className="border-b border-border">
                            <td className="px-4 py-2">{row.position}</td>
                            <td className="px-4 py-2">{row.player}</td>
                            <td className="px-4 py-2">{row.points}</td>
                            <td className="px-4 py-2">{row.omp}</td>
                            <td className="px-4 py-2">{row.gwp}</td>
                            <td className="px-4 py-2">{row.ogp}</td>
                            <td className="px-4 py-2">
                              <select
                                className="w-full px-2 py-1 border border-input rounded-md bg-background"
                                value={playerDecks[row.player] || ''}
                                onChange={(e) => setPlayerDecks({
                                  ...playerDecks,
                                  [row.player]: e.target.value
                                })}
                              >
                                <option value="">ללא דק</option>
                                {(decks || []).map(deck => (
                                  <option key={deck.id} value={deck.id}>
                                    {deck.archetype}
                                  </option>
                                ))}
                              </select>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                    setPlayerDecks({});
                  }}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleSaveResults}
                  disabled={parsedStandings.length === 0}
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