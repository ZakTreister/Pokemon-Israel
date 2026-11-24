import type { EventMedia } from '../../types/event';
export function MediaGallery({items}:{items:EventMedia[]}){
 return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=><figure key={item.id} className="border rounded-lg overflow-hidden bg-card">
 {item.kind==='youtube'?<iframe title={item.caption||'סרטון YouTube'} className="w-full aspect-video" loading="lazy" src={item.url} allowFullScreen referrerPolicy="strict-origin-when-cross-origin" allow="encrypted-media; picture-in-picture"/>:item.kind==='video'?<video className="w-full aspect-video bg-black" src={item.url} controls preload="metadata"/>:<img className="w-full aspect-video object-cover" src={item.url} alt={item.caption||'תמונה מהאירוע'} loading="lazy"/>}
 {item.caption&&<figcaption className="p-3 text-sm">{item.caption}</figcaption>}
 </figure>)}</div>;
}
