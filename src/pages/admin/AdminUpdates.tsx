import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks/redux';
import { fetchUpdates } from '../../features/updates/updatesSlice';
import updatesService from '../../features/updates/updatesService';
import UpdateEditDialog from '../../features/updates/components/UpdateEditDialog';
import Button from '../../components/ui/Button';
import { useConfirm } from '../../components/ui/ConfirmProvider';
import { requestError } from '../../utils/requestError';
import type { Update } from '../../types/update';
export default function AdminUpdates() {
  const dispatch = useAppDispatch();
  const { updates, isLoading, error } = useAppSelector(
    (state) => state.updates,
  );
  const [editing, setEditing] = useState<Update | null | undefined>();
  const [mutationError, setMutationError] = useState('');
  const [busy, setBusy] = useState(false);
  const { showConfirm } = useConfirm();
  useEffect(() => {
    dispatch(fetchUpdates());
  }, [dispatch]);
  const refresh = async () => {
    await dispatch(fetchUpdates()).unwrap();
  };
  const remove = async (update: Update) => {
    if (
      !(await showConfirm({
        title: 'מחיקת עדכון',
        message: `למחוק את "${update.title}"?`,
        confirmText: 'מחק',
        variant: 'destructive',
      }))
    )
      return;
    setBusy(true);
    setMutationError('');
    try {
      await updatesService.deleteUpdate(update.id);
      await refresh();
    } catch (e) {
      setMutationError(requestError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">ניהול עדכונים</h2>
        <Button onClick={() => setEditing(null)}>עדכון חדש</Button>
      </div>
      {(error || mutationError) && <p role="alert">{error || mutationError}</p>}
      {isLoading ? (
        <p role="status">טוען עדכונים…</p>
      ) : !updates.length ? (
        <p>לא נמצאו עדכונים</p>
      ) : (
        updates.map((update) => (
          <article key={update.id} className="border rounded-lg p-4">
            <h3 className="font-bold text-lg">{update.title}</h3>
            <p className="whitespace-pre-wrap">
              {update.description ?? update.content}
            </p>
            <div className="flex gap-2 mt-3">
              <Button
                contextual
                variant="outline"
                onClick={() => setEditing(update)}
              >
                ערוך
              </Button>
              <Button
                contextual
                variant="destructive"
                disabled={busy}
                onClick={() => void remove(update)}
              >
                מחק
              </Button>
            </div>
          </article>
        ))
      )}
      {editing !== undefined && (
        <UpdateEditDialog
          update={editing || undefined}
          onClose={() => setEditing(undefined)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
