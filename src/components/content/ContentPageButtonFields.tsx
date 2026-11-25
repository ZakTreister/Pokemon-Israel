import {useEffect,useState} from 'react';
import {STATIC_CONTENT_LINK_TARGETS} from '../../../shared/contentLinkTargets';
import {contentPagesService} from '../../services/contentPages';
import type {ContentPageInput,ContentPage} from '../../types/contentPage';
import {requestError} from '../../utils/requestError';
export default function ContentPageButtonFields({value,onChange,id,disabled}:{value:ContentPageInput;onChange:(value:ContentPageInput)=>void;id:string;disabled:boolean}){
 const [pages,setPages]=useState<ContentPage[]|null>(null),[error,setError]=useState('');
 useEffect(()=>{
  if(!value.showAsButton)return;
  let active=true;
  contentPagesService.manage().then(rows=>{if(active)setPages(rows);}).catch(e=>{if(active)setError(requestError(e));});
  return()=>{active=false};
 },[value.showAsButton]);
 const targets=value.buttonTargets||[];
 const checkbox=(path:string,label:string)=><label key={path} className="flex items-start gap-2"><input type="checkbox" className="mt-1 shrink-0" value={path} checked={targets.includes(path)} onChange={e=>onChange({...value,buttonTargets:e.target.checked?[...targets,path]:targets.filter(t=>t!==path)})}/><span className="break-words">{label}</span></label>;
 return <fieldset disabled={disabled} className="rounded-lg border p-3 space-y-3"><legend className="font-bold px-1">כפתור בעמודים אחרים</legend>
 <label className="flex gap-2 items-center"><input type="checkbox" checked={!!value.showAsButton} onChange={e=>onChange({...value,showAsButton:e.target.checked,buttonLabel:value.buttonLabel||value.title.slice(0,80)})}/> הוסף כפתור בעמודים אחרים באתר</label>
 {value.showAsButton&&<>
 <label className="block">כיתוב הכפתור<input required maxLength={80} className="block w-full p-2 border rounded bg-card" value={value.buttonLabel||''} onChange={e=>onChange({...value,buttonLabel:e.target.value})}/></label>
 <p className="text-sm text-muted-foreground">הכפתור יוצג בסוף התוכן של כל עמוד שסומן, לאחר פרסום עמוד התוכן הזה.</p>
 <div className="space-y-2"><h3 className="font-bold">עמודים קבועים באתר</h3><div className="grid gap-2 sm:grid-cols-2">{STATIC_CONTENT_LINK_TARGETS.map(t=>checkbox(t.path,t.label))}</div></div>
 <div className="space-y-2"><h3 className="font-bold">עמודי תוכן קיימים</h3>
 {error?<p role="alert" className="text-destructive">{error}</p>:!pages?<p role="status">טוען עמודים...</p>:<div className="grid gap-2 sm:grid-cols-2">{pages.filter(p=>p.id!==id).map(p=>checkbox('/content/'+p.id,p.title+(p.status==='draft'?' (טיוטה)':'')))}</div>}
 {pages&&!pages.some(p=>p.id!==id)&&<p className="text-sm text-muted-foreground">אין עמודי תוכן נוספים.</p>}</div>
 {!targets.length&&<p className="text-sm text-muted-foreground">יש לבחור לפחות עמוד אחד.</p>}
 </>}
 </fieldset>;
}
