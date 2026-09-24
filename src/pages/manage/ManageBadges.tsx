import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import {
  fetchBadges,
  fetchBadgeAwards,
  createBadge,
  updateBadge,
  awardBadge,
  clearError,
} from '../../features/badges/badgesSlice';
import { fetchManageablePlayers } from '../../features/teams/teamsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useToast } from '../../components/ui/ToastProvider';
import { Plus, Edit2, Power, Award, AlertCircle } from 'lucide-react';
import type { BadgeDefinition } from '../../types/badge';

export default function ManageBadges() {
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { badges, awards, isLoading, error } = useAppSelector((state) => state.badges);
  const { manageablePlayers } = useAppSelector((state) => state.teams);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', icon: '' });
  const [editingBadge, setEditingBadge] = useState<BadgeDefinition | null>(null);
  const [editData, setEditData] = useState({ name: '', description: '', icon: '' });
  const [awardingBadge, setAwardingBadge] = useState<BadgeDefinition | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchBadges());
    dispatch(fetchBadgeAwards());
    dispatch(fetchManageablePlayers());
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  const handleCreate = async () => {
    if (!formData.name.trim()) return;
    try {
      setIsSubmitting(true);
      await dispatch(createBadge(formData)).unwrap();
      showToast('התג נוצר בהצלחה', 'success');
      setFormData({ name: '', description: '', icon: '' });
      setShowCreateForm(false);
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingBadge || !editData.name.trim()) return;
    try {
      setIsSubmitting(true);
      await dispatch(updateBadge({ id: editingBadge.id, input: editData })).unwrap();
      showToast('התג עודכן בהצלחה', 'success');
      setEditingBadge(null);
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (badge: BadgeDefinition) => {
    try {
      setIsSubmitting(true);
      await dispatch(updateBadge({ id: badge.id, input: { isActive: !badge.isActive } })).unwrap();
      showToast('התג עודכן בהצלחה', 'success');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAward = async () => {
    if (!awardingBadge || !selectedPlayerId) return;
    try {
      setIsSubmitting(true);
      await dispatch(awardBadge({ badgeId: awardingBadge.id, playerId: selectedPlayerId })).unwrap();
      showToast('התג הוענק בהצלחה', 'success');
      setAwardingBadge(null);
      setSelectedPlayerId('');
    } catch (err) {
      showToast(err as string, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const awardsForPlayer = (playerId: string) =>
    awards.filter((a) => a.player.id === playerId);

  const teamPlayers = manageablePlayers.filter((p) => p.isActive);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">ניהול תגים</h2>
        {!showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus size={18} className="ml-1" />
            <span>תג חדש</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {showCreateForm && (
        <Card className="mb-4">
          <CardHeader>
            <CardTitle>יצירת תג חדש</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">שם התג *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  placeholder="לדוגמה: אלוף העונה"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">תיאור</label>
                <textarea
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  rows={2}
                  placeholder="תיאור התג"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">אייקון (שם lucide)</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                  placeholder="לדוגמה: Trophy"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', description: '', icon: '' });
                  }}
                  disabled={isSubmitting}
                >
                  ביטול
                </Button>
                <Button onClick={handleCreate} disabled={isSubmitting || !formData.name.trim()}>
                  {isSubmitting ? 'יוצר...' : 'צור תג'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען נתונים...</div>
      ) : badges.length === 0 ? (
        <div className="text-center py-12">
          <Award size={48} className="mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">אין תגים עדיין</p>
        </div>
      ) : (
        <div className="space-y-4">
          {badges.map((badge) => (
            <Card key={badge.id} className={!badge.isActive ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    {badge.icon && (
                      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <Award size={20} />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg">{badge.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          badge.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {badge.isActive ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </div>
                      {badge.description && (
                        <p className="text-sm text-muted-foreground mt-1">{badge.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingBadge(badge);
                        setEditData({
                          name: badge.name,
                          description: badge.description,
                          icon: badge.icon,
                        });
                      }}
                      disabled={isSubmitting}
                    >
                      <Edit2 size={16} className="ml-1" />
                      <span>ערוך</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleActive(badge)}
                      disabled={isSubmitting}
                    >
                      <Power size={16} className="ml-1" />
                      <span>{badge.isActive ? 'השבת' : 'הפעל'}</span>
                    </Button>
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => {
                        setAwardingBadge(badge);
                        setSelectedPlayerId('');
                      }}
                      disabled={isSubmitting || !badge.isActive}
                    >
                      <Award size={16} className="ml-1" />
                      <span>הענק</span>
                    </Button>
                  </div>
                </div>

                {editingBadge?.id === badge.id && (
                  <div className="mt-4 p-3 rounded-md bg-muted space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">שם התג *</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">תיאור</label>
                      <textarea
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        rows={2}
                        value={editData.description}
                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">אייקון</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-input rounded-md bg-background"
                        value={editData.icon}
                        onChange={(e) => setEditData({ ...editData, icon: e.target.value })}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingBadge(null)}
                        disabled={isSubmitting}
                      >
                        ביטול
                      </Button>
                      <Button size="sm" onClick={handleUpdate} disabled={isSubmitting || !editData.name.trim()}>
                        {isSubmitting ? 'שומר...' : 'שמור'}
                      </Button>
                    </div>
                  </div>
                )}

                {awardingBadge?.id === badge.id && (
                  <div className="mt-4 p-3 rounded-md bg-muted space-y-3">
                    <label className="block text-sm font-medium">בחר שחקן נבחרת להענקת התג:</label>
                    <select
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      value={selectedPlayerId}
                      onChange={(e) => setSelectedPlayerId(e.target.value)}
                    >
                      <option value="">בחר שחקן...</option>
                      {teamPlayers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                          {p.team ? ` (${p.team.name})` : ' (ללא קבוצה)'}
                        </option>
                      ))}
                    </select>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAwardingBadge(null);
                          setSelectedPlayerId('');
                        }}
                        disabled={isSubmitting}
                      >
                        ביטול
                      </Button>
                      <Button size="sm" onClick={handleAward} disabled={isSubmitting || !selectedPlayerId}>
                        {isSubmitting ? 'מעניק...' : 'הענק תג'}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Awards section */}
      {awards.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award size={20} />
              <span>הענקות אחרונות</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted border-b border-border text-right">
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שחקן</th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תג</th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תאריך</th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">הוענק על ידי</th>
                  </tr>
                </thead>
                <tbody>
                  {awards.slice(0, 20).map((award) => (
                    <tr key={award.id} className="border-b border-border">
                      <td className="px-4 py-3 font-medium">
                        {award.player.firstName} {award.player.lastName}
                      </td>
                      <td className="px-4 py-3">{award.badge.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(award.awardedAt).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {award.awardedBy?.name || award.awardedBy?.username || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
