import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../hooks/redux';
import {
  fetchTeams,
  fetchManageablePlayers,
  updateTeam,
  assignPlayer,
  removePlayer,
  clearError,
} from '../teamsSlice';
import ImageUpload from '../../../components/ui/ImageUpload';
import { requestError } from '../../../utils/requestError';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/ToastProvider';
import { useConfirm } from '../../../components/ui/ConfirmProvider';
import {
  Edit2,
  Power,
  UserPlus,
  UserMinus,
  Shield,
  AlertCircle,
} from 'lucide-react';
import teamsService from '../teamsService';
import NavigableRow from '../../../components/ui/NavigableRow';
import type { StaffTeacher } from '../../../types/team';
import type { Team } from '../../../types/team';
import type { ManageablePlayer } from '../../../types/team';

export default function TeamAdministration({
  teamId,
  onChanged,
}: {
  teamId: string;
  onChanged: () => Promise<void>;
}) {
  const admin = useAppSelector((state) => state.auth.user?.role === 'admin');
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { showConfirm } = useConfirm();
  const { teams, manageablePlayers, isLoading, error } = useAppSelector(
    (state) => state.teams,
  );

  const [teachers, setTeachers] = useState<StaffTeacher[]>([]);
  const [teacher, setTeacher] = useState('');
  useEffect(() => {
    if (admin)
      teamsService
        .getTeachers()
        .then(setTeachers)
        .catch((e) => showToast(requestError(e), 'error'));
  }, [admin, showToast]);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState('');
  const [editPublicId, setEditPublicId] = useState('');
  const [assigningToTeam, setAssigningToTeam] = useState<Team | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchTeams());
    dispatch(fetchManageablePlayers());

    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleRename = async () => {
    if (uploading || isSubmitting || !editingTeam || !editName.trim()) return;
    try {
      setIsSubmitting(true);
      await dispatch(
        updateTeam({
          id: editingTeam.id,
          input: {
            name: editName.trim(),
            logo: editLogo.trim(),
            logoPublicId: editPublicId,
            ...(teacher ? { teacher } : {}),
          },
        }),
      ).unwrap();
      await onChanged();
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
      await dispatch(
        updateTeam({ id: team.id, input: { isActive: !team.isActive } }),
      ).unwrap();
      await onChanged();
      showToast('הנבחרת עודכנה בהצלחה', 'success');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    if (!assigningToTeam || !selectedPlayerId) return;

    const selectedPlayer = manageablePlayers.find(
      (p) => p.id === selectedPlayerId,
    );
    const isTransfer =
      selectedPlayer?.team && selectedPlayer.team.id !== assigningToTeam.id;

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
      await dispatch(
        assignPlayer({
          teamId: assigningToTeam.id,
          playerId: selectedPlayerId,
        }),
      ).unwrap();
      await dispatch(fetchManageablePlayers());
      await onChanged();
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
      await dispatch(
        removePlayer({ teamId: team.id, playerId: player.id }),
      ).unwrap();
      await dispatch(fetchManageablePlayers());
      await onChanged();
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
    manageablePlayers.filter((p) => p.isActive && p.team?.id !== currentTeamId);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">הגדרות נבחרת</h2>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
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
          {teams
            .filter((team) => team.id === teamId)
            .map((team) => {
              const available = availablePlayersForAssignment(team.id);
              return (
                <Card
                  key={team.id}
                  className={`border-s-4 border-s-blue-500 ${!team.isActive ? 'opacity-60' : ''}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <Shield
                            size={20}
                            className="shrink-0 text-blue-500"
                          />
                          <Link
                            to={`/manage/teams/${team.id}`}
                            className="font-bold text-lg hover:text-blue-500"
                          >
                            {team.name}
                          </Link>
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              team.isActive
                                ? 'bg-success/10 text-success'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {team.isActive ? 'פעילה' : 'לא פעילה'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {team.playerCount} שחקנים
                        </p>
                      </div>

                      {admin && (
                        <div className="flex w-full flex-wrap gap-2 border-t border-border pt-3">
                          <Button
                            contextual
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingTeam(team);
                              setEditName(team.name);
                              setEditLogo(team.logo || '');
                              setEditPublicId(team.logoPublicId || '');
                              setTeacher(team.teacher?.id || '');
                            }}
                            disabled={uploading || isSubmitting}
                          >
                            <Edit2 size={16} className="ml-1" />
                            <span>שם, סמל ומורה</span>
                          </Button>
                          <Button
                            contextual
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleActive(team)}
                            disabled={uploading || isSubmitting}
                          >
                            <Power size={16} className="ml-1" />
                            <span>{team.isActive ? 'השבת' : 'הפעל'}</span>
                          </Button>
                          <Button
                            contextual
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAssigningToTeam(team);
                              setSelectedPlayerId('');
                            }}
                            disabled={
                              !team.isActive ||
                              isSubmitting ||
                              available.length === 0
                            }
                          >
                            <UserPlus size={16} className="ml-1" />
                            <span>שייך שחקן</span>
                          </Button>
                        </div>
                      )}
                    </div>

                    {admin && editingTeam?.id === team.id && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <div className="w-full">
                          <ImageUpload
                            label="סמל הנבחרת"
                            value={editLogo}
                            onChange={(image) => {
                              setEditLogo(image?.secureUrl || '');
                              setEditPublicId(image?.publicId || '');
                            }}
                            onBusyChange={setUploading}
                            disabled={isSubmitting}
                          />
                        </div>
                        <label>
                          מורה הנבחרת
                          <select
                            aria-label="מורה הנבחרת"
                            value={teacher}
                            onChange={(e) => setTeacher(e.target.value)}
                            className="p-2 border rounded-md bg-background"
                          >
                            <option value="">בחרו מורה</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} ·{' '}
                                {t.role === 'admin' ? 'מנהל' : 'שופט'}
                              </option>
                            ))}
                          </select>
                        </label>
                        <input
                          type="text"
                          className="min-w-0 flex-1 px-3 py-2 border border-input rounded-md bg-background"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && editName.trim())
                              handleRename();
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingTeam(null);
                            setEditName('');
                          }}
                          disabled={uploading || isSubmitting}
                        >
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleRename}
                          disabled={
                            uploading || isSubmitting || !editName.trim()
                          }
                        >
                          {isSubmitting ? 'שומר...' : 'שמור'}
                        </Button>
                      </div>
                    )}

                    {admin && assigningToTeam?.id === team.id && (
                      <div className="flex gap-2 mb-4 p-3 rounded-md bg-muted">
                        <select
                          className="min-w-0 flex-1 px-3 py-2 border border-input rounded-md bg-background"
                          value={selectedPlayerId}
                          onChange={(e) => setSelectedPlayerId(e.target.value)}
                        >
                          <option value="">בחר שחקן...</option>
                          {available.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.firstName} {p.lastName}
                              {p.team
                                ? ` (מנבחרת: ${p.team.name})`
                                : ' (לא משויך)'}
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
                          disabled={uploading || isSubmitting}
                        >
                          ביטול
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleAssign}
                          disabled={
                            uploading || isSubmitting || !selectedPlayerId
                          }
                        >
                          {isSubmitting ? 'משייך...' : 'שייך'}
                        </Button>
                      </div>
                    )}

                    {playersForTeam(team.id).length > 0 && (
                      <div className="border-t border-border pt-3">
                        <p className="text-sm font-medium text-muted-foreground mb-2">
                          חברי נבחרת:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {playersForTeam(team.id).map((player) => (
                            <NavigableRow
                              as="div"
                              to={`/all-stars/players/${player.id}`}
                              key={player.id}
                              className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm"
                            >
                              <span>
                                <Link to={`/all-stars/players/${player.id}`}>
                                  {player.firstName} {player.lastName}
                                </Link>
                              </span>
                              {admin && (
                                <Button
                                  contextual
                                  size="icon"
                                  variant="outline"
                                  onClick={() =>
                                    handleRemovePlayer(team, player)
                                  }
                                  disabled={uploading || isSubmitting}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  aria-label="הסר מהנבחרת"
                                >
                                  <UserMinus size={14} />
                                </Button>
                              )}
                            </NavigableRow>
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
