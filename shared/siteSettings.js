import {STATIC_CONTENT_LINK_TARGETS,staticContentLinkTarget,isRetiredPublicPage} from './contentLinkTargets.js';
export const LEAGUE_LOGOS=Object.freeze([
 {key:'kids',label:'לוגו ליגת הילדים',purpose:'league-kids-logo',entityId:'000000000000000000000002'},
 {key:'allStars',label:'לוגו ליגת הנבחרות',purpose:'league-all-stars-logo',entityId:'000000000000000000000003'},
]);
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
 const pages=STATIC_CONTENT_LINK_TARGETS.map(({path})=>({path,order:(HEADER_ORDER.indexOf(path)+1)*10,active:true,menu:['/rankings','/all-stars','/tournaments','/news','/store','/birthday'].includes(path),footer:['/','/tournaments','/rankings','/all-stars','/news','/store','/birthday'].includes(path)}));
 const settings={pages,contentPages:[],
 socials:SOCIAL_PLATFORMS.map(({key})=>({key,enabled:false,url:''})),logos:{kids:'',allStars:''}};
 return {...settings,navigation:buildNavigation(settings)};
}
export function pageActive(settings,path){
 if(isRetiredPublicPage(path))return false;
 const target=staticContentLinkTarget(path);
 return !target||target==='/'||settings.pages.find(p=>p.path===target)?.active!==false;
}
export function navigationPages(settings,placement){
 const order=placement==='menu'?HEADER_ORDER:FOOTER_ORDER;
 const rows=order.flatMap(path=>{
  const page=settings.pages.find(p=>p.path===path);
  const target=STATIC_CONTENT_LINK_TARGETS.find(p=>p.path===path);
  return page?.active&&page[placement]&&target?[{to:path,label:target.label,construction:TRAILING_PAGES.includes(path),order:placement==='menu'?(page.order??(HEADER_ORDER.indexOf(path)+1)*10):(FOOTER_ORDER.indexOf(path)+1)*10}]:[];
 });
 for(const page of settings.contentPages||[])if(page.active&&page[placement])rows.push({to:page.path,label:page.label,construction:false,order:page.order??1000});
 const rank=link=>TRAILING_PAGES.includes(link.to)?TRAILING_PAGES.indexOf(link.to)+1:0;
 return rows.sort((a,b)=>rank(a)-rank(b)||a.order-b.order||a.to.localeCompare(b.to)).map(({order,...link})=>link);
}
// Server computes both lists. Fixed staff navigation is not part of the public menu.
export function buildNavigation(settings){
 const footer=navigationPages(settings,'footer');
 const trailing=footer.filter(link=>TRAILING_PAGES.includes(link.to));
 return {menu:navigationPages(settings,'menu'),footer:[...footer.filter(link=>!TRAILING_PAGES.includes(link.to)),{to:'/login',label:'כניסת צוות',construction:false},...trailing]};
}
export function validSocialUrl(key,value){
 if(typeof value!=='string'||value.length>2048)return false;
 if(!value.trim())return true;
 try{
  const url=new URL(value.trim()),platform=SOCIAL_PLATFORMS.find(p=>p.key===key);
  return !!platform&&url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&platform.hosts.some(host=>url.hostname===host||url.hostname.endsWith('.'+host));
 }catch{return false;}
}
