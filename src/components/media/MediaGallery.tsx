import { useRef } from 'react';
import type { EventMedia } from '../../types/event';
import Button from '../ui/Button';
export function MediaGallery({items,carousel=false}:{items:EventMedia[];carousel?:boolean}){
 const track=useRef<HTMLDivElement>(null);
 if(!items.length)return null;
 const scroll=(direction:number)=>track.current?.scrollBy({left:direction*track.current.clientWidth,behavior:'smooth'});
 return <div className="min-w-0 space-y-2">
 {carousel&&items.length>1&&<div className="flex justify-end gap-2"><Button type="button" contextual variant="outline" size="sm" onClick={()=>scroll(1)} aria-label="מדיה קודמת">→</Button><Button type="button" contextual variant="outline" size="sm" onClick={()=>scroll(-1)} aria-label="מדיה הבאה">←</Button></div>}
 <div ref={track} className={carousel?'flex overflow-x-auto snap-x snap-mandatory gap-3 pb-2':'grid gap-4 sm:grid-cols-2 lg:grid-cols-3'}>{items.map(item=><figure key={item.id} className={'border rounded-lg overflow-hidden bg-card '+(carousel?'min-w-0 flex-[0_0_100%] snap-start':'')}>
 {item.kind==='youtube'?<iframe title={item.caption||'סרטון YouTube'} className="w-full aspect-video" loading="lazy" src={item.url} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture"/>:item.kind==='video'?<video className="w-full aspect-video bg-black" src={item.url} controls preload="metadata"/>:<img className="w-full aspect-video object-cover" src={item.url} alt={item.caption||'תמונה'} loading="lazy"/>}
 {item.caption&&<figcaption className="p-3 text-sm">{item.caption}</figcaption>}
 </figure>)}</div></div>;
}
