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

// Transform _id to id and remove __v when converting to JSON
deckSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Deck = mongoose.model('Deck', deckSchema);
export default Deck;