import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUserStats, fetchUserTournaments } from '../../features/user/userSlice';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Calendar, Lock, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

export default function PlayerDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, tournaments: userTournaments, isLoading: userLoading } = useAppSelector((state) => state.user);
  const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
  const { user } = useAppSelector((state) => state.auth);

  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordError, setPasswordError] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const handlePasswordChange = async () => {
    setPasswordError('');

    // Validation
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordError('כל השדות נדרשים');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordError('הסיסמה החדשה חייבת להיות לפחות 6 תווים');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('הסיסמאות החדשות אינן תואמות');
      return;
    }

    try {
      setIsChangingPassword(true);

      // First verify current password by trying to login
      await api.post('/api/auth/login', {
        username: user?.username,
        password: passwordData.currentPassword
      });

      // If login successful, update password
      await api.put('/api/auth/profile', {
        password: passwordData.newPassword
      });

      alert('הסיסמה שונתה בהצלחה!');
      
      // Reset form and close modal
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setShowPasswordModal(false);

    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.response?.status === 401) {
        setPasswordError('הסיסמה הנוכחית שגויה');
      } else {
        setPasswordError(error.response?.data?.message || 'שגיאה בשינוי הסיסמה');
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const resetPasswordModal = () => {
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordError('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setShowPasswordModal(false);
  };

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
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">שלום, {user?.name || user?.username}</h1>
          <p className="text-muted-foreground">ברוך הבא לאזור האישי שלך</p>
        </div>
        
        <Button 
          variant="outline" 
          onClick={() => setShowPasswordModal(true)}
          className="flex items-center gap-2"
        >
          <Lock size={16} />
          <span>שינוי סיסמה</span>
        </Button>
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

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock size={20} />
              <span>שינוי סיסמה</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה נוכחית *</label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    className="w-full px-3 py-2 border border-input rounded-md pr-10"
                    placeholder="הזן סיסמה נוכחית"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => togglePasswordVisibility('current')}
                  >
                    {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">סיסמה חדשה *</label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    className="w-full px-3 py-2 border border-input rounded-md pr-10"
                    placeholder="הזן סיסמה חדשה (לפחות 6 תווים)"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => togglePasswordVisibility('new')}
                  >
                    {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">אימות סיסמה חדשה *</label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    className="w-full px-3 py-2 border border-input rounded-md pr-10"
                    placeholder="הזן שוב את הסיסמה החדשה"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 left-3 transform -translate-y-1/2 text-muted-foreground"
                    onClick={() => togglePasswordVisibility('confirm')}
                  >
                    {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {passwordError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {passwordError}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={resetPasswordModal}
                  disabled={isChangingPassword}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handlePasswordChange}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'משנה סיסמה...' : 'שנה סיסמה'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}