import {useEffect,useState,useRef,useId} from 'react';
import {useNavigate,useParams} from 'react-router-dom';
import {isRetiredPublicPage} from '../../../shared/contentLinkTargets';
import type {ContentPage,ContentPageInput} from '../../types/contentPage';
import {contentPagesService} from '../../services/contentPages';
import ContentPageAddress from '../../components/content/ContentPageAddress';
import ContentPageButtonFields from '../../components/content/ContentPageButtonFields';
import RichHtmlField from '../../components/content/RichHtmlField';
import MediaManager from '../../components/media/MediaManager';
import Button from '../../components/ui/Button';
import {requestError} from '../../utils/requestError';

const listPath='/manage/content-pages';
const empty=():ContentPageInput=>({title:'',subtitle:'',bodyHtml:'',status:'draft',showInNavigation:false,navigationLabel:'',showInFieldNews:false,isAllStars:false,showAsButton:false,buttonLabel:'',buttonTargets:[]});
const fromPage=(page:ContentPage):ContentPageInput=>({
 title:page.title,subtitle:page.subtitle||'',bodyHtml:page.bodyHtml||'',status:page.status,
 showInNavigation:!!page.showInNavigation,navigationLabel:page.navigationLabel||'',showInFieldNews:!!page.showInFieldNews,isAllStars:!!page.isAllStars,
 showAsButton:!!page.showAsButton&&!!page.buttonTargets?.some(path=>!isRetiredPublicPage(path)),buttonLabel:page.buttonLabel||'',buttonTargets:(page.buttonTargets||[]).filter(path=>!isRetiredPublicPage(path)),
});

export default function ManageContentPageEditor(){
 const {id='new'}=useParams();
 return <ContentPageEditor key={id} id={id}/>;
}
function ContentPageEditor({id}:{id:string}){
 const creating=id==='new',navigate=useNavigate();
 const formId=useId();
 const [current,setCurrent]=useState<ContentPage|null>(null),[input,setInput]=useState<ContentPageInput>(empty);
 const [loading,setLoading]=useState(!creating),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true);
 useEffect(()=>{
  mounted.current=true;
  let active=true;
  if(!creating)contentPagesService.getManaged(id).then(page=>{
   if(active){setCurrent(page);setInput(fromPage(page));}
  }).catch(e=>{if(active)setError(requestError(e))}).finally(()=>{if(active)setLoading(false)});
  return ()=>{active=false;mounted.current=false};
 },[creating,id]);
 const reloadMedia=async()=>{
  const page=await contentPagesService.getManaged(id);
  if(mounted.current)setCurrent(page);
 };
 const save=async()=>{
  if(busy||loading||(!creating&&!current))return;
  setBusy(true);setError('');
  try{
   const result=creating?await contentPagesService.create(input):await contentPagesService.update(id,input);
   if(!mounted.current)return;
   if(creating)navigate(listPath+'/'+result.id,{replace:true});
   else{setCurrent(result);setInput(fromPage(result));}
  }catch(e){if(mounted.current)setError(requestError(e))}
  finally{if(mounted.current)setBusy(false)}
 };
 return <div className="space-y-5">
 <h2 className="text-2xl font-bold">{creating?'עמוד תוכן חדש':'עריכת עמוד תוכן'}</h2>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {loading?<p role="status">טוען עמוד תוכן...</p>:(creating||current)&&
 <section className="border rounded-lg p-4 space-y-4"><form id={formId} className="space-y-3" onSubmit={e=>{e.preventDefault();void save()}}>
 <label className="block">כותרת<input required maxLength={180} className="block w-full p-2 border rounded bg-card" value={input.title} onChange={e=>setInput({...input,title:e.target.value})}/></label>
 <label className="block">כותרת משנה להירו<textarea maxLength={5000} className="block w-full p-2 border rounded bg-card" value={input.subtitle} onChange={e=>setInput({...input,subtitle:e.target.value})}/></label>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={!!input.isAllStars} onChange={e=>setInput({...input,isAllStars:e.target.checked})}/> עמוד All Stars (הירו ולוגו של ליגת הנבחרות)</label>
 <RichHtmlField value={input.bodyHtml} onChange={bodyHtml=>setInput({...input,bodyHtml})}/>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={input.showInNavigation} onChange={e=>setInput({...input,showInNavigation:e.target.checked})}/> הצג בתפריט</label>
 {input.showInNavigation&&<label className="block">שם פריט ניווט<input required maxLength={80} className="block w-full p-2 border rounded bg-card" value={input.navigationLabel} onChange={e=>setInput({...input,navigationLabel:e.target.value})}/></label>}
 <label className="flex gap-2 items-center"><input type="checkbox" checked={input.showInFieldNews} onChange={e=>setInput({...input,showInFieldNews:e.target.checked})}/> הצג בחדשות מהשטח</label>
 <ContentPageButtonFields value={input} onChange={setInput} id={id} disabled={busy}/>
 <label className="block">פרסום<select className="block w-full p-2 border rounded bg-card" value={input.status} onChange={e=>setInput({...input,status:e.target.value as ContentPageInput['status']})}><option value="draft">טיוטה</option><option value="published">מפורסם</option></select></label>
 </form>
 {current?<><ContentPageAddress key={'address-'+current.id} id={current.id} published={current.status==='published'}/><MediaManager key={current.id} owner="content-page" id={current.id} items={current.mediaItems||[]} onChanged={reloadMedia}/></>:<p className="text-sm">לאחר שמירת העמוד ניתן להוסיף מדיה.</p>}
 <div role="group" aria-label="פעולות עמוד תוכן" className="flex flex-wrap gap-2 border-t pt-4"><Button type="submit" form={formId} disabled={busy}>{busy?'שומר...':'שמור'}</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>navigate(listPath)}>סגור</Button></div>
 </section>}
 </div>;
}
