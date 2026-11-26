import {Link} from 'react-router-dom';
import type {Update} from '../../../types/update';
import Button from '../../../components/ui/Button';
import UpdateAction from './UpdateAction';
export default function PublicUpdateCard({update}:{update:Update}){
 const image=update.image||update.mediaItems?.find(m=>m.kind==='image')?.url;
 return <article className="cs-public-card p-5 border-t-4 border-t-gold flex flex-col gap-3">
 {update.date&&<p className="text-sm text-blue-500 font-bold">{new Date(update.date).toLocaleDateString('he-IL')}</p>}
 {image&&<img src={image} alt="" loading="lazy" className="w-full h-44 object-cover rounded-md"/>}
 <h3 className="font-extrabold text-xl">{update.title}</h3>
 <p className="text-muted-foreground whitespace-pre-wrap line-clamp-4">{update.description??update.content}</p>
 <UpdateAction update={update}/>
 <Button asChild variant="outline" className="mt-auto"><Link to={'/news/'+update.id}>לעדכון המלא</Link></Button>
 </article>;
}
