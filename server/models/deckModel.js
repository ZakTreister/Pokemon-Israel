import mongoose from 'mongoose';

const deckSchema = new mongoose.Schema({
  archetype: {
    type: String,
    required: [true, 'Archetype is required'],
    trim: true,
    unique: true,
    minlength: [1, 'Archetype must be at least 1 character long'],
    maxlength: [100, 'Archetype cannot exceed 100 characters']
  },
  image: {
    type: String,
    required: [true, 'Image is required'],
    default: 'https://images.pexels.com/photos/163064/play-stone-network-networked-interactive-163064.jpeg'
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

// Add index for better performance and ensure uniqueness
deckSchema.index({ archetype: 1 }, { unique: true });

const Deck = mongoose.model('Deck', deckSchema);
export default Deck;