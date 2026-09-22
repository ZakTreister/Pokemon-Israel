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
  // Tournament type — optional for backward compatibility with existing data
  type: {
    type: String,
    enum: ['team_internal', 'inter_team', 'quarterly'],
    default: null,
  },
  // Optional reference to the season this tournament belongs to
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    default: null,
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
    playerName: {
      type: String,
      required: true, // Store the player's display name
    },
    position: Number,
    points: Number, // Tournament ranking points (4, 3, 2, 1)
    rawPoints: Number, // Raw points from games (for calculating wins/draws/losses)
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

// Transform _id to id and remove __v when converting to JSON
tournamentSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Tournament = mongoose.model('Tournament', tournamentSchema);
export default Tournament;