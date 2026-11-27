import {useEffect,useState} from 'react';
import {sanitizeRichHtml,hasRichContent} from '../../../shared/richHtml.js';
import { richHtmlClassName } from "./richHtmlStyles";
export default function SafeHtml({html,mobileHtml,mobileEnabled=false}:{html:string;mobileHtml?:string;mobileEnabled?:boolean}){
 const [mobile,setMobile]=useState(()=>typeof window!=='undefined'&&typeof window.matchMedia==='function'&&window.matchMedia('(width < 768px)').matches);
 useEffect(()=>{
  if(!mobileEnabled||!hasRichContent(mobileHtml)||typeof window==='undefined'||typeof window.matchMedia!=='function')return;
  const query=window.matchMedia('(width < 768px)');
  const update=()=>setMobile(query.matches);
  update();query.addEventListener('change',update);return()=>query.removeEventListener('change',update);
 },[mobileEnabled,mobileHtml]);
 let safe:string;
 try{safe=sanitizeRichHtml(mobile&&mobileEnabled&&hasRichContent(mobileHtml)?mobileHtml!:html)}catch{return <p role="alert">לא ניתן להציג את התוכן.</p>}
 return <div className={richHtmlClassName+' cs-rich-html-public'} dangerouslySetInnerHTML={{__html:safe.replace(/<img /g,'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" ')}}/>;
}
