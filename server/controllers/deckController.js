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

  // Validate required fields
  if (!archetype) {
    res.status(400);
    throw new Error('Archetype is required');
  }

  // Check if deck with same archetype already exists
  const existingDeck = await Deck.findOne({ archetype });
  if (existingDeck) {
    res.status(400);
    throw new Error('Deck with this archetype already exists');
  }

  try {
    const deck = await Deck.create({
      archetype,
      image: image || 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg',
    });

    console.log('Deck created successfully:', deck);
    res.status(201).json(deck);
  } catch (error) {
    console.error('Error creating deck:', error);
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      res.status(400);
      throw new Error(messages.join(', '));
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      res.status(400);
      throw new Error(`${field} already exists`);
    }
    
    throw error;
  }
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