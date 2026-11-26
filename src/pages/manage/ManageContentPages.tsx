import {useCallback,useEffect,useState} from 'react';
import {useSiteSettings} from '../../features/siteSettings/SiteSettingsProvider';
import {Link} from 'react-router-dom';
import type {ContentPage} from '../../types/contentPage';
import {contentPagesService} from '../../services/contentPages';
import ContentPageAddress from '../../components/content/ContentPageAddress';
import Button from '../../components/ui/Button';
import {requestError} from '../../utils/requestError';

export default function ManageContentPages(){
 const {refresh}=useSiteSettings();
 const [pages,setPages]=useState<ContentPage[]|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const reload=useCallback(async()=>setPages(await contentPagesService.manage()),[]);
 useEffect(()=>{reload().catch(e=>setError(requestError(e)))},[reload]);
 const remove=async(id:string)=>{
  if(busy||!window.confirm('למחוק את עמוד התוכן?'))return;
  setBusy(true);setError('');
  try{await contentPagesService.remove(id);refresh();await reload();}
  catch(e){setError(requestError(e))}finally{setBusy(false)}
 };
 return <div className="space-y-5">
 <header className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-bold">עמודי תוכן</h2><Button asChild><Link to="/manage/content-pages/new">עמוד תוכן חדש</Link></Button></header>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {pages===null&&!error&&<p role="status">טוען עמודי תוכן...</p>}
 {pages?.map(page=><article key={page.id} className="border rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between"><div className="flex-1 min-w-0"><strong>{page.title}</strong><p className="text-sm">{page.status==='published'?'מפורסם':'טיוטה'}</p><ContentPageAddress id={page.id} published={page.status==='published'}/></div><div className="flex gap-2 flex-wrap">{page.status==='published'&&<Button asChild variant="outline" size="sm"><Link to={'/content/'+page.id}>צפייה</Link></Button>}<Button asChild variant="outline" size="sm"><Link to={'/manage/content-pages/'+page.id}>ערוך</Link></Button><Button disabled={busy} variant="destructive" size="sm" onClick={()=>void remove(page.id)}>מחק</Button></div></article>)}
 {pages?.length===0&&<p>טרם נוצרו עמודי תוכן.</p>}
 </div>;
}
