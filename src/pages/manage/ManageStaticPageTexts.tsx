import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { staticTextPages } from '../../services/staticPageTexts';

export default function ManageStaticPageTexts() {
  return <div className="space-y-5">
    <h2 className="text-2xl font-bold">ניהול טקסטים</h2>
    {staticTextPages.map(page => <article key={page.id} className="border rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
      <strong>{page.label}</strong>
      <Button asChild variant="outline" size="sm"><Link to={'/manage/texts/' + page.id}>עריכה</Link></Button>
    </article>)}
  </div>;
}
