// Shared allow-list of public fixed destinations. No staff/auth or player detail routes.
export const STATIC_CONTENT_LINK_TARGETS=Object.freeze([
 {path:'/',label:'דף הבית'},
 {path:'/rankings',label:'הליגה הישראלית'},
 {path:'/all-stars',label:'All Stars'},
 {path:'/tournaments',label:'אירועים'},
 {path:'/news',label:'חדשות'},
 {path:'/gallery',label:'גלריה'},
 {path:'/deck-stats',label:'סטטיסטיקות דקים'},
 {path:'/about',label:'על הליגה'},
 {path:'/store',label:'חנות'},
 {path:'/birthday',label:'הזמנת יום הולדת'},
]);
export function staticContentLinkTarget(path){
 const normalized=path.replace(/\/+$/,'')||'/';
 const canonical=normalized==='/events'?'/tournaments':normalized;
 return STATIC_CONTENT_LINK_TARGETS.some(target=>target.path===canonical)?canonical:null;
}
export function normalizeContentLinkTarget(path){
 if(typeof path!=='string')return null;
 return staticContentLinkTarget(path)||(/^\/content\/[a-f0-9]{24}$/i.test(path)?'/content/'+path.slice(9).toLowerCase():null);
}
