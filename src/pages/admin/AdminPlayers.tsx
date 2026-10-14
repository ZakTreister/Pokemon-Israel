import PlayerEditDialog from '../../features/players/components/PlayerEditDialog';
import playersService from '../../features/players/playersService';
import Pagination from '../../components/ui/Pagination';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { requestError } from '../../utils/requestError';
import PlayerPhotoField from '../../features/players/components/PlayerPhotoField';
import TeamPlayerFields from '../../features/players/components/TeamPlayerFields';
import { teamPlayerCreateSchema } from '../../features/players/utils/teamPlayerForm';
import teamsService from '../../features/teams/teamsService';
import type { Team } from '../../types/team';
import NavigableRow from '../../components/ui/NavigableRow';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchPlayers,
  createQuarterlyPlayer,
  createTeamPlayer,
  clearError,
} from '../../features/players/playersSlice';
import { Card } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PlayerNameFields from '../../features/players/components/PlayerNameFields';
import {
  Search,
  UserPlus,
  Users,
  AlertCircle,
  Pencil,
  Trash2,
  CircleDot,
} from 'lucide-react';
import type { Player } from '../../types/player';

type FilterType = 'all' | 'team' | 'quarterly';

interface TeamFormData {
  description?: string;
  dateOfBirth?: string;
  joinedAt?: string;
  playerNumber: string;
  teamId: string;
  firstName: string;
  lastName: string;
  city: string;
}

interface QuarterlyFormData {
  firstName: string;
  lastName: string;
  city: string;
}

