import {sanitizeRichHtml} from '../../../shared/richHtml.js';
export default function SafeHtml({html}:{html:string}){
 let safe:string;
 try{safe=sanitizeRichHtml(html)}catch{return <p role="alert">לא ניתן להציג את התוכן.</p>}
 return <div className="space-y-3 break-words [&_a]:text-blue-500 [&_a]:underline [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ps-6 [&_ol]:ps-6 [&_h2]:text-2xl [&_h3]:text-xl [&_h2]:font-bold [&_h3]:font-bold [&_blockquote]:border-s-4 [&_blockquote]:ps-4" dangerouslySetInnerHTML={{__html:safe}}/>;
}
