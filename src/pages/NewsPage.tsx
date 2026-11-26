import PublicUpdateCard from '../features/updates/components/PublicUpdateCard';
import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { PageHero } from '../components/ui/PageHero';
export default function NewsPage() {
  const {hash}=useLocation();
  const dispatch = useAppDispatch();
  const { updates, isLoading, hasLoaded, error } = useAppSelector(
    (state) => state.updates,
  );
  useEffect(() => {
    dispatch(fetchUpdates());
  }, [dispatch]);
  const loading=isLoading||(!hasLoaded&&!updates.length&&!error);
  useEffect(()=>{if(hash.startsWith("#update-")&&!loading)document.getElementById(hash.slice(1))?.scrollIntoView({block:"start"});},[hash,loading,updates]);
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
