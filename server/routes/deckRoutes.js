import express from 'express';
import { protect, admin } from '../middleware/authMiddleware.js';
import {
  getDecks,
  createDeck,
  updateDeck,
  deleteDeck,
} from '../controllers/deckController.js';

const router = express.Router();

router.route('/')
  .get(getDecks)
  .post(protect, admin, createDeck);

router.route('/:id')
  .put(protect, admin, updateDeck)
  .delete(protect, admin, deleteDeck);

export default router;