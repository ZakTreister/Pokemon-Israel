import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { CalendarDays, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminOverview() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading } = useAppSelector((state) => state.tournaments);

  useEffect(() => {
    dispatch(fetchTournaments());
  }, [dispatch]);

  // Calculate statistics
  const upcomingTournaments = (tournaments || []).filter(t => t.status === 'upcoming').length;
  const totalParticipants = (tournaments || []).reduce((sum, t) => sum + t.currentParticipants, 0);
  
  // Get nearest upcoming tournament
  const nearestTournament = (tournaments || [])
    .filter(t => t.status === 'upcoming')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">סקירה כללית</h2>
      
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען נתונים...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>טורנירים קרובים</CardDescription>
                <CardTitle className="text-3xl">{upcomingTournaments}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  to="/admin/tournaments" 
                  className="text-sm text-primary flex items-center hover:underline"
                >
                  <span>ניהול טורנירים</span>
                  <ArrowRight size={14} className="mr-1" />
                </Link>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>סה"כ משתתפים</CardDescription>
                <CardTitle className="text-3xl">{totalParticipants}</CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  to="/admin/users" 
                  className="text-sm text-primary flex items-center hover:underline"
                >
                  <span>ניהול משתמשים</span>
                  <ArrowRight size={14} className="mr-1" />
                </Link>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>אחוז תפוסה בטורנירים</CardDescription>
                <CardTitle className="text-3xl">
                  {(tournaments || []).length > 0
                    ? Math.round(
                        (totalParticipants / 
                        (tournaments || []).reduce((sum, t) => sum + t.maxParticipants, 0)) * 100
                      )
                    : 0}%
                </CardTitle>
              </CardHeader>
              <CardContent>
                <span className="text-sm text-muted-foreground">
                  מתוך קיבולת כוללת
                </span>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays size={20} />
                  <span>טורניר קרוב</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nearestTournament ? (
                  <div>
                    <h3 className="font-medium text-lg mb-2">{nearestTournament.title}</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">תאריך:</span>
                        <span>{new Date(nearestTournament.date).toLocaleDateString('he-IL')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">מיקום:</span>
                        <span>{nearestTournament.location}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">משתתפים:</span>
                        <span>{nearestTournament.currentParticipants} / {nearestTournament.maxParticipants}</span>
                      </div>
                      <div className="pt-3">
                        <Link 
                          to={`/admin/tournaments/${nearestTournament.id}`} 
                          className="text-primary hover:underline"
                        >
                          ניהול הטורניר
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">אין טורנירים קרובים</p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}