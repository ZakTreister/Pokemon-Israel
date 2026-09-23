import { useEffect, useState, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchPlayers,
  createQuarterlyPlayer,
  createTeamPlayer,
  updatePlayer,
  clearError,
} from '../../features/players/playersSlice';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import {
  Search,
  UserPlus,
  Users,
  AlertCircle,
  X,
  Pencil,
  ShieldCheck,
  CircleDot,
} from 'lucide-react';
import type { Player } from '../../types/player';

type FilterType = 'all' | 'team' | 'quarterly';

interface TeamFormData {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

interface QuarterlyFormData {
  firstName: string;
  lastName: string;
  club: string;
}

interface EditFormData {
  firstName: string;
  lastName: string;
  club: string;
  isActive: boolean;
}

export default function AdminPlayers() {
  const dispatch = useAppDispatch();
  const { players, isLoading, error } = useAppSelector((state) => state.players);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showQuarterlyModal, setShowQuarterlyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [teamForm, setTeamForm] = useState<TeamFormData>({
    firstName: '',
    lastName: '',
    username: '',
    password: '',
  });

  const [quarterlyForm, setQuarterlyForm] = useState<QuarterlyFormData>({
    firstName: '',
    lastName: '',
    club: '',
  });

  const [editForm, setEditForm] = useState<EditFormData>({
    firstName: '',
    lastName: '',
    club: '',
    isActive: true,
  });

  const loadPlayers = useCallback(() => {
    const params: { type?: 'team' | 'quarterly'; search?: string } = {};
    if (filterType !== 'all') params.type = filterType;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    dispatch(fetchPlayers(params));
  }, [dispatch, filterType, searchQuery]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const resetTeamForm = () => {
    setTeamForm({ firstName: '', lastName: '', username: '', password: '' });
    setFormError(null);
  };

  const resetQuarterlyForm = () => {
    setQuarterlyForm({ firstName: '', lastName: '', club: '' });
    setFormError(null);
  };

  const resetEditForm = () => {
    setEditForm({ firstName: '', lastName: '', club: '', isActive: true });
    setFormError(null);
  };

  const handleCreateTeamPlayer = async () => {
    if (!teamForm.firstName.trim() || !teamForm.lastName.trim() || !teamForm.username.trim() || !teamForm.password.trim()) {
      setFormError('כל השדות הם חובה');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      await dispatch(
        createTeamPlayer({
          firstName: teamForm.firstName.trim(),
          lastName: teamForm.lastName.trim(),
          username: teamForm.username.trim(),
          password: teamForm.password.trim(),
        })
      ).unwrap();
      resetTeamForm();
      setShowTeamModal(false);
      loadPlayers();
    } catch (err) {
      setFormError(err as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuarterlyPlayer = async () => {
    if (!quarterlyForm.firstName.trim() || !quarterlyForm.lastName.trim()) {
      setFormError('שם פרטי ושם משפחה הם חובה');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      await dispatch(
        createQuarterlyPlayer({
          firstName: quarterlyForm.firstName.trim(),
          lastName: quarterlyForm.lastName.trim(),
          club: quarterlyForm.club.trim(),
        })
      ).unwrap();
      resetQuarterlyForm();
      setShowQuarterlyModal(false);
      loadPlayers();
    } catch (err) {
      setFormError(err as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (player: Player) => {
    setSelectedPlayer(player);
    setEditForm({
      firstName: player.firstName,
      lastName: player.lastName,
      club: player.club || '',
      isActive: player.isActive,
    });
    setFormError(null);
    setShowEditModal(true);
  };

  const handleUpdatePlayer = async () => {
    if (!selectedPlayer) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      setFormError('שם פרטי ושם משפחה הם חובה');
      return;
    }
    try {
      setIsSubmitting(true);
      setFormError(null);
      await dispatch(
        updatePlayer({
          id: selectedPlayer.id,
          input: {
            firstName: editForm.firstName.trim(),
            lastName: editForm.lastName.trim(),
            club: editForm.club.trim() || null,
            isActive: editForm.isActive,
          },
        })
      ).unwrap();
      resetEditForm();
      setShowEditModal(false);
      setSelectedPlayer(null);
      loadPlayers();
    } catch (err) {
      setFormError(err as string);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPlayerTypeLabel = (playerType: string) => {
    return playerType === 'team' ? 'שחקן נבחרת' : 'שחקן חוגים';
  };

  const closeAllModals = () => {
    setShowTeamModal(false);
    setShowQuarterlyModal(false);
    setShowEditModal(false);
    setSelectedPlayer(null);
    resetTeamForm();
    resetQuarterlyForm();
    resetEditForm();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold">שחקנים</h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowTeamModal(true)} variant="default">
            <UserPlus size={18} className="ml-1" />
            <span>הוסף שחקן נבחרת</span>
          </Button>
          <Button onClick={() => setShowQuarterlyModal(true)} variant="outline">
            <CircleDot size={18} className="ml-1" />
            <span>הוסף שחקן חוגים</span>
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <Search className="h-5 w-5 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder="חפש לפי שם, משפחה או חוג..."
            className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium ml-2 leading-8">סוג:</span>
          <Button
            size="sm"
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => setFilterType('all')}
            className="ml-1"
          >
            הכל
          </Button>
          <Button
            size="sm"
            variant={filterType === 'team' ? 'default' : 'outline'}
            onClick={() => setFilterType('team')}
            className="ml-1"
          >
            שחקני נבחרת
          </Button>
          <Button
            size="sm"
            variant={filterType === 'quarterly' ? 'default' : 'outline'}
            onClick={() => setFilterType('quarterly')}
          >
            שחקני חוגים
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Players Table */}
      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען שחקנים...</div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שם פרטי</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שם משפחה</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">חוג</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">סוג</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">סטטוס</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">חשבון</th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-b border-border">
                    <td className="px-4 py-3 font-medium">{player.firstName}</td>
                    <td className="px-4 py-3 font-medium">{player.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{player.club || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          player.playerType === 'team'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-accent/10 text-accent'
                        }`}
                      >
                        {getPlayerTypeLabel(player.playerType)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          player.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {player.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {player.user ? (
                        <span className="flex items-center gap-1 text-success">
                          <ShieldCheck size={14} />
                          <span className="text-xs">{player.user.username}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(player)}
                      >
                        <Pencil size={14} className="ml-1" />
                        ערוך
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {players.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">לא נמצאו שחקנים התואמים את החיפוש</p>
            </div>
          )}
        </Card>
      )}

      {/* Add Team Player Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">הוסף שחקן נבחרת</h3>
              <button onClick={closeAllModals} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            {formError && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם פרטי *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={teamForm.firstName}
                  onChange={(e) => setTeamForm({ ...teamForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שם משפחה *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={teamForm.lastName}
                  onChange={(e) => setTeamForm({ ...teamForm, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שם משתמש *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={teamForm.username}
                  onChange={(e) => setTeamForm({ ...teamForm, username: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">סיסמה ראשונית *</label>
                <input
                  type="password"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={teamForm.password}
                  onChange={(e) => setTeamForm({ ...teamForm, password: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeAllModals} disabled={isSubmitting}>
                  ביטול
                </Button>
                <Button onClick={handleCreateTeamPlayer} disabled={isSubmitting}>
                  {isSubmitting ? 'יוצר...' : 'הוסף שחקן נבחרת'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Quarterly Player Modal */}
      {showQuarterlyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">הוסף שחקן חוגים</h3>
              <button onClick={closeAllModals} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            {formError && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם פרטי *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={quarterlyForm.firstName}
                  onChange={(e) => setQuarterlyForm({ ...quarterlyForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שם משפחה *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={quarterlyForm.lastName}
                  onChange={(e) => setQuarterlyForm({ ...quarterlyForm, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">חוג</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={quarterlyForm.club}
                  onChange={(e) => setQuarterlyForm({ ...quarterlyForm, club: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeAllModals} disabled={isSubmitting}>
                  ביטול
                </Button>
                <Button onClick={handleCreateQuarterlyPlayer} disabled={isSubmitting}>
                  {isSubmitting ? 'יוצר...' : 'הוסף שחקן חוגים'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Player Modal */}
      {showEditModal && selectedPlayer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">עריכת שחקן</h3>
              <button onClick={closeAllModals} className="text-muted-foreground hover:text-foreground">
                <X size={20} />
              </button>
            </div>
            {formError && (
              <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                {formError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">שם פרטי *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">שם משפחה *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">חוג</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  value={editForm.club}
                  onChange={(e) => setEditForm({ ...editForm, club: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="h-4 w-4"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                />
                <label htmlFor="isActive" className="text-sm font-medium">פעיל</label>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={closeAllModals} disabled={isSubmitting}>
                  ביטול
                </Button>
                <Button onClick={handleUpdatePlayer} disabled={isSubmitting}>
                  {isSubmitting ? 'מעדכן...' : 'שמור שינויים'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
