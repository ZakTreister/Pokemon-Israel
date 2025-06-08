import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchTournaments } from '../features/tournaments/tournamentsSlice';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { Calendar, MapPin, User, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

export default function HomePage() {
  const dispatch = useAppDispatch();
  const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
  const { updates, isLoading: updatesLoading } = useAppSelector((state) => state.updates);
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchTournaments());
    dispatch(fetchUpdates());
  }, [dispatch]);

  // Get upcoming tournaments - with type safety check
  const upcomingTournaments = Array.isArray(tournaments) 
    ? tournaments
        .filter((tournament) => tournament.status === 'upcoming')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 3)
    : [];

  return (
    <div className="bg-background">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-pokemon-fire to-pokemon-dragon overflow-hidden">
        <div className="absolute inset-0 bg-black/20 z-10"></div>
        <div className="container relative z-20">
          <div className="max-w-3xl mx-auto text-center text-white">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              פוקימון טורנירים ישראל
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              המערכת המובילה לניהול תחרויות פוקימון, מעקב דירוגים ופרופילים של שחקנים
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" asChild>
                <Link to="/tournaments">צפה בטורנירים</Link>
              </Button>
              {!isAuthenticated && (
                <Button variant="outline" size="lg" asChild>
                  <Link to="/login">התחבר</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments Section */}
      <section className="py-16">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold mb-2">טורנירים קרובים</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              בחר את הטורניר הבא שלך והרשם עוד היום
            </p>
          </div>

          {tournamentsLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse">טוען טורנירים...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {upcomingTournaments.map((tournament) => (
                <Card key={tournament.id} className="overflow-hidden group transition-all duration-300 hover:shadow-lg">
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={tournament.image}
                      alt={tournament.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                      <h3 className="text-white text-xl font-bold">{tournament.title}</h3>
                    </div>
                  </div>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar size={18} />
                        <span>{new Date(tournament.date).toLocaleDateString('he-IL')}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin size={18} />
                        <span>{tournament.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User size={18} />
                        <span>
                          {tournament.currentParticipants} / {tournament.maxParticipants} משתתפים
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Trophy size={18} />
                        <span>
                          פרסים: {tournament.prizePool}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button className="w-full" asChild>
                      <Link to={`/tournaments/${tournament.id}`}>פרטים והרשמה</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Button variant="outline" asChild>
              <Link to="/tournaments">צפה בכל הטורנירים</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Recent Updates Section */}
      <section className="py-16 bg-muted">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold mb-2">עדכונים אחרונים</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              הישאר מעודכן בחדשות ועדכונים
            </p>
          </div>

          {updatesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-pulse">טוען עדכונים...</div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(Array.isArray(updates) ? updates : []).map((update) => (
                <Card key={update.id} className="animate-slide-in">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{update.title}</CardTitle>
                        <CardDescription>
                          {formatDistanceToNow(new Date(update.date), { 
                            addSuffix: true, 
                            locale: he 
                          })}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p>{update.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-card">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              מוכן להתחיל?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              הצטרף לקהילת שחקני הפוקימון הגדולה בישראל והתחל להשתתף בטורנירים
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Button size="lg\" asChild>
                  <Link to="/dashboard">לאזור האישי</Link>
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <Link to="/login">התחבר</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}