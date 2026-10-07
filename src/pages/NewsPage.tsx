import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../hooks/redux';
import { fetchUpdates } from '../features/updates/updatesSlice';
import { PageHero } from '../components/ui/PageHero';
import Button from '../components/ui/Button';
export default function NewsPage() {
  const dispatch = useAppDispatch();
  const { updates, isLoading, error } = useAppSelector(
    (state) => state.updates,
  );
  useEffect(() => {
    dispatch(fetchUpdates());
  }, [dispatch]);
  return (
    <div>
      <PageHero
        title="חדשות הליגה"
        highlightWord="חדשות"
        subtitle="העדכונים וההכרזות של קהילת CardSchool"
      />
      <div className="container py-12">
        {error && <p role="alert">{error}</p>}
        {isLoading ? (
          <p>טוען חדשות...</p>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {updates.map((update) => (
              <article
                key={update.id}
                className="cs-public-card p-6 border-t-4 border-t-gold flex flex-col"
              >
                <p className="text-sm text-blue-500 font-bold">
                  {new Date(update.date).toLocaleDateString('he-IL')}
                </p>
                <h2 className="text-2xl font-extrabold mt-3 mb-4">
                  {update.title}
                </h2>
                <p className="text-muted-foreground line-clamp-4 mb-6">
                  {update.content}
                </p>
                <Button asChild variant="outline" className="mt-auto">
                  <Link to={`/news/${update.id}`}>לעדכון המלא</Link>
                </Button>
              </article>
            ))}
          </div>
        )}
        {!isLoading && !updates.length && (
          <p>עדכונים יופיעו כאן לאחר פרסומם.</p>
        )}
      </div>
    </div>
  );
}
