import asyncHandler from 'express-async-handler';
import Deck from '../models/deckModel.js';

// @desc    Get all decks
// @route   GET /api/decks
// @access  Public
export const getDecks = asyncHandler(async (req, res) => {
  const decks = await Deck.find({});
  res.json(decks);
});

// @desc    Create a deck
// @route   POST /api/decks
// @access  Private/Admin
export const createDeck = asyncHandler(async (req, res) => {
  const { archetype, image } = req.body;

  const deck = await Deck.create({
    archetype,
    image,
  });

  res.status(201).json(deck);
});

// @desc    Update a deck
// @route   PUT /api/decks/:id
// @access  Private/Admin
export const updateDeck = asyncHandler(async (req, res) => {
  const deck = await Deck.findById(req.params.id);

  if (deck) {
    deck.archetype = req.body.archetype || deck.archetype;
    deck.image = req.body.image || deck.image;

    const updatedDeck = await deck.save();
    res.json(updatedDeck);
  } else {
    res.status(404);
    throw new Error('Deck not found');
  }
});

// @desc    Delete a deck
// @route   DELETE /api/decks/:id
// @access  Private/Admin
export const deleteDeck = asyncHandler(async (req, res) => {
  const deck = await Deck.findById(req.params.id);

  if (deck) {
    await deck.deleteOne();
    res.json({ message: 'Deck removed' });
  } else {
    res.status(404);
    throw new Error('Deck not found');
  }
});