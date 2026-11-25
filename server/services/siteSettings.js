import SiteSettings from '../models/siteSettingsModel.js';
import {publicMediaUrl} from './storage/mediaMetadata.js';
import {resolveUpload,finishAttachment} from './mediaUpload.js';
import {defaultSiteSettings,validSocialUrl,LEAGUE_LOGOS} from '../../shared/siteSettings.js';
import {fail} from '../utils/httpError.js';
const ID='site';
export function settingsView(record){
 const defaults=defaultSiteSettings();
 return {
  logos:{kids:publicMediaUrl(record?.kidsLogoMedia),allStars:publicMediaUrl(record?.allStarsLogoMedia)},
  pages:defaults.pages.map(p=>{const saved=record?.pages?.find(x=>x.path===p.path);return saved?{path:p.path,active:p.path==='/'||saved.active!==false,menu:!!saved.menu,footer:!!saved.footer}:p;}),
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
  return {path:p.path,active:row.active,menu:row.menu,footer:row.footer};
 });
 const socials=defaults.socials.map(s=>{
  const rows=input.socials.filter(x=>x?.key===s.key),row=rows[0];
  if(rows.length!==1||typeof row.enabled!=='boolean'||!validSocialUrl(s.key,row.url)||(row.enabled&&!row.url.trim()))fail(400,'יש להזין קישור HTTPS תקין לרשת החברתית');
  return {key:s.key,enabled:row.enabled,url:row.url.trim()};
 });
 return {pages,socials};
}
export async function getSiteSettings(){return settingsView(await SiteSettings.findById(ID).lean().maxTimeMS(600));}
export async function saveSiteSettings(req){
 const fields=settingsFields(req.body);
 const previous=await SiteSettings.findById(ID).lean();
 const attachments=[];
 for(const logo of LEAGUE_LOGOS){
  const field=logo.key+'LogoMedia';
  const attachment=await resolveUpload(req,logo.purpose,logo.entityId,previous?.[field]);
  if(attachment){fields[field]=attachment.media;attachments.push({attachment,previous:previous?.[field]});}
 }
 const record=await SiteSettings.findOneAndUpdate({_id:ID},{$set:fields},{upsert:true,new:true,runValidators:true}).lean();
 for(const item of attachments)await finishAttachment(req,item.attachment,item.previous);
 return settingsView(record);
}
export function publicSiteSettings(settings){return {...settings,socials:settings.socials.map(s=>({...s,url:s.enabled?s.url:''}))};}
