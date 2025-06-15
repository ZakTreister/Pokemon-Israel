import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Search, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../services/api';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'player' | 'admin';
  tournaments: number;
}

interface UserFormData {
  name: string;
  username: string;
  password: string;
  role: 'player' | 'admin';
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'player' | 'admin'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form data for add/edit user
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    username: '',
    password: '',
    role: 'player'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get('/api/users');
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'player'
    });
  };

  const handleAddUser = async () => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      if (!formData.name || !formData.username || !formData.password) {
        setError('שם, שם משתמש וסיסמה הם שדות חובה');
        return;
      }

      // Create user
      const userData = {
        name: formData.name,
        username: formData.username,
        password: formData.password,
        role: formData.role
      };

      const { data } = await api.post('/api/auth/register', userData);
      
      // Add the new user to the list
      const newUser: User = {
        id: data.user.id,
        name: data.user.name,
        username: data.user.username,
        role: data.user.role,
        tournaments: 0
      };
      
      setUsers([...users, newUser]);
      
      // Reset form and close modal
      resetForm();
      setShowAddModal(false);
      
      alert('המשתמש נוצר בהצלחה!');
      
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.response?.data?.message || 'שגיאה ביצירת המשתמש');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      if (!formData.name || !formData.username) {
        setError('שם ושם משתמש הם שדות חובה');
        return;
      }

      // Update user
      const updateData = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
        ...(formData.password && { password: formData.password }) // Only include password if provided
      };

      await api.put(`/api/users/${selectedUser.id}`, updateData);
      
      // Update the user in the list
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...updateData }
          : user
      ));
      
      // Reset form and close modal
      resetForm();
      setShowEditModal(false);
      setSelectedUser(null);
      
      alert('המשתמש עודכן בהצלחה!');
      
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.response?.data?.message || 'שגיאה בעדכון המשתמש');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
      return;
    }

    try {
      await api.delete(`/api/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
      alert('המשתמש נמחק בהצלחה');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      password: '', // Don't pre-fill password
      role: user.role
    });
    setShowEditModal(true);
  };

  const handleCloseModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedUser(null);
    resetForm();
    setError(null);
  };

  // Filter users with proper null checks
  const filteredUsers = users.filter((user) => {
    // Ensure user properties exist and are strings before calling toLowerCase
    const name = user.name || '';
    const username = user.username || '';
    
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ניהול משתמשים</h2>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus size={18} className="ml-1" />
          <span>משתמש חדש</span>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="חפש לפי שם או שם משתמש..."
            className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div>
            <span className="text-sm font-medium ml-2">תפקיד:</span>
            <Button
              size="sm"
              variant={filterRole === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterRole('all')}
              className="ml-1"
            >
              הכל
            </Button>
            <Button
              size="sm"
              variant={filterRole === 'player' ? 'default' : 'outline'}
              onClick={() => setFilterRole('player')}
              className="ml-1"
            >
              שחקנים
            </Button>
            <Button
              size="sm"
              variant={filterRole === 'admin' ? 'default' : 'outline'}
              onClick={() => setFilterRole('admin')}
            >
              מנהלים
            </Button>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען משתמשים...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שם</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שם משתמש</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תפקיד</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">טורנירים</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.name || 'לא זמין'}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.username || 'לא זמין'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-primary/10 text-primary' 
                          : 'bg-secondary/10 text-secondary'
                      }`}>
                        {user.role === 'admin' ? 'מנהל' : 'שחקן'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.tournaments || 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleEditClick(user)}
                        >
                          ערוך
                        </Button>
                        {user.role !== 'admin' && (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            מחק
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">לא נמצאו משתמשים התואמים את החיפוש</p>
            </div>
          )}
        </Card>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">הוספת משתמש חדש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם מלא"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שם משתמש *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם משתמש"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה *</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן סיסמה"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תפקיד</label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as 'player' | 'admin'})}
                >
                  <option value="player">שחקן</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={handleCloseModals}
                  disabled={isSubmitting}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'יוצר משתמש...' : 'הוסף משתמש'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">עריכת משתמש</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם מלא"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שם משתמש *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם משתמש"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה חדשה (אופציונלי)</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="השאר ריק לשמירת הסיסמה הנוכחית"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תפקיד</label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as 'player' | 'admin'})}
                >
                  <option value="player">שחקן</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={handleCloseModals}
                  disabled={isSubmitting}
                >
                  ביטול
                </Button>
                <Button
                  onClick={handleEditUser}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'מעדכן משתמש...' : 'שמור שינויים'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}