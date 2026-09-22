import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchSeasons, createSeason, closeSeason } from '../../features/seasons/seasonsSlice';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { CalendarPlus, Lock, AlertCircle, CheckCircle2, Archive } from 'lucide-react';

export default function AdminSeasons() {
  const dispatch = useAppDispatch();
  const { seasons, activeSeason, isLoading, error } = useAppSelector((state) => state.seasons);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchSeasons());
  }, [dispatch]);

  const closedSeasons = seasons.filter((s) => s.status === 'closed');

  const handleCreateSeason = async () => {
    if (!seasonName.trim()) return;
    try {
      setIsSubmitting(true);
      await dispatch(createSeason(seasonName.trim())).unwrap();
      setSeasonName('');
      setShowCreateForm(false);
    } catch {
      // error is already in state
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSeason = async () => {
    if (!activeSeason) return;
    try {
      setIsSubmitting(true);
      await dispatch(closeSeason(activeSeason.id)).unwrap();
      setShowCloseConfirm(false);
    } catch {
      // error is already in state
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">עונות</h2>
        {!activeSeason && !showCreateForm && (
          <Button onClick={() => setShowCreateForm(true)}>
            <CalendarPlus size={18} className="ml-1" />
            <span>פתח עונה חדשה</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse text-center py-12">טוען נתונים...</div>
      ) : (
        <div className="space-y-6">
          {/* Active Season */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 size={20} className="text-success" />
                <span>עונה פעילה</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSeason ? (
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-medium">{activeSeason.name}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        תאריך התחלה: {formatDate(activeSeason.startedAt)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        נפתחה על ידי: {activeSeason.createdBy?.name || activeSeason.createdBy?.username || '—'}
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCloseConfirm(true)}
                    >
                      <Lock size={16} className="ml-1" />
                      <span>סגור עונה</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground mb-4">אין עונה פעילה כרגע</p>
                  {!showCreateForm && (
                    <Button onClick={() => setShowCreateForm(true)}>
                      <CalendarPlus size={18} className="ml-1" />
                      <span>פתח עונה חדשה</span>
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Create Season Form */}
          {showCreateForm && !activeSeason && (
            <Card>
              <CardHeader>
                <CardTitle>פתח עונה חדשה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">שם העונה *</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholder="לדוגמה: עונת קיץ 2026"
                      value={seasonName}
                      onChange={(e) => setSeasonName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && seasonName.trim()) {
                          handleCreateSeason();
                        }
                      }}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCreateForm(false);
                        setSeasonName('');
                      }}
                      disabled={isSubmitting}
                    >
                      ביטול
                    </Button>
                    <Button
                      onClick={handleCreateSeason}
                      disabled={isSubmitting || !seasonName.trim()}
                    >
                      {isSubmitting ? 'יוצר...' : 'צור עונה'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Previous Seasons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive size={20} />
                <span>עונות קודמות</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {closedSeasons.length === 0 ? (
                <p className="text-muted-foreground text-center py-6">אין עונות קודמות</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted border-b border-border text-right">
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">שם עונה</th>
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תאריך התחלה</th>
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">תאריך סיום</th>
                        <th className="px-4 py-3 text-sm font-medium text-muted-foreground">סטטוס</th>
                      </tr>
                    </thead>
                    <tbody>
                      {closedSeasons.map((season) => (
                        <tr key={season.id} className="border-b border-border">
                          <td className="px-4 py-3 font-medium">{season.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(season.startedAt)}</td>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(season.closedAt)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                              סגורה
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Close Season Confirmation Dialog */}
      {showCloseConfirm && activeSeason && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card p-6 rounded-lg w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">סגור עונה</h3>
            <p className="text-muted-foreground mb-6">
              האם אתה בטוח שברצונך לסגור את העונה "{activeSeason.name}"?
              <br />
              <span className="text-sm">לא ניתן לפתוח מחדש עונה שנסגרה.</span>
            </p>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCloseConfirm(false)}
                disabled={isSubmitting}
              >
                ביטול
              </Button>
              <Button
                variant="destructive"
                onClick={handleCloseSeason}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'סוגר...' : 'סגור עונה'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
