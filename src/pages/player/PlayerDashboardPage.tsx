import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUserStats, fetchUserTournaments } from '../../features/user/userSlice';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Calendar, User } from 'lucide-react';
import { useProfileEditor } from '../../features/user/hooks/useProfileEditor';
import ProfileEditModal from '../../features/user/components/ProfileEditModal';

export default function PlayerDashboardPage() {
  const dispatch = useAppDispatch();
  const profileEditor = useProfileEditor();
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
    <div className="cs-workspace container py-8">
      <div className="mb-8 flex flex-wrap justify-between items-start gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground mb-2">שלום, {user?.name || user?.username}</h1>
          <p className="text-muted-foreground">ברוך הבא לאזור האישי שלך</p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={profileEditor.handleProfileEdit}
          className="flex items-center gap-2"
        >
          <User size={16} />
          <span>עריכת פרופיל</span>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4 mb-7">
        <StatCard icon={<Calendar size={20} />} value={stats?.totalTournaments || 0} label="טורנירים שיחקת" />
        <StatCard icon={<Trophy size={20} />} value={stats?.wins || 0} label="ניצחונות" accent="gold" />
        <StatCard icon={<Medal size={20} />} value={stats?.draws || 0} label="תיקו" accent="navy" />
        <StatCard icon={<User size={20} />} value={stats?.losses || 0} label="הפסדים" accent="red" />
      </div>
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-3 mb-8">
        <StatCard icon={<Award size={20} />} value={`${stats?.winRate?.toFixed(1) || 0}%`} label="יחס ניצחונות" />
        <StatCard icon={<Trophy size={20} />} value={stats?.points || 0} label="נקודות" />
        <StatCard icon={<Medal size={20} />} value={stats?.bestRank || '-'} label="מיקום הטוב ביותר" accent="gold" />
      </div>

      <div className="grid min-w-0 grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-5">
        <div className="min-w-0 space-y-8">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground mb-4">היסטוריית טורנירים</h2>
            {userTournaments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">
                    טרם השתתפת בטורנירים
                  </p>
                  <Link to="/tournaments">
                    <Button>מצא טורנירים</Button>
                  </Link>
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
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 text-center">
                        <div>
                          <p className="text-muted-foreground text-sm">מיקום</p>
                          <p className="font-bold text-xl">{tournament.result.position}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">ניצחונות</p>
                          <p className="font-bold text-xl text-success">{tournament.result.wins}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground text-sm">תיקו</p>
                          <p className="font-bold text-xl text-warning">{tournament.result.draws}</p>
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
            <h2 className="text-2xl font-extrabold text-foreground mb-4">טורנירים קרובים</h2>
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
                      <Link to={`/tournaments/${tournament.id}`} className="w-full">
                        <Button variant="outline" className="w-full">פרטים והרשמה</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-foreground mb-4">הישגים</h2>
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
                      <div className="bg-blue-50 dark:bg-blue-500/15 p-2 rounded-full">
                        {achievement.title.includes('אלוף') ? (
                          <Trophy className="h-5 w-5 text-gold-600" />
                        ) : achievement.title.includes('ניצחונות') ? (
                          <Award className="h-5 w-5 text-blue-500" />
                        ) : (
                          <Medal className="h-5 w-5 text-blue-500" />
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

      {profileEditor.showProfileModal && <ProfileEditModal editor={profileEditor} />}
    </div>
  );
}
