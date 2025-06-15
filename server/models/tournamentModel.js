import mongoose from 'mongoose';

const tournamentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  maxParticipants: {
    type: Number,
    required: true,
  },
  currentParticipants: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed'],
    default: 'upcoming',
  },
  registrationDeadline: {
    type: Date,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  // New fields for recurring tournaments
  seriesId: {
    type: String,
    default: null, // Will be set for recurring tournaments
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  }],
  results: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    position: Number,
    points: Number,
    omp: Number,
    gwp: Number,
    ogp: Number,
    deck: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Deck',
    },
  }],
}, {
  timestamps: true,
});

const Tournament = mongoose.model('Tournament', tournamentSchema);
export default Tournament;