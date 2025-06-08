import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUserStats, fetchUserTournaments } from '../../features/user/userSlice';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Calendar } from 'lucide-react';

export default function PlayerDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, tournaments: userTournaments, isLoading: userLoading } = useAppSelector((state) => state.user);
  const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchUserStats());
    dispatch(fetchUserTournaments());
    dispatch(fetchTournaments());
  }, [dispatch]);

  // Get upcoming tournaments
  const upcomingTournaments = tournaments
    .filter((tournament) => tournament.status === 'upcoming')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 3);

  if (userLoading) {
    return (
      <div className="container py-16">
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="animate-pulse">טוען נתוני משתמש...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">שלום, {user?.username}</h1>
        <p className="text-muted-foreground">ברוך הבא לאזור האישי שלך</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>טורנירים שיחקת</CardDescription>
            <CardTitle className="text-3xl">{stats?.totalTournaments || 0}</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>יחס ניצחונות</CardDescription>
            <CardTitle className="text-3xl">{stats?.winRate?.toFixed(1) || 0}%</CardTitle>
          </CardHeader>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>נקודות</CardDescription>
            <CardTitle className="text-3xl">{stats?.points || 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">היסטוריית טורנירים</h2>
            {userTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    טרם השתתפת בטורנירים
                  </p>
                  <Button asChild>
                    <Link to="/tournaments">מצא טורנירים</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userTournaments.map((tournament) => (
                  <Card key={tournament.id}>
                    <CardHeader className="pb-2">
                      <CardTitle>{tournament.title}</CardTitle>
                      <CardDescription>
                        {new Date(tournament.date).toLocaleDateString('he-IL')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-4 gap-4 text-center">
                        <div>
                          <p className="text-muted-foreground text-sm">מיקום</p>
                          <p className="font-bold text-xl">{tournament.result.position}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">נצחונות</p>
                          <p className="font-bold text-xl text-success">{tournament.result.wins}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">הפסדים</p>
                          <p className="font-bold text-xl text-destructive">{tournament.result.losses}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">נקודות</p>
                          <p className="font-bold text-xl">{tournament.result.points}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold mb-4">טורנירים קרובים</h2>
            {tournamentsLoading ? (
              <div className="animate-pulse p-4">טוען טורנירים...</div>
            ) : upcomingTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground">
                    אין טורנירים קרובים כרגע
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {upcomingTournaments.map((tournament) => (
                  <Card key={tournament.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">{tournament.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(tournament.date).toLocaleDateString('he-IL')}
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2">
                      <Button variant="outline" asChild className="w-full">
                        <Link to={`/tournaments/${tournament.id}`}>פרטים והרשמה</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-4">הישגים</h2>
            {!stats?.achievements || stats.achievements.length === 0 ? (
              <Card>
                <CardContent className="py-6 text-center">
                  <p className="text-muted-foreground">
                    אין הישגים עדיין
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {stats.achievements.map((achievement) => (
                  <Card key={achievement.id}>
                    <div className="flex p-4 items-center gap-3">
                      <div className="bg-primary/10 p-2 rounded-full">
                        {achievement.title.includes('אלוף') ? (
                          <Trophy className="h-5 w-5 text-primary" />
                        ) : achievement.title.includes('ניצחונות') ? (
                          <Award className="h-5 w-5 text-primary" />
                        ) : (
                          <Medal className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{achievement.title}</p>
                        <p className="text-sm text-muted-foreground">{achievement.description}</p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}