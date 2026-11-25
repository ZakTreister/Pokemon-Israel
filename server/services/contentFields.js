import { sanitizeRichHtml } from '../../shared/richHtml.js';
import { fail } from '../utils/httpError.js';
export function richBody(input){
 try{return sanitizeRichHtml(input);}catch(error){fail(400,error.message);}
}
export function contentPageFields(input,current={}){
 const data={};
 for(const key of ['title','subtitle','bodyHtml','status','showInNavigation','navigationLabel','showInFieldNews'])if(input[key]!==undefined)data[key]=input[key];
 for(const [key,max] of [['title',180],['subtitle',5000],['navigationLabel',80]])if(data[key]!==undefined){
  if(typeof data[key]!=='string'||data[key].length>max)fail(400,'יש להזין טקסט תקין');
  data[key]=data[key].trim();
 }
 if(!(data.title??current.title))fail(400,'כותרת היא שדה חובה');
 if(data.status!==undefined&&!['draft','published'].includes(data.status))fail(400,'סטטוס לא תקין');
 for(const key of ['showInNavigation','showInFieldNews'])if(data[key]!==undefined&&typeof data[key]!=='boolean')fail(400,'סימון לא תקין');
 if((data.showInNavigation??current.showInNavigation)&&!(data.navigationLabel??current.navigationLabel))fail(400,'יש להזין שם לפריט בתפריט');
 if(data.bodyHtml!==undefined)data.bodyHtml=richBody(data.bodyHtml);
 return data;
}
