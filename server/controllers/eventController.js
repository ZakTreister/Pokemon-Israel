import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Event from '../models/eventModel.js';
import ContentPage from '../models/contentPageModel.js';
import {richBody} from '../services/contentFields.js';
import Tournament from '../models/tournamentModel.js';
import Update from '../models/updateModel.js';
import { publicTournament } from '../services/publicTournament.js';
import { fail } from '../utils/httpError.js';
import { attachAsset,removeAsset,changeAssetVisibility } from '../services/assetAttachment.js';
const valid = id => typeof id === 'string' && mongoose.isValidObjectId(id) && /^[a-f0-9]{24}$/i.test(id);
const limit = (value, max = 100) => Math.max(1, Math.min(max, parseInt(value, 10) || 20));
function categoryFor(type) { return type === 'inter_team' ? 'all_stars' : 'club'; }
async function eventFields(input, current) {
  const data = {};
  for (const field of ['title', 'description', 'bodyHtml','contentPageIds','showInFieldNews','category', 'status', 'featured', 'openingRound', 'startDate', 'endDate']) {
    if (input[field] === undefined) continue;
    data[field] = input[field];
  }
  if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim() || data.title.length > 180)) fail(400, 'יש להזין שם אירוע תקין');
  if (data.description !== undefined && (typeof data.description !== 'string' || data.description.length > 5000)) fail(400, 'תיאור האירוע אינו תקין');
  if(data.bodyHtml!==undefined)data.bodyHtml=richBody(data.bodyHtml);
  if(data.showInFieldNews!==undefined&&typeof data.showInFieldNews!=='boolean')fail(400,'סימון חדשות לא תקין');
  if(data.contentPageIds!==undefined){
    if(!Array.isArray(data.contentPageIds)||data.contentPageIds.length>100||!data.contentPageIds.every(valid)||new Set(data.contentPageIds).size!==data.contentPageIds.length)fail(400,'רשימת עמודי תוכן לא תקינה');
    if(await ContentPage.countDocuments({_id:{$in:data.contentPageIds}})!==data.contentPageIds.length)fail(400,'עמוד תוכן משויך לא נמצא');
  }
  if (data.category !== undefined && !['club', 'all_stars'].includes(data.category)) fail(400, 'סוג אירוע לא חוקי');
  if (data.status !== undefined && !['draft', 'published'].includes(data.status)) fail(400, 'סטטוס אירוע לא חוקי');
  if (data.featured !== undefined && typeof data.featured !== 'boolean') fail(400, 'ערך הבלטה לא חוקי');
  if (data.openingRound !== undefined && typeof data.openingRound !== 'boolean') fail(400, 'ערך מחזור פתיחה לא חוקי');
  if ((data.category ?? current?.category) !== 'all_stars' && (data.openingRound ?? current?.openingRound)) fail(400, 'מחזור פתיחה אפשרי רק באולסטארז');
  for (const field of ['startDate', 'endDate']) if (data[field] != null) {
    const date = new Date(data[field]);
    if (Number.isNaN(date.getTime())) fail(400, 'תאריך אירוע לא תקין');
    data[field] = date;
  }
  const start = data.startDate === undefined ? current?.startDate : data.startDate;
  const end = data.endDate === undefined ? current?.endDate : data.endDate;
  if (start && end && new Date(start) > new Date(end)) fail(400, 'תאריך הסיום קודם להתחלה');
  if (data.category && current && data.category !== current.category && await Tournament.exists({ eventId: current._id })) fail(409, 'יש לנתק טורנירים לפני שינוי סוג האירוע');
  return data;
}
const findEvent = async id => {
  if (!valid(id)) fail(404, 'האירוע לא נמצא');
  const event = await Event.findById(id);
  if (!event) fail(404, 'האירוע לא נמצא');
  return event;
};
const summary = e => ({ id: e.id, title: e.title, description: e.description,
  bodyHtml:e.bodyHtml||'',contentPageIds:(e.contentPageIds||[]).map(String),showInFieldNews:!!e.showInFieldNews,
  category: e.category, status: e.status, featured: e.featured, openingRound: !!e.openingRound, startDate: e.startDate,
  endDate: e.endDate, coverUrl: e.toJSON().coverUrl, mediaItems: e.toJSON().mediaItems });