export default function AdminPlayers() {
  const dispatch = useAppDispatch();
  const {
    players,
    isLoading,
    error,
    total,
    page: resolvedPage,
    totalPages,
  } = useAppSelector((state) => state.players);

  const [teams, setTeams] = useState<Team[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showQuarterlyModal, setShowQuarterlyModal] = useState(false);
  const [page, setPage] = useState(1);
  const { showConfirm } = useConfirm();
  const [duplicates, setDuplicates] = useState<Player[]>([]);
  const [pendingCreate, setPendingCreate] = useState<
    (() => Promise<void>) | null
  >(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [photoUploadId, setPhotoUploadId] = useState<
    string | null | undefined
  >();
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  useEffect(() => {
    if (!showTeamModal) return;
    let active = true;
    setTeams([]);
    teamsService
      .getTeams()
      .then((rows) => {
        if (active) setTeams(rows.filter((team) => team.isActive));
      })
      .catch(() => {
        if (active)
          setFormError(
            'לא הצלחנו לטעון נבחרות. סגרו ופתחו את הטופס כדי לנסות שוב.',
          );
      });
    return () => {
      active = false;
    };
  }, [showTeamModal]);

  const [teamForm, setTeamForm] = useState<TeamFormData>({
    firstName: '',
    lastName: '',
    city: '',
    playerNumber: '',
    teamId: '',
  });

  const [quarterlyForm, setQuarterlyForm] = useState<QuarterlyFormData>({
    firstName: '',
    lastName: '',
    city: '',
  });

  const requestSequence = useRef(0);
  const loadPlayers = useCallback(() => {
    const sequence = ++requestSequence.current;
    const params: {
      type?: 'team' | 'quarterly';
      search?: string;
      page: number;
    } = { page };
    if (filterType !== 'all') params.type = filterType;
    if (searchQuery.trim()) params.search = searchQuery.trim();
    return dispatch(fetchPlayers(params))
      .unwrap()
      .then((result) => {
        if (sequence === requestSequence.current) setPage(result.page);
      });
  }, [dispatch, filterType, searchQuery, page]);

  useEffect(() => {
    void loadPlayers().catch(() => {});
  }, [loadPlayers]);

  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const resetTeamForm = () => {
    setPhotoUploadId(undefined);
    setPhotoUrl('');
    setTeamForm({
      firstName: '',
      lastName: '',
      city: '',
      playerNumber: '',
      description: '',
      dateOfBirth: '',
      teamId: '',
    });
    setFormError(null);
  };

  const resetQuarterlyForm = () => {
    setPhotoUploadId(undefined);
    setPhotoUrl('');
    setQuarterlyForm({ firstName: '', lastName: '', city: '' });
    setFormError(null);
  };

  const checkDuplicates = async (
    input: { firstName: string; lastName: string; city?: string },
    type: 'team' | 'quarterly',
    create: () => Promise<void>,
  ) => {
    const matches = await playersService.duplicates({ ...input, type });
    if (matches.length) {
      setDuplicates(matches);
      setPendingCreate(() => create);
      return true;
    }
    return false;
  };
  const archive = async (player: Player) => {
    if (
      !(await showConfirm({
        title: 'מחק שחקן',
        message: `למחוק את ${player.firstName} ${player.lastName}? ההיסטוריה תישמר.`,
        confirmText: 'מחק שחקן',
        variant: 'destructive',
      }))
    )
      return;
    try {
      await playersService.deletePlayer(player.id);
      await loadPlayers();
    } catch (e) {
      setFormError(requestError(e));
    }
  };

  const handleCreateTeamPlayer = async (allowDuplicate = false) => {
    const parsed = teamPlayerCreateSchema.safeParse(teamForm);
    if (uploading || isSubmitting) return;
    if (!parsed.success || !teamForm.teamId) {
      setFormError(
        !parsed.success ? parsed.error.issues[0].message : 'יש לבחור נבחרת',
      );
      return;
    }
    try {
      if (
        !allowDuplicate &&
        (await checkDuplicates(parsed.data, 'team', () =>
          handleCreateTeamPlayer(true),
        ))
      )
        return;
      setIsSubmitting(true);
      setFormError(null);
      await dispatch(
        createTeamPlayer({
          ...parsed.data,
          allowDuplicate,
          teamId: teamForm.teamId,
          photoUploadId,
        }),
      ).unwrap();
      resetTeamForm();
      setShowTeamModal(false);
      void loadPlayers().catch(() => {});
    } catch (err) {
      setFormError(typeof err === 'string' ? err : requestError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuarterlyPlayer = async (allowDuplicate = false) => {
    if (uploading || isSubmitting) return;
    if (!quarterlyForm.firstName.trim() || !quarterlyForm.lastName.trim()) {
      setFormError('שם פרטי ושם משפחה הם חובה');
      return;
    }
    try {
      if (
        !allowDuplicate &&
        (await checkDuplicates(quarterlyForm, 'quarterly', () =>
          handleCreateQuarterlyPlayer(true),
        ))
      )
        return;
      setIsSubmitting(true);
      setFormError(null);
      await dispatch(
        createQuarterlyPlayer({
          firstName: quarterlyForm.firstName.trim(),
          lastName: quarterlyForm.lastName.trim(),
          city: quarterlyForm.city.trim(),
          allowDuplicate,
        }),
      ).unwrap();
      resetQuarterlyForm();
      setShowQuarterlyModal(false);
      void loadPlayers().catch(() => {});
    } catch (err) {
      setFormError(typeof err === 'string' ? err : requestError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (player: Player) => setSelectedPlayer(player);

  const getPlayerTypeLabel = (playerType: string) => {
    return playerType === 'team' ? 'שחקן נבחרת' : 'שחקן חוגים';
  };

  const closeAllModals = () => {
    setShowTeamModal(false);
    setShowQuarterlyModal(false);
    setSelectedPlayer(null);
    resetTeamForm();
    resetQuarterlyForm();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold">שחקנים</h2>
        <div className="flex flex-wrap gap-2">
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
            placeholder="חפש לפי שם, משפחה או עיר..."
            className="w-full pl-3 pr-10 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary bg-card"
            value={searchQuery}
            onChange={(e) => {
              setPage(1);
              setSearchQuery(e.target.value);
            }}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium ml-2 leading-8">סוג:</span>
          <Button
            contextual
            size="sm"
            variant={filterType === 'all' ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setFilterType('all');
            }}
            className="ml-1"
          >
            הכל
          </Button>
          <Button
            contextual
            size="sm"
            variant={filterType === 'team' ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setFilterType('team');
            }}
            className="ml-1"
          >
            שחקני נבחרת
          </Button>
          <Button
            contextual
            size="sm"
            variant={filterType === 'quarterly' ? 'default' : 'outline'}
            onClick={() => {
              setPage(1);
              setFilterType('quarterly');
            }}
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
              <thead className="cs-table-head">
                <tr className="border-b border-border text-right">
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    שם פרטי
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    שם משפחה
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    עיר
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    סוג
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    סטטוס
                  </th>
                  <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                    פעולות
                  </th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <NavigableRow
                    key={player.id}
                    to={
                      player.playerType === 'team'
                        ? `/all-stars/players/${player.id}`
                        : ''
                    }
                    className="border-b border-border"
                  >
                    <td className="px-4 py-3 font-medium">
                      {player.firstName}
                    </td>
                    <td className="px-4 py-3 font-medium">{player.lastName}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {player.city || '—'}
                    </td>
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
                      <Button
                        contextual
                        variant="outline"
                        size="icon"
                        aria-label="עריכת שחקן"
                        title="עריכת שחקן"
                        onClick={() => handleEditClick(player)}
                      >
                        <Pencil size={16} aria-hidden="true" />
                      </Button>
                      <Button
                        contextual
                        variant="destructive"
                        size="icon"
                        aria-label="מחק שחקן"
                        title="מחק שחקן"
                        onClick={() => void archive(player)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </Button>
                    </td>
                  </NavigableRow>
                ))}
              </tbody>
            </table>
          </div>

          {players.length === 0 && (
            <div className="text-center py-12">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">
                לא נמצאו שחקנים התואמים את החיפוש
              </p>
            </div>
          )}
        </Card>
      )}

      <Pagination
        page={resolvedPage}
        totalPages={totalPages}
        total={total}
        onChange={setPage}
        busy={isLoading}
      />
      {formError && !showTeamModal && !showQuarterlyModal && (
        <p role="alert">{formError}</p>
      )}
      {/* Add Team Player Modal */}
      {showTeamModal && (
        <Modal
          title="הוסף שחקן נבחרת"
          panelClassName="max-w-3xl"
          onClose={isSubmitting || uploading ? undefined : closeAllModals}
        >
          {formError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateTeamPlayer();
            }}
          >
            <TeamPlayerFields
              newPlayer
              value={teamForm}
              onChange={(value) => setTeamForm({ ...teamForm, ...value })}
            >
              <label className="block md:col-span-2">
                נבחרת
                <select
                  aria-label="נבחרת"
                  required
                  className="cs-player-input"
                  value={teamForm.teamId}
                  onChange={(e) =>
                    setTeamForm({ ...teamForm, teamId: e.target.value })
                  }
                >
                  <option value="">בחרו נבחרת</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>
            </TeamPlayerFields>
            <div className="min-w-0">
              <PlayerPhotoField
                playerType="team"
                value={photoUrl}
                onChange={(image) => {
                  setPhotoUrl(image?.url || '');
                  setPhotoUploadId(image?.uploadId || null);
                }}
                onBusyChange={setUploading}
                disabled={isSubmitting}
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={closeAllModals}
                disabled={isSubmitting || uploading}
              >
                ביטול
              </Button>
              <Button type="submit" disabled={isSubmitting || uploading}>
                {isSubmitting ? 'יוצר...' : 'הוסף שחקן נבחרת'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Add Quarterly Player Modal */}
      {showQuarterlyModal && (
        <Modal
          title="הוסף שחקן חוגים"
          onClose={isSubmitting || uploading ? undefined : closeAllModals}
        >
          {formError && (
            <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PlayerNameFields
              firstName={quarterlyForm.firstName}
              lastName={quarterlyForm.lastName}
              onChange={(field, value) =>
                setQuarterlyForm({ ...quarterlyForm, [field]: value })
              }
            />
            <div>
              <label className="block text-sm font-medium mb-1">עיר</label>
              <input
                type="text"
                className="cs-player-input"
                value={quarterlyForm.city}
                onChange={(e) =>
                  setQuarterlyForm({ ...quarterlyForm, city: e.target.value })
                }
              />
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={closeAllModals}
                disabled={isSubmitting || uploading}
              >
                ביטול
              </Button>
              <Button
                onClick={() => void handleCreateQuarterlyPlayer()}
                disabled={isSubmitting || uploading}
              >
                {isSubmitting ? 'יוצר...' : 'הוסף שחקן חוגים'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {selectedPlayer && (
        <PlayerEditDialog
          key={selectedPlayer.id}
          player={selectedPlayer}
          onClose={() => setSelectedPlayer(null)}
          onSaved={loadPlayers}
        />
      )}
      {!!duplicates.length && (
        <Modal
          title="שחקן דומה כבר רשום"
          onClose={() => {
            setDuplicates([]);
            setPendingCreate(null);
          }}
        >
          <p>
            ייתכן שהשחקן כבר רשום. ניתן לערוך שחקן קיים או ליצור ילד נוסף בכל
            זאת.
          </p>
          {duplicates.map((player) => (
            <div key={player.id} className="py-3">
              <p>
                {player.firstName} {player.lastName} · {player.city || '—'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  closeAllModals();
                  setDuplicates([]);
                  void playersService
                    .getPlayer(player.id)
                    .then(setSelectedPlayer)
                    .catch((e) => setFormError(requestError(e)));
                }}
              >
                ערוך שחקן קיים
              </Button>
            </div>
          ))}
          <Button
            disabled={isSubmitting}
            onClick={() => {
              const create = pendingCreate;
              setDuplicates([]);
              setPendingCreate(null);
              void create?.();
            }}
          >
            צור בכל זאת
          </Button>
        </Modal>
      )}
    </div>
  );
}
