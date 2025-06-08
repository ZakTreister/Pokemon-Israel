import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { Search, UserPlus } from 'lucide-react';
import Button from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import api from '../../services/api';

interface User {
  id: string;
  username: string;
  email: string | null;
  phone: string;
  role: 'player' | 'admin';
  status: 'active' | 'inactive' | 'blocked';
  tournaments: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'player' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'blocked'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

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

  const handleStatusChange = async (userId: string, newStatus: 'active' | 'inactive' | 'blocked') => {
    try {
      await api.put(`/api/users/${userId}/status`, { status: newStatus });
      setUsers(users.map(user => 
        user.id === userId ? { ...user, status: newStatus } : user
      ));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את המשתמש?')) {
      return;
    }

    try {
      await api.delete(`/api/users/${userId}`);
      setUsers(users.filter(user => user.id !== userId));
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Filter users
  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      user.phone.includes(searchQuery);
    
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    
    return matchesSearch && matchesRole && matchesStatus;
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
            placeholder="חפש לפי שם משתמש, אימייל או טלפון..."
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
          
          <div>
            <span className="text-sm font-medium ml-2">סטטוס:</span>
            <Button
              size="sm"
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('all')}
              className="ml-1"
            >
              הכל
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'active' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('active')}
              className="ml-1"
            >
              פעילים
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'inactive' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('inactive')}
              className="ml-1"
            >
              לא פעילים
            </Button>
            <Button
              size="sm"
              variant={filterStatus === 'blocked' ? 'default' : 'outline'}
              onClick={() => setFilterStatus('blocked')}
            >
              חסומים
            </Button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען משתמשים...</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          {error}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שם משתמש</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">אימייל</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">טלפון</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תפקיד</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">סטטוס</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">טורנירים</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{user.username}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.email || '-'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.phone}
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
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active' 
                          ? 'bg-success/10 text-success' 
                          : user.status === 'inactive'
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {user.status === 'active' 
                          ? 'פעיל' 
                          : user.status === 'inactive'
                          ? 'לא פעיל'
                          : 'חסום'
                        }
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.tournaments}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowEditModal(true);
                          }}
                        >
                          ערוך
                        </Button>
                        {user.status === 'active' ? (
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleStatusChange(user.id, 'blocked')}
                          >
                            חסום
                          </Button>
                        ) : (
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={() => handleStatusChange(user.id, 'active')}
                          >
                            הפעל
                          </Button>
                        )}
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
                <label className="block text-sm font-medium mb-1">שם משתמש</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם משתמש"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן אימייל"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">טלפון</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן מספר טלפון"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן סיסמה"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תפקיד</label>
                <select className="w-full px-3 py-2 border border-input rounded-md bg-background">
                  <option value="player">שחקן</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => {
                    // Handle user creation
                    setShowAddModal(false);
                  }}
                >
                  הוסף משתמש
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
                <label className="block text-sm font-medium mb-1">שם משתמש</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן שם משתמש"
                  defaultValue={selectedUser.username}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אימייל</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן אימייל"
                  defaultValue={selectedUser.email || ''}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">טלפון</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="הזן מספר טלפון"
                  defaultValue={selectedUser.phone}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה חדשה</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-input rounded-md"
                  placeholder="השאר ריק לשמירת הסיסמה הנוכחית"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תפקיד</label>
                <select 
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  defaultValue={selectedUser.role}
                >
                  <option value="player">שחקן</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                  }}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => {
                    // Handle user update
                    setShowEditModal(false);
                    setSelectedUser(null);
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