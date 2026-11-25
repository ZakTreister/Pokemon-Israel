import type { EventMedia } from '../../types/event';
import ContentSwiper from '../ui/ContentSwiper';

export function MediaGallery({items,carousel=false}:{items:EventMedia[];carousel?:boolean}){
 if(!items.length)return null;
 const media=items.map(item=><figure key={item.id} className="border rounded-lg overflow-hidden bg-card">
 {item.kind==='youtube'?<iframe title={item.caption||'סרטון YouTube'} className="w-full aspect-video" loading="lazy" src={item.url} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture"/>:item.kind==='video'?<video className="w-full aspect-video bg-black" src={item.url} controls playsInline preload="metadata"/>:<img className="w-full aspect-video object-cover" src={item.url} alt={item.caption||'תמונה'} loading="lazy"/>}
 {item.caption&&<figcaption className="p-3 text-sm">{item.caption}</figcaption>}
 </figure>);
 return carousel?<ContentSwiper label="גלגלת מדיה">{media}</ContentSwiper>:<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{media}</div>;
}
