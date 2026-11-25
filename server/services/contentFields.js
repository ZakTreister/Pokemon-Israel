import { sanitizeRichHtml } from '../../shared/richHtml.js';
import { fail } from '../utils/httpError.js';
import {normalizeContentLinkTarget,isRetiredPublicPage} from '../../shared/contentLinkTargets.js';
export function richBody(input){
 try{return sanitizeRichHtml(input);}catch(error){fail(400,error.message);}
}
export function contentPageFields(input,current={}){
 const data={};
 for(const key of ['title','subtitle','bodyHtml','status','showInNavigation','navigationLabel','showInFieldNews','isAllStars','showAsButton','buttonLabel','buttonTargets'])if(input[key]!==undefined)data[key]=input[key];
 for(const [key,max] of [['title',180],['subtitle',5000],['navigationLabel',80],['buttonLabel',80]])if(data[key]!==undefined){
  if(typeof data[key]!=='string'||data[key].length>max)fail(400,'יש להזין טקסט תקין');
  data[key]=data[key].trim();
 }
 if(!(data.title??current.title))fail(400,'כותרת היא שדה חובה');
 if(data.status!==undefined&&!['draft','published'].includes(data.status))fail(400,'סטטוס לא תקין');
 for(const key of ['showInNavigation','showInFieldNews','isAllStars','showAsButton'])if(data[key]!==undefined&&typeof data[key]!=='boolean')fail(400,'סימון לא תקין');
 if((data.showInNavigation??current.showInNavigation)&&!(data.navigationLabel??current.navigationLabel))fail(400,'יש להזין שם לפריט בתפריט');
 if(data.buttonTargets!==undefined){
  if(!Array.isArray(data.buttonTargets)||data.buttonTargets.length>200)fail(400,'רשימת עמודים לא תקינה');
  const targets=data.buttonTargets.map(normalizeContentLinkTarget);
  if(targets.some(target=>!target))fail(400,'יעד כפתור לא תקין');
  data.buttonTargets=[...new Set(targets)];
 }
 // Legacy records may still contain retired host routes. Repair those on save
 // without invalidating unrelated edits; new requests cannot add retired hosts.
 if(data.buttonTargets===undefined&&current.buttonTargets?.some(isRetiredPublicPage)){
  data.buttonTargets=current.buttonTargets.filter(path=>!isRetiredPublicPage(path));
  if(!data.buttonTargets.length&&data.showAsButton===undefined)data.showAsButton=false;
 }
 if((data.showAsButton??current.showAsButton)&&(!(data.buttonLabel??current.buttonLabel)||!(data.buttonTargets??current.buttonTargets)?.length))fail(400,'יש להזין כיתוב לכפתור ולבחור לפחות עמוד אחד');
 if(current._id&&(data.buttonTargets??current.buttonTargets??[]).includes('/content/'+String(current._id)))fail(400,'לא ניתן להציג כפתור בעמוד עצמו');
 if(data.bodyHtml!==undefined)data.bodyHtml=richBody(data.bodyHtml);
 return data;
}
