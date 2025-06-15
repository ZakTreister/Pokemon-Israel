import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournamentById, registerForTournament, clearError } from '../features/tournaments/tournamentsSlice';
import { Calendar, MapPin, User, Clock } from 'lucide-react';
import Button from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { TournamentParticipant } from '../types/tournament';

export default function TournamentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { activeTournament, isLoading, error } = useAppSelector((state) => state.tournaments);
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (id) {
      dispatch(fetchTournamentById(id));
    }
    
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
      } else {
        return participant.user._id === user.id;
      }
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

  return (
    <div className="container py-12">
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
        </div>

        {/* Sidebar */}
        <div>
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>הרשמה לטורניר</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-border">
                  <span className="text-muted-foreground">סטטוס</span>
                  <span className="font-medium">
                    {activeTournament.status === 'upcoming' && 'קרוב'}
                    {activeTournament.status === 'ongoing' && 'מתקיים'}
                    {activeTournament.status === 'completed' && 'הסתיים'}
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
                    ✓ נרשמת לטורניר זה בהצלחה!
                  </div>
                )}
                
                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                    {error}
                  </div>
                )}
                
                <div className="pt-4">
                  <Button 
                    className="w-full" 
                    disabled={
                      activeTournament.status !== 'upcoming' || 
                      isFull || 
                      isRegistrationClosed ||
                      isLoading ||
                      userRegistered
                    }
                    onClick={handleRegister}
                    variant={userRegistered ? 'success' : 'default'}
                  >
                    {isLoading
                      ? 'מבצע רישום...'
                      : !isAuthenticated
                      ? 'התחבר כדי להירשם'
                      : userRegistered
                      ? 'נרשמת לטורניר!'
                      : activeTournament.status !== 'upcoming'
                      ? 'ההרשמה הסתיימה'
                      : isFull
                      ? 'הטורניר מלא'
                      : isRegistrationClosed
                      ? 'ההרשמה נסגרה'
                      : 'הרשם לטורניר'}
                  </Button>
                  
                  {!isAuthenticated && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      עליך להתחבר כדי להירשם לטורניר
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}