import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchTeams,
  fetchManageablePlayers,
  createTeam,
  updateTeam,
  assignPlayer,
  removePlayer,
  clearError,
} from '../../features/teams/teamsSlice';
import { fetchActiveSeason } from '../../features/seasons/seasonsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { Plus, Edit2, Power, UserPlus, UserMinus, Shield, AlertCircle } from 'lucide-react';
import type { Team } from '../../types/team';
import type { ManageablePlayer } from '../../types/team';

export default function ManageTeams() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { teams, manageablePlayers, isLoading, error } = useAppSelector((state) => state.teams);
  const { activeSeason } = useAppSelector((state) => state.seasons);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [assigningToTeam, setAssigningToTeam] = useState<Team | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchTeams());
    dispatch(fetchManageablePlayers());
    dispatch(fetchActiveSeason());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const isLocked = !!activeSeason;

  const handleCreate = async () => {
    if (!newTeamName.trim()) return;
    try {
      setIsSubmitting(true);
      await dispatch(createTeam({ name: newTeamName.trim() })).unwrap();
      showToast('הנבחרת נוצרה בהצלחה', 'success');
      setNewTeamName('');
      setShowCreateForm(false);
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRename = async () => {
    if (!editingTeam || !editName.trim()) return;
    try {
      setIsSubmitting(true);
      await dispatch(updateTeam({ id: editingTeam.id, input: { name: editName.trim() } })).unwrap();
      showToast('הנבחרת עודכנה בהצלחה', 'success');
      setEditingTeam(null);
      setEditName('');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (team: Team) => {
    const action = team.isActive ? 'להשבית' : 'להפעיל';
    const confirmed = await showConfirm({
      title: `${action} נבחרת`,
      message: `האם אתה בטוח שברצונך ${action} את הנבחרת "${team.name}"?`,
      confirmText: action,
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      await dispatch(updateTeam({ id: team.id, input: { isActive: !team.isActive } })).unwrap();
      showToast('הנבחרת עודכנה בהצלחה', 'success');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assigningToTeam || !selectedPlayerId) return;

    const selectedPlayer = manageablePlayers.find((p) => p.id === selectedPlayerId);
    const isTransfer = selectedPlayer?.team && selectedPlayer.team.id !== assigningToTeam.id;

    if (isTransfer) {
      const confirmed = await showConfirm({
        title: 'העברת שחקן בין נבחרות',
        message: `השחקן ${selectedPlayer!.firstName} ${selectedPlayer!.lastName} משויך כעת לנבחרת "${selectedPlayer!.team!.name}". האם להעבירו לנבחרת "${assigningToTeam.name}"?`,
        confirmText: 'העבר',
        cancelText: 'ביטול',
        variant: 'destructive',
      });
      if (!confirmed) return;
    }

    try {
      setIsSubmitting(true);
      await dispatch(assignPlayer({ teamId: assigningToTeam.id, playerId: selectedPlayerId })).unwrap();
      await dispatch(fetchManageablePlayers());
      showToast('השחקן שויך לנבחרת בהצלחה', 'success');
      setAssigningToTeam(null);
      setSelectedPlayerId('');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemovePlayer = async (team: Team, player: ManageablePlayer) => {
    const confirmed = await showConfirm({
      title: 'הסרת שחקן מנבחרת',
      message: `האם אתה בטוח שברצונך להסיר את ${player.firstName} ${player.lastName} מהנבחרת "${team.name}"?`,
      confirmText: 'הסר',
      cancelText: 'ביטול',
      variant: 'destructive',
    });
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      await dispatch(removePlayer({ teamId: team.id, playerId: player.id })).unwrap();
      await dispatch(fetchManageablePlayers());
      showToast('השחקן הוסר מהנבחרת בהצלחה', 'success');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const playersForTeam = (teamId: string) =>
    manageablePlayers.filter((p) => p.team?.id === teamId && p.isActive);

  const availablePlayersForAssignment = (currentTeamId: string) =>
    manageablePlayers.filter(
      (p) =>
        p.isActive &&
        p.team?.id !== currentTeamId
    );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ניהול נבחרות</h2>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)} disabled={isLocked}>
            <Plus size={18} className="ml-1" />
            <span>נבחרת חדשה</span>
          </Button>
        )}
      </div>

      {isLocked && (
        <div className="mb-4 p-3 rounded-md bg-warning/10 text-warning text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          יש עונה פעילה - שינויי מבנה נבחרות נעולים
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {showCreateForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>יצירת נבחרת חדשה</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <input
                type="text"
                className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                placeholder="שם הנבחרת"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTeamName.trim()) handleCreate();
                }}
              />
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setNewTeamName('');
                }}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button onClick={handleCreate} disabled={isSubmitting || !newTeamName.trim()}>
                {isSubmitting ? 'יוצר...' : 'צור'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען נתונים...</div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12">
          <Shield size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין נבחרות עדיין</p>
        </div>
      ) : (
        <div className="space-y-4">
          {teams.map((team) => {
            const available = availablePlayersForAssignment(team.id);
            return (
            <Card key={team.id} className={!team.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{team.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        team.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {team.isActive ? 'פעילה' : 'לא פעילה'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {team.playerCount} שחקנים
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTeam(team);
                        setEditName(team.name);
                      }}
                      disabled={isLocked || isSubmitting}
                    >
                      <Edit2 size={16} className="ml-1" />
                      <span>שנה שם</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(team)}
                      disabled={isLocked || isSubmitting}
                    >
                      <Power size={16} className="ml-1" />
                      <span>{team.isActive ? 'השבת' : 'הפעל'}</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssigningToTeam(team);
                        setSelectedPlayerId('');
                      }}
                      disabled={isLocked || isSubmitting || available.length === 0}
                    >
                      <UserPlus size={16} className="ml-1" />
                      <span>שייך שחקן</span>
                    </Button>
                  </div>
                </div>

                {editingTeam?.id === team.id && (
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && editName.trim()) handleRename();
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingTeam(null);
                        setEditName('');
                      }}
                      disabled={isSubmitting}
                    >
                      ביטול
                    </Button>
                    <Button size="sm" onClick={handleRename} disabled={isSubmitting || !editName.trim()}>
                      {isSubmitting ? 'שומר...' : 'שמור'}
                    </Button>
                  </div>
                )}

                {assigningToTeam?.id === team.id && (
                  <div className="flex gap-2 mb-4 p-3 rounded-md bg-muted">
                    <select
                      className="flex-1 px-3 py-2 border border-input rounded-md bg-background"
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                    >
                      <option value="">בחר שחקן...</option>
                      {available.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                          {p.team ? ` (מנבחרת: ${p.team.name})` : ' (לא משויך)'}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setAssigningToTeam(null);
                        setSelectedPlayerId('');
                      }}
                      disabled={isSubmitting}
                    >
                      ביטול
                    </Button>
                    <Button size="sm" onClick={handleAssign} disabled={isSubmitting || !selectedPlayerId}>
                      {isSubmitting ? 'משייך...' : 'שייך'}
                    </Button>
                  </div>
                )}

                {playersForTeam(team.id).length > 0 && (
                  <div className="border-t border-border pt-3">
                    <p className="text-sm font-medium text-muted-foreground mb-2">סגל נוכחי:</p>
                    <div className="flex flex-wrap gap-2">
                      {playersForTeam(team.id).map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm"
                        >
                          <span>{player.firstName} {player.lastName}</span>
                          <button
                            onClick={() => handleRemovePlayer(team, player)}
                            disabled={isLocked || isSubmitting}
                            className="text-muted-foreground hover:text-destructive transition-colors"
                            aria-label="הסר מהנבחרת"
                          >
                            <UserMinus size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
