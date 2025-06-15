import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { fetchDecks } from '../../features/decks/decksSlice';
import { Plus, Calendar, MapPin, User, Search, X } from 'lucide-react';
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

interface NewTournamentData {
  title: string;
  description: string;
  date: string;
  location: string;
  maxParticipants: number;
  registrationDeadline: string;
  image: string;
  prizePool: string;
  entryFee: number;
  format: string;
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showNewTournamentModal, setShowNewTournamentModal] = useState(false);
  const [standingsInput, setStandingsInput] = useState('');
  const [parsedStandings, setParsedStandings] = useState<StandingsRow[]>([]);
  const [playerDecks, setPlayerDecks] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [newTournamentData, setNewTournamentData] = useState<NewTournamentData>({
    title: '',
    description: '',
    date: '',
    location: '',
    maxParticipants: 32,
    registrationDeadline: '',
    image: '',
    prizePool: '',
    entryFee: 0,
    format: 'Standard'
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

  const handleSubmitResults = (tournamentId: string) => {
    setSelectedTournament(tournamentId);
    setShowResultsModal(true);
  };

  const handleViewTournament = (tournamentId: string) => {
    navigate(`/tournaments/${tournamentId}`);
  };

  const handleEditTournament = (tournament: Tournament) => {
    setSelectedTournament(tournament.id);
    setShowEditModal(true);
  };

  const handleCreateTournament = async () => {
    try {
      setIsCreating(true);
      
      // Validate required fields
      if (!newTournamentData.title || !newTournamentData.description || !newTournamentData.date || 
          !newTournamentData.location || !newTournamentData.registrationDeadline) {
        alert('אנא מלא את כל השדות הנדרשים');
        return;
      }

      // Set default image if not provided
      const tournamentData = {
        ...newTournamentData,
        image: newTournamentData.image || 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg'
      };

      await api.post('/api/tournaments', tournamentData);
      
      // Refresh tournaments list
      dispatch(fetchTournaments());
      
      // Reset form and close modal
      setNewTournamentData({
        title: '',
        description: '',
        date: '',
        location: '',
        maxParticipants: 32,
        registrationDeadline: '',
        image: '',
        prizePool: '',
        entryFee: 0,
        format: 'Standard'
      });
      setShowNewTournamentModal(false);
      
      alert('הטורניר נוצר בהצלחה!');
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      alert(error.response?.data?.message || 'שגיאה ביצירת הטורניר');
    } finally {
      setIsCreating(false);
    }
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
        <Button onClick={() => setShowNewTournamentModal(true)}>
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
                        <div className="absolute top-2 left-2">
                          <span className={`
                              px-2 py-1 rounded-full text-xs font-medium
                              ${tournament.status === 'upcoming' ? 'bg-primary/10 text-primary' : 
                                'bg-muted text-muted-foreground'}
                            `}
                          >
                            {tournament.status === 'upcoming' ? 'קרוב' : 'הסתיים'}
                          </span>
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
                            צפה
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
                              ערוך
                            </Button>
                          )}
                          <Button 
                            variant="destructive" 
                            size="sm"
                          >
                            מחק
                          </Button>
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

      {/* New Tournament Modal */}
      {showNewTournamentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">יצירת טורניר חדש</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowNewTournamentModal(false)}
              >
                <X size={20} />
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שם הטורניר *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="שם הטורניר"
                    value={newTournamentData.title}
                    onChange={(e) => setNewTournamentData({...newTournamentData, title: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">מיקום *</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="מיקום הטורניר"
                    value={newTournamentData.location}
                    onChange={(e) => setNewTournamentData({...newTournamentData, location: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך ושעה *</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    value={newTournamentData.date}
                    onChange={(e) => setNewTournamentData({...newTournamentData, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">מועד אחרון להרשמה *</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    value={newTournamentData.registrationDeadline}
                    onChange={(e) => setNewTournamentData({...newTournamentData, registrationDeadline: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">מספר משתתפים מקסימלי</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="32"
                    value={newTournamentData.maxParticipants}
                    onChange={(e) => setNewTournamentData({...newTournamentData, maxParticipants: parseInt(e.target.value) || 32})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">פורמט</label>
                  <select 
                    className="w-full px-3 py-2 border border-input rounded-md bg-background"
                    value={newTournamentData.format}
                    onChange={(e) => setNewTournamentData({...newTournamentData, format: e.target.value})}
                  >
                    <option value="Standard">Standard</option>
                    <option value="Expanded">Expanded</option>
                    <option value="Limited">Limited</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">דמי השתתפות (₪)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="0"
                    value={newTournamentData.entryFee}
                    onChange={(e) => setNewTournamentData({...newTournamentData, entryFee: parseInt(e.target.value) || 0})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">פרסים</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="פרסים וחבילות בוסטר"
                    value={newTournamentData.prizePool}
                    onChange={(e) => setNewTournamentData({...newTournamentData, prizePool: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">תיאור *</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md"
                  rows={4}
                  placeholder="תיאור הטורניר"
                  value={newTournamentData.description}
                  onChange={(e) => setNewTournamentData({...newTournamentData, description: e.target.value})}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">תמונה (URL)</label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="https://example.com/image.jpg (אופציונלי)"
                  value={newTournamentData.image}
                  onChange={(e) => setNewTournamentData({...newTournamentData, image: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  אם לא תוזן תמונה, תשמש תמונת ברירת מחדל
                </p>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowNewTournamentModal(false)}
                  disabled={isCreating}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleCreateTournament}
                  disabled={isCreating}
                >
                  {isCreating ? 'יוצר טורניר...' : 'צור טורניר'}
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

      {/* Edit Modal */}
      {showEditModal && selectedTournament && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-4">עריכת טורניר</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">שם הטורניר</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="שם הטורניר"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">מיקום</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="מיקום הטורניר"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">תאריך</label>
                  <input
                    type="datetime-local"
                    className="w-full px-3 py-2 border border-input rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">מספר משתתפים מקסימלי</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-input rounded-md"
                    placeholder="מספר משתתפים"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md"
                  rows={4}
                  placeholder="תיאור הטורניר"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => {
                    // Handle tournament update
                    setShowEditModal(false);
                  }}
                >
                  שמור שינויים
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}