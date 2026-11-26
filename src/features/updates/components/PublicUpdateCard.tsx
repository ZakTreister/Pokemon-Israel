import type {Update} from '../../../types/update';
import SafeHtml from '../../../components/content/SafeHtml';
import UpdateAction from './UpdateAction';
export default function PublicUpdateCard({update}:{update:Update}){
 const image=update.image||update.mediaItems?.find(m=>m.kind==='image')?.url;
 return <article id={'update-'+update.id} className="cs-public-card h-[380px] box-border p-5 border-t-4 border-t-gold flex flex-col gap-3 overflow-hidden min-w-0">
 {update.date&&<p className="shrink-0 text-sm text-blue-500 font-bold">{new Date(update.date).toLocaleDateString('he-IL')}</p>}
 {image&&<img src={image} alt="" loading="lazy" className="shrink-0 w-full h-28 object-cover rounded-md"/>}
 <h3 className="shrink-0 font-extrabold text-xl line-clamp-2">{update.title}</h3>
 <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden break-words overscroll-contain" tabIndex={0} role="region" aria-label={'תוכן העדכון: '+update.title}>
 {update.descriptionHtml!==undefined?<SafeHtml html={update.descriptionHtml}/>:<p className="whitespace-pre-wrap">{update.description??update.content}</p>}
 </div>
 <div className="shrink-0 empty:hidden"><UpdateAction update={update}/></div>
 </article>;
}
