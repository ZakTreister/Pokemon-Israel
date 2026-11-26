import ContentPage from '../models/contentPageModel.js';
import SiteSettings from '../models/siteSettingsModel.js';
import {publicMediaUrl} from './storage/mediaMetadata.js';
import {resolveUpload,finishAttachment} from './mediaUpload.js';
import {defaultSiteSettings,validSocialUrl,LEAGUE_LOGOS,buildNavigation} from '../../shared/siteSettings.js';
import {fail} from '../utils/httpError.js';
const ID='site';
export function settingsView(record){
 const defaults=defaultSiteSettings();
 return {
  logos:{kids:publicMediaUrl(record?.kidsLogoMedia),allStars:publicMediaUrl(record?.allStarsLogoMedia)},
  pages:defaults.pages.map(p=>{const saved=record?.pages?.find(x=>x.path===p.path);return saved?{path:p.path,active:p.path==='/'||saved.active!==false,menu:!!saved.menu,footer:!!saved.footer,order:Number.isInteger(saved.order)?saved.order:p.order}:p;}),
  socials:defaults.socials.map(s=>{const saved=record?.socials?.find(x=>x.key===s.key);return saved?{key:s.key,enabled:!!saved.enabled,url:saved.url||''}:s;}),
 };
}
export function settingsFields(input){
 const defaults=defaultSiteSettings();
 if(!Array.isArray(input?.pages)||!Array.isArray(input?.socials)||input.pages.length!==defaults.pages.length||input.socials.length!==defaults.socials.length)fail(400,'הגדרות אתר אינן תקינות');
 const pages=defaults.pages.map(p=>{
  const rows=input.pages.filter(x=>x?.path===p.path);
  const row=rows[0];
  if(rows.length!==1||['active','menu','footer'].some(k=>typeof row[k]!=='boolean')||(p.path==='/'&&!row.active))fail(400,'הגדרת עמוד אינה תקינה');
  if(row.order!==undefined&&(!Number.isInteger(row.order)||row.order<1||row.order>100000))fail(400,'סדר ניווט לא תקין');
  return {path:p.path,active:row.active,menu:row.menu,footer:row.footer,order:row.order??p.order};
 });
 const socials=defaults.socials.map(s=>{
  const rows=input.socials.filter(x=>x?.key===s.key),row=rows[0];
  if(rows.length!==1||typeof row.enabled!=='boolean'||!validSocialUrl(s.key,row.url)||(row.enabled&&!row.url.trim()))fail(400,'יש להזין קישור HTTPS תקין לרשת החברתית');
  return {key:s.key,enabled:row.enabled,url:row.url.trim()};
 });
 return {pages,socials};
}
export async function getSiteSettings(){return settingsView(await SiteSettings.findById(ID).lean().maxTimeMS(600));}
async function navigationView(record,managed=false){
 const settings=settingsView(record);
 const content=await ContentPage.find({}).select('title navigationLabel showInNavigation status').sort({createdAt:1,_id:1}).lean();
 const contentPages=content.map((page,index)=>{const path='/content/'+String(page._id),saved=record?.contentNavigation?.find(p=>p.path===path);return {path,title:page.title,label:page.navigationLabel||page.title,active:page.status==='published',menu:!!page.showInNavigation,footer:!!saved?.footer,order:saved?.order??1000+index*10};});
 const result={...settings,contentPages:managed?contentPages:contentPages.filter(p=>p.active)};return {...result,navigation:buildNavigation(result)};
}
export async function getNavigationSettings(managed=false){return navigationView(await SiteSettings.findById(ID).lean().maxTimeMS(600),managed);}
export async function saveSiteSettings(req){
 const fields=settingsFields(req.body);
 const previous=await SiteSettings.findById(ID).lean();
 const attachments=[];
 const contentChanges=[];
 if(req.body.contentPages!==undefined){
  if(!Array.isArray(req.body.contentPages)||req.body.contentPages.length>5000)fail(400,'עמודי תוכן אינם תקינים');
  const rows=req.body.contentPages,seen=new Set();
  for(const row of rows){
   if(typeof row?.path!=='string'||!/^\/content\/[a-f0-9]{24}$/.test(row.path)||seen.has(row.path)||typeof row.menu!=='boolean'||typeof row.footer!=='boolean'||!Number.isInteger(row.order)||row.order<1||row.order>100000)fail(400,'סדר או עמוד תוכן לא תקין');
   seen.add(row.path);
   const page=await ContentPage.findById(row.path.slice(9)).select('title navigationLabel showInNavigation');
   if(!page)fail(409,'רשימת עמודי התוכן השתנתה. רעננו את ההגדרות.');
   contentChanges.push({updateOne:{filter:{_id:page._id},update:{$set:{showInNavigation:row.menu,...(row.menu&&!page.navigationLabel?{navigationLabel:page.title.slice(0,80)}:{})}}}});
  }
  fields.contentNavigation=[...(previous?.contentNavigation||[]).filter(p=>!seen.has(p.path)),...rows.map(row=>({path:row.path,footer:row.footer,order:row.order}))];
 }
 for(const logo of LEAGUE_LOGOS){
  const field=logo.key+'LogoMedia';
  const attachment=await resolveUpload(req,logo.purpose,logo.entityId,previous?.[field]);
  if(attachment){fields[field]=attachment.media;attachments.push({attachment,previous:previous?.[field]});}
 }
 const record=await SiteSettings.findOneAndUpdate({_id:ID},{$set:fields},{upsert:true,new:true,runValidators:true}).lean();
 for(const item of attachments)await finishAttachment(req,item.attachment,item.previous);
 if(contentChanges.length)await ContentPage.bulkWrite(contentChanges);
 return navigationView(record,true);
}
export function publicSiteSettings(settings){return {...settings,contentPages:undefined,socials:settings.socials.map(s=>({...s,url:s.enabled?s.url:''}))};}
