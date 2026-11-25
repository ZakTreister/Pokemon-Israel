import express from 'express';
import asyncHandler from 'express-async-handler';
import Event from '../models/eventModel.js';
import Update from '../models/updateModel.js';
import ContentPage from '../models/contentPageModel.js';
const router=express.Router();
router.get('/',asyncHandler(async(_req,res)=>{
 const [events,pages]=await Promise.all([Event.find({status:'published'}),ContentPage.find({status:'published',showInFieldNews:true})]);
 const updates=await Update.find({showInFieldNews:{$ne:false},$or:[{eventId:null},{eventId:{$in:events.map(e=>e._id)}}]});
 const items=[...updates.map(u=>({...u.toJSON(),kind:'update',href:'/news/'+u.id,eventIds:u.eventId?[String(u.eventId)]:[]})),...events.filter(e=>e.showInFieldNews).map(e=>({id:e.id,kind:'event',href:'/events/'+e.id,title:e.title,description:e.description,content:e.description,date:e.updatedAt||e.createdAt,image:e.toJSON().coverUrl,mediaItems:e.toJSON().mediaItems,eventIds:[e.id]})),...pages.map(p=>({id:p.id,kind:'content',href:'/content/'+p.id,title:p.title,description:p.subtitle,content:p.subtitle,date:p.updatedAt||p.createdAt,mediaItems:p.toJSON().mediaItems,eventIds:events.filter(e=>(e.contentPageIds||[]).some(id=>String(id)===p.id)).map(e=>e.id)}))];
 res.json(items.sort((a,b)=>new Date(b.date)-new Date(a.date)));
}));
export default router;
