import express from 'express';
import asyncHandler from 'express-async-handler';
import Gallery,{galleryId,galleryDefaults} from '../models/galleryModel.js';
import Event from '../models/eventModel.js';
import Update from '../models/updateModel.js';
import ContentPage from '../models/contentPageModel.js';
import {protect,admin} from '../middleware/authMiddleware.js';
import {fail} from '../utils/httpError.js';
import {attachAsset,removeAsset} from '../services/assetAttachment.js';
const router=express.Router();
const managed=()=>Gallery.findOneAndUpdate({_id:galleryId},{$setOnInsert:galleryDefaults},{upsert:true,new:true,setDefaultsOnInsert:true});
const selected=docs=>docs.flatMap(doc=>doc.toJSON().mediaItems.filter(a=>a.showInGallery&&a.url));
router.get('/',asyncHandler(async(_req,res)=>{
 const [gallery,events,pages]=await Promise.all([Gallery.findById(galleryId),Event.find({status:'published'}).sort({updatedAt:-1}),ContentPage.find({status:'published'}).sort({updatedAt:-1})]);
 const updates=await Update.find({$or:[{eventId:null},{eventId:{$in:events.map(e=>e._id)}}]}).sort({date:-1});
 const primary=updates.filter(u=>u.imageInGallery).map(u=>({id:'update-image:'+u.id,kind:'image',url:u.toJSON().image,caption:u.title,showInGallery:true})).filter(a=>a.url);
 const data=gallery?.toJSON()||{id:galleryId,...galleryDefaults,mediaItems:[]};
 const items=[...data.mediaItems,...selected(events),...selected(pages),...selected(updates),...primary];
 const seen=new Set();res.json({...data,mediaItems:items.filter(item=>item.url&&!seen.has(item.url)&&seen.add(item.url))});
}));
router.get('/management',protect,admin,asyncHandler(async(_req,res)=>res.json(await managed())));
router.put('/management',protect,admin,asyncHandler(async(req,res)=>{
 const {title,subtitle}=req.body;
 if(typeof title!=='string'||!title.trim()||title.length>180||typeof subtitle!=='string'||subtitle.length>5000)fail(400,'כותרת או כותרת משנה לא תקינות');
 const gallery=await managed();gallery.title=title.trim();gallery.subtitle=subtitle.trim();await gallery.save();res.json(gallery);
}));
router.post('/:id/media',protect,admin,asyncHandler(async(req,res)=>{if(req.params.id!==galleryId)fail(404,'גלריה לא נמצאה');res.status(201).json(await attachAsset(req,await managed(),'gallery-media'));}));
router.delete('/:id/media/:assetId',protect,admin,asyncHandler(async(req,res)=>{if(req.params.id!==galleryId)fail(404,'גלריה לא נמצאה');res.json(await removeAsset(await managed(),req.params.assetId));}));
export default router;
