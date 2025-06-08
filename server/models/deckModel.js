import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema({
  archetype: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

const Deck = mongoose.model('Deck', deckSchema);
export default Deck;