import mongoose from 'mongoose';
import Team from '../models/teamModel.js';
import Action from '../models/teamFavoriteActionModel.js';
import {fail} from '../utils/httpError.js';
const validId=x=>typeof x==='string'&&/^[a-f0-9]{24}$/i.test(x);
export function favoriteFields(input){
 const {operationId,fromTeam=null,toTeam=null,actionTeam}=input;
 if(typeof operationId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(operationId)||!validId(actionTeam)||[fromTeam,toTeam].some(x=>x!==null&&!validId(x))||(fromTeam&&fromTeam===toTeam)||(toTeam&&actionTeam!==toTeam)||(fromTeam&&!toTeam&&actionTeam!==fromTeam))fail(400,'פעולת אוהד לא תקינה');
 return {_id:operationId,fromTeam,toTeam,actionTeam};
}
export async function fanCounts(ids){
 const keys=ids.map(id=>new mongoose.Types.ObjectId(String(id)));
 const rows=await Action.aggregate([{$match:{$or:[{fromTeam:{$in:keys}},{toTeam:{$in:keys}}]}},{$project:{deltas:[{team:'$fromTeam',amount:-1},{team:'$toTeam',amount:1}]}},{$unwind:'$deltas'},{$match:{'deltas.team':{$in:keys}}},{$group:{_id:'$deltas.team',count:{$sum:'$deltas.amount'}}}]);
 return new Map(rows.map(r=>[String(r._id),Math.max(0,r.count)]));
}
export async function recordFavorite(input){
 const fields=favoriteFields(input);
 const existing=await Action.findById(fields._id);
 if(!existing){
  if(!await Team.exists({_id:fields.actionTeam,...(fields.toTeam?{isActive:true}:{})})||fields.fromTeam&&!await Team.exists({_id:fields.fromTeam}))fail(404,'נבחרת לא נמצאה');
  try{await Action.create(fields)}catch(e){if(e.code!==11000)throw e;}
 }
 const saved=existing||await Action.findById(fields._id);
 for(const key of ['fromTeam','toTeam','actionTeam'])if(String(saved[key]??'')!==String(fields[key]??''))fail(409,'מזהה הפעולה כבר בשימוש');
 const ids=[...new Set([fields.fromTeam,fields.toTeam,fields.actionTeam].filter(Boolean))];
 const counts=await fanCounts(ids);
 return Object.fromEntries(ids.map(id=>[id,counts.get(id)||0]));
}
// Short-lived in-memory abuse guard; does not persist IPs or associate them with actions.
const limits=new Map();
export function favoriteRateLimit(req,res,next){
 const now=Date.now();if(limits.size>=10000){for(const [key,value] of limits)if(value.until<=now)limits.delete(key);if(limits.size>=10000)return res.status(429).json({message:'נסו שוב בעוד דקה'});}
 const key=req.ip||'unknown';let entry=limits.get(key);if(!entry||entry.until<=now){entry={until:now+60000,count:0};limits.set(key,entry);}
 if(++entry.count>120)return res.status(429).json({message:'נסו שוב בעוד דקה'});next();
}
