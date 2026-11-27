import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Button from '../../components/ui/Button';
import RichHtmlField from '../../components/content/RichHtmlField';
import { staticTextPages, staticPageTextsService, type StaticPageText, type StaticPageTextKey } from '../../services/staticPageTexts';
import { requestError } from '../../utils/requestError';
import { useToast } from '../../components/ui/ToastProvider';

export default function ManageStaticPageTextEditor() {
  const { id } = useParams();
  const page = staticTextPages.find(item => item.id === id);
  if (!page) return <Navigate replace to="/manage/texts"/>;
  return <Editor key={page.id} id={page.id} label={page.label}/>;
}

function Editor({ id, label }: { id: StaticPageTextKey; label: string }) {
  const [input, setInput] = useState<StaticPageText | null>(null);
  const [inlineUploading,setInlineUploading]=useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  useEffect(() => {
    let active = true;
    staticPageTextsService.get(id).then(data => { if (active) setInput(data); })
      .catch(e => { if (active) setError(requestError(e)); });
    return () => { active = false; };
  }, [id]);
  const save = async () => {
    if (!input || busy || inlineUploading) return;
    setBusy(true);
    setError('');
    try {
      setInput(await staticPageTextsService.save(id, input));
      showToast('הטקסטים נשמרו בהצלחה', 'success');
    } catch (e) { setError(requestError(e)); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <h2 className="text-2xl font-bold">עריכת טקסטים – {label}</h2>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {!input && !error && <p role="status">טוען טקסטים...</p>}
    {input && <form className="border rounded-lg p-4 space-y-4" onSubmit={e => { e.preventDefault(); void save(); }}>
      <fieldset disabled={busy} className="space-y-3">
        <label className="block">כותרת<input required maxLength={180} className="block w-full p-2 border rounded bg-card" value={input.title} onChange={e => setInput({ ...input, title: e.target.value })}/></label>
        <label className="block">כותרת משנה<textarea maxLength={5000} className="block w-full p-2 border rounded bg-card" value={input.subtitle} onChange={e => setInput({ ...input, subtitle: e.target.value })}/></label>
        <p className="text-sm font-medium">התוכן יוצג בכרטיס מיד מתחת להירו.</p>
        <RichHtmlField value={input.bodyHtml} onChange={bodyHtml => { if (!busy) setInput(old=>old?{...old,bodyHtml}:old); }} mobileHtml={input.mobileHtml} mobileEnabled={input.mobileEnabled} onMobileChange={(mobileHtml,mobileEnabled)=>setInput(old=>old?{...old,mobileHtml,mobileEnabled}:old)} onBusyChange={setInlineUploading}/>
      </fieldset>
      <div className="flex gap-2 flex-wrap">
        <Button type="submit" disabled={busy || inlineUploading || !input.title.trim()}>{busy ? 'שומר...' : 'שמור טקסטים'}</Button>
        <Button asChild variant="outline"><Link to="/manage/texts">סגור</Link></Button>
      </div>
    </form>}
  </div>;
}
