import {STATIC_CONTENT_LINK_TARGETS,staticContentLinkTarget,isRetiredPublicPage} from './contentLinkTargets.js';
export const SOCIAL_PLATFORMS=Object.freeze([
 {key:'facebook',label:'Facebook',hosts:['facebook.com','fb.com','fb.me']},
 {key:'instagram',label:'Instagram',hosts:['instagram.com']},
 {key:'youtube',label:'YouTube',hosts:['youtube.com','youtu.be']},
 {key:'tiktok',label:'TikTok',hosts:['tiktok.com']},
 {key:'whatsapp',label:'WhatsApp',hosts:['whatsapp.com','wa.me']},
]);
export const HEADER_ORDER=['/rankings','/all-stars','/tournaments','/news','/','/gallery','/store','/birthday'];
export const FOOTER_ORDER=['/','/tournaments','/rankings','/all-stars','/news','/gallery','/store','/birthday'];
export const TRAILING_PAGES=['/store','/birthday'];
export function defaultSiteSettings(){
 return {pages:STATIC_CONTENT_LINK_TARGETS.map(({path})=>({path,active:true,menu:['/rankings','/all-stars','/tournaments','/news','/store','/birthday'].includes(path),footer:['/','/tournaments','/rankings','/all-stars','/news','/store','/birthday'].includes(path)})),
 socials:SOCIAL_PLATFORMS.map(({key})=>({key,enabled:false,url:''}))};
}
export function pageActive(settings,path){
 if(isRetiredPublicPage(path))return false;
 const target=staticContentLinkTarget(path);
 return !target||target==='/'||settings.pages.find(p=>p.path===target)?.active!==false;
}
export function navigationPages(settings,placement){
 const order=placement==='menu'?HEADER_ORDER:FOOTER_ORDER;
 return order.flatMap(path=>{
  const page=settings.pages.find(p=>p.path===path);
  const target=STATIC_CONTENT_LINK_TARGETS.find(p=>p.path===path);
  return page?.active&&page[placement]&&target?[{to:path,label:target.label,construction:TRAILING_PAGES.includes(path)}]:[];
 });
}
export function validSocialUrl(key,value){
 if(typeof value!=='string'||value.length>2048)return false;
 if(!value.trim())return true;
 try{
  const url=new URL(value.trim()),platform=SOCIAL_PLATFORMS.find(p=>p.key===key);
  return !!platform&&url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&platform.hosts.some(host=>url.hostname===host||url.hostname.endsWith('.'+host));
 }catch{return false;}
}