export const listEvents = asyncHandler(async (req, res) => {
  const query = { status: 'published' };
  if (['club','all_stars'].includes(req.query.category)) query.category = req.query.category;
  const page = Math.max(1, parseInt(req.query.page,10) || 1), pageSize = limit(req.query.pageSize);
  const total = await Event.countDocuments(query);
  const items = await Event.find(query).sort({ featured: -1, startDate: -1, createdAt: -1 }).skip((page-1)*pageSize).limit(pageSize);
  res.json({ items: items.map(summary), total, page, pageSize, totalPages: Math.max(1,Math.ceil(total/pageSize)) });
});
// Only real club tournaments can award national-ranking points. Filter before selecting the earliest event.
export const nextRankingEvent = asyncHandler(async (_req,res) => {
  const today = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const ids = await Tournament.distinct('eventId',{type:'quarterly',eventId:{$ne:null}});
  const event = await Event.findOne({_id:{$in:ids},status:'published',category:'club',startDate:{$gte:new Date(today+'T00:00:00.000Z')}}).sort({startDate:1,_id:1});
  res.json(event ? summary(event) : null);
});
export const manageEvents = asyncHandler(async (req,res) => {
  const items = await Event.find({}).sort({ createdAt: -1 }).limit(200);
  res.json(items.map(summary));
});
async function linkedPages(event,managed=false){
 const ids=event.contentPageIds||[];
 if(!ids.length)return [];
 const pages=await ContentPage.find({_id:{$in:ids},...(managed?{}:{status:'published'})}).select('title subtitle status');
 const byId=new Map(pages.map(page=>[page.id,{id:page.id,title:page.title,subtitle:page.subtitle,status:page.status}]));
 return ids.map(id=>byId.get(String(id))).filter(Boolean);
}
export const getEvent = asyncHandler(async (req,res) => {
  const event = await findEvent(req.params.id);
  if (event.status !== 'published') fail(404, 'האירוע לא נמצא');
  const [tournaments, updates] = await Promise.all([
    Tournament.find({ eventId:event._id }).sort({date:1}),
    Update.find({ eventId:event._id }).sort({date:-1}),
  ]);
  res.json({ ...event.toJSON(), tournaments:tournaments.map(t=>publicTournament(t)),
    updates:updates.map(u=>u.toJSON()),contentPages:await linkedPages(event) });
});
export const getManagedEvent = asyncHandler(async (req,res) => {
  const event = await findEvent(req.params.id);
  const [tournaments, updates] = await Promise.all([
    Tournament.find({ eventId:event._id }).sort({date:1}),
    Update.find({eventId:event._id}).sort({date:-1}),
  ]);
  res.json({ ...event.toJSON(), tournaments:tournaments.map(t=>publicTournament(t)),
    updates:updates.map(u=>u.toJSON()),contentPages:await linkedPages(event,true) });
});
export const createEvent = asyncHandler(async (req,res) => {
  const fields = await eventFields(req.body);
  if (!fields.title || !fields.category) fail(400,'שם וסוג אירוע הם שדות חובה');
  const event=await Event.create({...fields,createdBy:req.user._id});
  res.status(201).json(event);
});
export const changeEvent = asyncHandler(async (req,res) => {
  const event = await findEvent(req.params.id);
  Object.assign(event,await eventFields(req.body,event));
  await event.save();
  res.json(event);
});
export const removeEvent = asyncHandler(async (req,res) => {
  const event = await findEvent(req.params.id);
  if (await Tournament.exists({eventId:event._id}) || await Update.exists({eventId:event._id}))
    fail(409,'יש לנתק טורנירים ועדכונים לפני מחיקת האירוע');
  await event.deleteOne();res.json({message:'האירוע נמחק'});
});
export const linkTournament = asyncHandler(async (req,res) => {
  const event = await findEvent(req.params.id);
  if (!valid(req.params.tournamentId)) fail(404,'הטורניר לא נמצא');
  const t = await Tournament.findById(req.params.tournamentId);
  if (!t) fail(404,'הטורניר לא נמצא');
  if (t.type==='team_internal') fail(400,'טורניר פנימי שבועי אינו משויך לאירוע');
  if (categoryFor(t.type) !== event.category) fail(400,'סוג הטורניר אינו תואם את האירוע');
  if (t.eventId && String(t.eventId)!==String(event._id)) fail(409,'הטורניר משויך כבר לאירוע אחר');
  const result=await Tournament.updateOne({ _id:t._id,$or:[{eventId:null},{eventId:event._id}] },{$set:{eventId:event._id}});
  if(!result.matchedCount) fail(409,'שיוך הטורניר השתנה במהלך הפעולה');
  res.json({message:'הטורניר שויך לאירוע'});
});
export const unlinkTournament = asyncHandler(async (req,res) => {
  const event = await findEvent(req.params.id);
  if (!valid(req.params.tournamentId)) fail(404,'הטורניר לא נמצא');
  const result=await Tournament.updateOne({_id:req.params.tournamentId,eventId:event._id},{$set:{eventId:null}});
  if (!result.matchedCount) fail(404,'הטורניר אינו משויך לאירוע');
  // Do not resurrect a detached legacy fixture as a phantom meeting.
  await Event.updateOne({_id:event._id},{$pull:{fixtures:{tournament:req.params.tournamentId}}});
  res.json({message:'הטורניר הוסר מהאירוע'});
});
export const addEventAsset=asyncHandler(async(req,res)=>res.status(201).json(await attachAsset(req,await findEvent(req.params.id),'event-media')));
export const deleteEventAsset=asyncHandler(async(req,res)=>res.json(await removeAsset(await findEvent(req.params.id),req.params.assetId)));

export const changeEventAsset=asyncHandler(async(req,res)=>res.json(await changeAssetVisibility(await findEvent(req.params.id),req.params.assetId,req.body.showInGallery)));
