import {sanitizeRichHtml} from '../../../shared/richHtml.js';
import { richHtmlClassName } from "./richHtmlStyles";
export default function SafeHtml({html}:{html:string}){
 let safe:string;
 try{safe=sanitizeRichHtml(html)}catch{return <p role="alert">לא ניתן להציג את התוכן.</p>}
 return <div className={richHtmlClassName} dangerouslySetInnerHTML={{__html:safe}}/>;
}
