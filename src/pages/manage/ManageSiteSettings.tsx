import {useEffect,useState} from 'react';
import {STATIC_CONTENT_LINK_TARGETS} from '../../../shared/contentLinkTargets';
import {SOCIAL_PLATFORMS,validSocialUrl,type SiteSettings,type PageSetting,type SocialSetting} from '../../../shared/siteSettings';
import {useSiteSettings} from '../../features/siteSettings/SiteSettingsProvider';
import {siteSettingsService} from '../../services/siteSettings';
import Button from '../../components/ui/Button';
import {Card} from '../../components/ui/Card';
import {requestError} from '../../utils/requestError';

export default function ManageSiteSettings(){
 const [value,setValue]=useState<SiteSettings|null>(null),[tab,setTab]=useState<'pages'|'socials'>('pages'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 const {apply}=useSiteSettings();
 useEffect(()=>{let active=true;siteSettingsService.manage().then(data=>{if(active)setValue(data);}).catch(e=>{if(active)setError(requestError(e));});return()=>{active=false};},[]);
 const changePage=(path:string,patch:Partial<PageSetting>)=>{setSaved(false);setValue(v=>v&&({...v,pages:v.pages.map(p=>p.path===path?{...p,...patch}:p)}));};
 const changeSocial=(key:string,patch:Partial<SocialSetting>)=>{setSaved(false);setValue(v=>v&&({...v,socials:v.socials.map(s=>s.key===key?{...s,...patch}:s)}));};
 const invalid=value?.socials.some(s=>!validSocialUrl(s.key,s.url)||(s.enabled&&!s.url.trim()));
 const save=async()=>{if(!value||busy||invalid)return;setBusy(true);setError('');setSaved(false);try{const data=await siteSettingsService.save(value);setValue(data);apply(data);setSaved(true);}catch(e){setError(requestError(e));}finally{setBusy(false);}};
 return <div className="space-y-4">
 <h2 className="text-2xl font-bold">הגדרות האתר</h2>
 <div className="flex flex-wrap gap-2" role="group" aria-label="תחומי הגדרות">
 <Button type="button" variant={tab==='pages'?'default':'outline'} aria-pressed={tab==='pages'} onClick={()=>setTab('pages')}>עמודים וניווט</Button>
 <Button type="button" variant={tab==='socials'?'default':'outline'} aria-pressed={tab==='socials'} onClick={()=>setTab('socials')}>רשתות חברתיות</Button></div>
 {error&&<p role="alert" className="text-destructive">{error}</p>}
 {!value&&!error&&<p role="status">טוען הגדרות...</p>}
 {value&&<><Card className="p-4 space-y-4">
 {tab==='pages'?<><p className="text-sm text-muted-foreground">הסרה מהתפריט או מהפוטר משאירה את העמוד נגיש. השבתת עמוד מסתירה אותו משניהם וחוסמת את כתובתו הציבורית. ניתן להפעיל מחדש בלי לאבד תוכן. דף הבית תמיד פעיל.</p>
 <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b">{['עמוד','פעיל','בתפריט','בפוטר'].map(h=><th key={h} className="p-2 text-start">{h}</th>)}</tr></thead><tbody>
 {value.pages.map(p=>{const label=STATIC_CONTENT_LINK_TARGETS.find(t=>t.path===p.path)?.label||p.path;return <tr key={p.path} className="border-b"><th scope="row" className="p-2 text-start font-medium">{label}</th>
 <td className="p-2"><input type="checkbox" aria-label={label+' פעיל'} checked={p.active} disabled={busy||p.path==='/'} onChange={e=>changePage(p.path,{active:e.target.checked})}/></td>
 <td className="p-2"><input type="checkbox" aria-label={label+' בתפריט'} checked={p.active&&p.menu} disabled={busy||!p.active} onChange={e=>changePage(p.path,{menu:e.target.checked})}/></td>
 <td className="p-2"><input type="checkbox" aria-label={label+' בפוטר'} checked={p.active&&p.footer} disabled={busy||!p.active} onChange={e=>changePage(p.path,{footer:e.target.checked})}/></td></tr>;})}
 </tbody></table></div><p className="text-sm text-muted-foreground">חנות והזמנת יום הולדת תמיד אחרונות כשהן מוצגות. עמודי תוכן דינמיים מנוהלים בנפרד.</p></>:<>
 <p className="text-sm text-muted-foreground">הקישורים הפעילים יוצגו כאייקונים בפוטר. ניתן להשבית קישור בלי למחוק את הכתובת.</p>
 {value.socials.map(s=>{const label=SOCIAL_PLATFORMS.find(p=>p.key===s.key)?.label||s.key;return <div key={s.key} className="space-y-2 border-b pb-3"><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={s.enabled} disabled={busy} onChange={e=>changeSocial(s.key,{enabled:e.target.checked})}/>{label}</label><input aria-label={label+' כתובת'} type="url" dir="ltr" value={s.url} placeholder="https://..." disabled={busy} onChange={e=>changeSocial(s.key,{url:e.target.value})} className="block w-full p-2 border rounded bg-card"/>{(!validSocialUrl(s.key,s.url)||(s.enabled&&!s.url.trim()))&&<p className="text-sm text-destructive">יש להזין כתובת HTTPS תקינה של {label}</p>}</div>;})}
 </>}
 </Card>{invalid&&tab==='pages'&&<p role="alert" className="text-destructive">יש לתקן את הקישורים בלשונית רשתות חברתיות.</p>}
 <Button disabled={busy||!!invalid} onClick={()=>void save()}>{busy?'שומר...':'שמור הגדרות'}</Button>{saved&&<p role="status">ההגדרות נשמרו</p>}</>}
 </div>;
}
