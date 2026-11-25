import express from 'express';
import asyncHandler from 'express-async-handler';
import ContentPage from '../models/contentPageModel.js';
import Event from '../models/eventModel.js';
import {protect,admin} from '../middleware/authMiddleware.js';
import {fail} from '../utils/httpError.js';
import {contentPageFields} from '../services/contentFields.js';
import {attachAsset,removeAsset,changeAssetVisibility} from '../services/assetAttachment.js';
const router=express.Router();
async function find(id){
 if(!/^[a-f0-9]{24}$/i.test(id))fail(404,'עמוד התוכן לא נמצא');
 const page=await ContentPage.findById(id);
 if(!page)fail(404,'עמוד התוכן לא נמצא');
 return page;
}
router.get('/navigation',asyncHandler(async(_req,res)=>{
 const pages=await ContentPage.find({status:'published',showInNavigation:true}).select('navigationLabel').sort({createdAt:1,_id:1});
 res.json(pages.map(page=>({id:page.id,label:page.navigationLabel})));
}));
router.get('/management',protect,admin,asyncHandler(async(_req,res)=>res.json(await ContentPage.find({}).sort({updatedAt:-1}))));
router.get('/management/:id',protect,admin,asyncHandler(async(req,res)=>res.json(await find(req.params.id))));
router.get('/:id',asyncHandler(async(req,res)=>{
 const page=await find(req.params.id);
 if(page.status!=='published')fail(404,'עמוד התוכן לא נמצא');
 res.json(page);
}));
router.post('/',protect,admin,asyncHandler(async(req,res)=>res.status(201).json(await ContentPage.create(contentPageFields(req.body)))));
router.put('/:id',protect,admin,asyncHandler(async(req,res)=>{
 const page=await find(req.params.id);Object.assign(page,contentPageFields(req.body,page));await page.save();res.json(page);
}));
router.delete('/:id',protect,admin,asyncHandler(async(req,res)=>{
 const page=await find(req.params.id);
 if(await Event.exists({contentPageIds:page._id}))fail(409,'יש להסיר את שיוך העמוד מהאירועים לפני מחיקה');
 await page.deleteOne();res.json({message:'עמוד התוכן נמחק'});
}));
router.post('/:id/media',protect,admin,asyncHandler(async(req,res)=>res.status(201).json(await attachAsset(req,await find(req.params.id),'content-page-media'))));
router.put('/:id/media/:assetId',protect,admin,asyncHandler(async(req,res)=>res.json(await changeAssetVisibility(await find(req.params.id),req.params.assetId,req.body.showInGallery))));
router.delete('/:id/media/:assetId',protect,admin,asyncHandler(async(req,res)=>res.json(await removeAsset(await find(req.params.id),req.params.assetId))));
export default router;
