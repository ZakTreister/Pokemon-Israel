import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
 listEvents,manageEvents,getEvent,getManagedEvent,createEvent,changeEvent,removeEvent,
 linkTournament,unlinkTournament,changeFixtures
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
router.put('/:id/fixtures',protect,admin,changeFixtures);
export default router;
