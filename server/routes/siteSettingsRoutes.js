import express from 'express';
import asyncHandler from 'express-async-handler';
import {protect,admin} from '../middleware/authMiddleware.js';
import {getNavigationSettings,saveSiteSettings,publicSiteSettings} from '../services/siteSettings.js';
const router=express.Router();
router.get('/',asyncHandler(async(_req,res)=>res.set('Cache-Control','no-store').json(publicSiteSettings(await getNavigationSettings()))));
router.get('/management',protect,admin,asyncHandler(async(_req,res)=>res.set('Cache-Control','no-store').json(await getNavigationSettings(true))));
router.put('/management',protect,admin,asyncHandler(async(req,res)=>res.json(await saveSiteSettings(req))));
export default router;
