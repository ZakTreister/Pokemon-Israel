import {sanitizeRichHtml} from '../../../shared/richHtml.js';
import { richHtmlClassName } from "./richHtmlStyles";
export default function SafeHtml({html}:{html:string}){
 let safe:string;
 try{safe=sanitizeRichHtml(html)}catch{return <p role="alert">לא ניתן להציג את התוכן.</p>}
 return <div className={richHtmlClassName+' cs-rich-html-public'} dangerouslySetInnerHTML={{__html:safe.replace(/<img /g,'<img loading="lazy" decoding="async" referrerpolicy="no-referrer" ')}}/>;
}
