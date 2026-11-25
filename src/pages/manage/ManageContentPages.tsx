import {useCallback,useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import type {ContentPage,ContentPageInput} from '../../types/contentPage';
import {contentPagesService} from '../../services/contentPages';
import ContentPageAddress from '../../components/content/ContentPageAddress';
import RichHtmlField from '../../components/content/RichHtmlField';
import MediaManager from '../../components/media/MediaManager';
import Button from '../../components/ui/Button';
import {requestError} from '../../utils/requestError';
const empty=():ContentPageInput=>({title:'',subtitle:'',bodyHtml:'',status:'draft',showInNavigation:false,navigationLabel:'',showInFieldNews:false});
export default function ManageContentPages(){
 const [pages,setPages]=useState<ContentPage[]>([]),[selected,setSelected]=useState<string|null>(null),[input,setInput]=useState<ContentPageInput>(empty),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const reload=useCallback(async()=>setPages(await contentPagesService.manage()),[]);
 useEffect(()=>{reload().catch(e=>setError(requestError(e)))},[reload]);
 const edit=(page?:ContentPage)=>{setSelected(page?.id||'new');setInput(page?{title:page.title,subtitle:page.subtitle||'',bodyHtml:page.bodyHtml||'',status:page.status,showInNavigation:!!page.showInNavigation,navigationLabel:page.navigationLabel||'',showInFieldNews:!!page.showInFieldNews}:empty());setError('');};
 const save=async()=>{if(busy)return;setBusy(true);setError('');try{const result=selected==='new'?await contentPagesService.create(input):await contentPagesService.update(selected!,input);setSelected(result.id);await reload();}catch(e){setError(requestError(e))}finally{setBusy(false)}};
 const remove=async(id:string)=>{if(!window.confirm('למחוק את עמוד התוכן?'))return;setBusy(true);try{await contentPagesService.remove(id);if(selected===id)setSelected(null);await reload();}catch(e){setError(requestError(e))}finally{setBusy(false)}};
 const current=pages.find(p=>p.id===selected);
 return <div className="space-y-5"><header className="flex flex-wrap justify-between gap-3"><h2 className="text-2xl font-bold">עמודי תוכן</h2><Button onClick={()=>edit()}>עמוד תוכן חדש</Button></header>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {selected&&<section className="border rounded-lg p-4 space-y-4"><form className="space-y-3" onSubmit={e=>{e.preventDefault();void save()}}>
 <label className="block">כותרת<input required maxLength={180} className="block w-full p-2 border rounded bg-card" value={input.title} onChange={e=>setInput({...input,title:e.target.value})}/></label>
 <label className="block">כותרת משנה להירו<textarea maxLength={5000} className="block w-full p-2 border rounded bg-card" value={input.subtitle} onChange={e=>setInput({...input,subtitle:e.target.value})}/></label>
 <RichHtmlField value={input.bodyHtml} onChange={bodyHtml=>setInput({...input,bodyHtml})}/>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={input.showInNavigation} onChange={e=>setInput({...input,showInNavigation:e.target.checked})}/> הצג בתפריט</label>
 {input.showInNavigation&&<label className="block">שם פריט ניווט<input required maxLength={80} className="block w-full p-2 border rounded bg-card" value={input.navigationLabel} onChange={e=>setInput({...input,navigationLabel:e.target.value})}/></label>}
 <label className="flex gap-2 items-center"><input type="checkbox" checked={input.showInFieldNews} onChange={e=>setInput({...input,showInFieldNews:e.target.checked})}/> הצג בחדשות מהשטח</label>
 <label className="block">פרסום<select className="block w-full p-2 border rounded bg-card" value={input.status} onChange={e=>setInput({...input,status:e.target.value as ContentPageInput['status']})}><option value="draft">טיוטה</option><option value="published">מפורסם</option></select></label>
 <div className="flex gap-2"><Button type="submit" disabled={busy}>{busy?'שומר...':'שמור'}</Button><Button type="button" variant="outline" onClick={()=>setSelected(null)}>סגור</Button></div></form>
 {current?<><ContentPageAddress key={current.id} id={current.id} published={current.status==='published'}/><MediaManager key={current.id} owner="content-page" id={current.id} items={current.mediaItems||[]} onChanged={reload}/></>:<p className="text-sm">לאחר שמירת העמוד ניתן להוסיף מדיה.</p>}</section>}
 {pages.map(page=><article key={page.id} className="border rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between"><div className="flex-1 min-w-0"><strong>{page.title}</strong><p className="text-sm">{page.status==='published'?'מפורסם':'טיוטה'}</p><ContentPageAddress id={page.id} published={page.status==='published'}/></div><div className="flex gap-2 flex-wrap">{page.status==='published'&&<Button asChild variant="outline" size="sm"><Link to={'/content/'+page.id}>צפייה</Link></Button>}<Button variant="outline" size="sm" onClick={()=>edit(page)}>ערוך</Button><Button disabled={busy} variant="destructive" size="sm" onClick={()=>void remove(page.id)}>מחק</Button></div></article>)}
 {!pages.length&&!selected&&<p>טרם נוצרו עמודי תוכן.</p>}</div>;
}
