import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUserStats, fetchUserTournaments } from '../../features/user/userSlice';
import { fetchTournaments } from '../../features/tournaments/tournamentsSlice';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Link } from 'react-router-dom';
import { Trophy, Medal, Award, Calendar, User, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

export default function PlayerDashboardPage() {
  const dispatch = useAppDispatch();
  const { stats, tournaments: userTournaments, isLoading: userLoading } = useAppSelector((state) => state.user);
  const { tournaments, isLoading: tournamentsLoading } = useAppSelector((state) => state.tournaments);
  const { user } = useAppSelector((state) => state.auth);

  // Profile editing state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    username: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [profileError, setProfileError] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [changePassword, setChangePassword] = useState(false);

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

  const handleProfileEdit = () => {
    setProfileData({
      name: user?.name || '',
      username: user?.username || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setChangePassword(false);
    setShowProfileModal(true);
  };

  const handleProfileUpdate = async () => {
    setProfileError('');

    // Basic validation
    if (!profileData.name.trim() || !profileData.username.trim()) {
      setProfileError('שם ושם משתמש הם שדות חובה');
      return;
    }

    if (profileData.username.length < 3) {
      setProfileError('שם המשתמש חייב להיות לפחות 3 תווים');
      return;
    }

    // Password validation if changing password
    if (changePassword) {
      if (!profileData.currentPassword) {
        setProfileError('יש להזין את הסיסמה הנוכחית');
        return;
      }

      if (!profileData.newPassword) {
        setProfileError('יש להזין סיסמה חדשה');
        return;
      }

      if (profileData.newPassword.length < 6) {
        setProfileError('הסיסמה החדשה חייבת להיות לפחות 6 תווים');
        return;
      }

      if (profileData.newPassword !== profileData.confirmPassword) {
        setProfileError('הסיסמאות החדשות אינן תואמות');
        return;
      }
    }

    try {
      setIsUpdatingProfile(true);

      // If changing password, verify current password first
      if (changePassword) {
        await api.post('/api/auth/login', {
          username: user?.username,
          password: profileData.currentPassword
        });
      }

      // Update profile
      const updateData: any = {
        name: profileData.name.trim(),
        username: profileData.username.trim()
      };

      if (changePassword) {
        updateData.password = profileData.newPassword;
      }

      await api.put('/api/auth/profile', updateData);

      alert('הפרופיל עודכן בהצלחה!');
      
      // Reset form and close modal
      resetProfileModal();
      
      // Refresh the page to update user data in the UI
      window.location.reload();

    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.response?.status === 401) {
        setProfileError('הסיסמה הנוכחית שגויה');
      } else if (error.response?.status === 400 && error.response?.data?.message?.includes('username')) {
        setProfileError('שם המשתמש כבר קיים במערכת');
      } else {
        setProfileError(error.response?.data?.message || 'שגיאה בעדכון הפרופיל');
      }
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const resetProfileModal = () => {
    setProfileData({
      name: '',
      username: '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setProfileError('');
    setShowPasswords({
      current: false,
      new: false,
      confirm: false
    });
    setChangePassword(false);
    setShowProfileModal(false);
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
          onClick={handleProfileEdit}
          className="flex items-center gap-2"
        >
          <User size={16} />
          <span>עריכת פרופיל</span>
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

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <User size={20} />
              <span>עריכת פרופיל</span>
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם מלא *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם מלא"
                  value={profileData.name}
                  onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">שם משתמש *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם משתמש (לפחות 3 תווים)"
                  value={profileData.username}
                  onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  שם המשתמש משמש להתחברות למערכת
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="checkbox"
                    id="changePassword"
                    className="rounded border-input"
                    checked={changePassword}
                    onChange={(e) => setChangePassword(e.target.checked)}
                  />
                  <label htmlFor="changePassword" className="text-sm font-medium">
                    שינוי סיסמה
                  </label>
                </div>

                {changePassword && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">סיסמה נוכחית *</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          className="w-full px-3 py-2 border border-input rounded-md pr-10"
                          placeholder="הזן סיסמה נוכחית"
                          value={profileData.currentPassword}
                          onChange={(e) => setProfileData({...profileData, currentPassword: e.target.value})}
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
                          value={profileData.newPassword}
                          onChange={(e) => setProfileData({...profileData, newPassword: e.target.value})}
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
                          value={profileData.confirmPassword}
                          onChange={(e) => setProfileData({...profileData, confirmPassword: e.target.value})}
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
                  </div>
                )}
              </div>

              {profileError && (
                <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                  {profileError}
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={resetProfileModal}
                  disabled={isUpdatingProfile}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleProfileUpdate}
                  disabled={isUpdatingProfile}
                >
                  {isUpdatingProfile ? 'מעדכן פרופיל...' : 'שמור שינויים'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}