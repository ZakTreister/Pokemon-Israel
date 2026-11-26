import PublicUpdateCard from '../features/updates/components/PublicUpdateCard';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { PageHero } from '../components/ui/PageHero';
export default function NewsPage() {
  const dispatch = useAppDispatch();
  const { updates, isLoading, hasLoaded, error } = useAppSelector(
    (state) => state.updates,
  );
  useEffect(() => {
    dispatch(fetchUpdates());
  }, [dispatch]);
  const loading=isLoading||(!hasLoaded&&!updates.length&&!error);
  return (
    <div>
      <PageHero
        title="חדשות הליגה"
        highlightWord="חדשות"
        subtitle="העדכונים וההכרזות של קהילת CardSchool"
      />
      <div className="container py-12">
        {error && <p role="alert">{error}</p>}
        {loading ? (
          <p role="status">טוען חדשות...</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {updates.map(update=><PublicUpdateCard key={update.id} update={update}/>)}
          </div>
        )}
        {!loading && !error && !updates.length && (
          <p>עדכונים יופיעו כאן לאחר פרסומם.</p>
        )}
      </div>
    </div>
  );
}
