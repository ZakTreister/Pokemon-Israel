import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
 listEvents,manageEvents,getEvent,getManagedEvent,createEvent,changeEvent,removeEvent,
 linkTournament,unlinkTournament,addEventAsset,deleteEventAsset,changeEventAsset
} from '../controllers/eventController.js';
const router=express.Router();
router.get('/',listEvents);
router.get('/management',protect,admin,manageEvents);
router.get('/management/:id',protect,admin,getManagedEvent);
router.get('/:id',getEvent);
router.post('/',protect,admin,createEvent);
router.put('/:id',protect,admin,changeEvent);
router.delete('/:id',protect,admin,removeEvent);
router.put('/:id/tournaments/:tournamentId',protect,admin,linkTournament);
router.delete('/:id/tournaments/:tournamentId',protect,admin,unlinkTournament);
// Legacy fixture writes are disabled; new meetings are real Tournament records.
router.post('/:id/fixtures',protect,admin,(_req,res)=>res.status(410).json({message:'יש ליצור טורניר נבחרות מתוך האירוע'}));
router.put('/:id/fixtures',protect,admin,(_req,res)=>res.status(410).json({message:'יש ליצור טורניר נבחרות מתוך האירוע'}));
router.post('/:id/media',protect,admin,addEventAsset);
router.put('/:id/media/:assetId',protect,admin,changeEventAsset);
router.delete('/:id/media/:assetId',protect,admin,deleteEventAsset);
export default router;
