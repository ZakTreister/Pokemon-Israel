import mongoose from 'mongoose';

const standingSchema = new mongoose.Schema({
  player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  playerName: { type: String, required: true },
  position: { type: Number, required: true },
  points: { type: Number, required: true, min: 0 },
  omp: { type: Number, default: null }, gwp: { type: Number, default: null }, ogp: { type: Number, default: null },
  matchesPlayed: Number, wins: Number, draws: Number, losses: Number, byes: Number,
  gameWins: Number, gameDraws: Number, gamesPlayed: Number,
}, { _id: false });
const matchSchema = new mongoose.Schema({
  table: Number,
  player1: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
  player2: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
  result: {
    type: new mongoose.Schema({
      winner: { type: String, enum: ['player1', 'player2', 'draw', 'bye'], required: true },
      score1: Number, score2: Number, drawnGames: { type: Number, default: 0 },
      enteredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, enteredAt: Date,
    }, { _id: false }),
    default: null,
  },
});
const roundSchema = new mongoose.Schema({ number: Number, createdAt: Date, createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, matches: [matchSchema] });

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
  // Isolated Player-based engine; legacy User-based participants/results remain intact.
  engineVersion: { type: String, default: null },
  scoringPolicy: String,
  team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamNameSnapshot: String, teamLogoSnapshot: String,
  competitionYear: { type: String, default: null },
  phase: { type: String, enum: ['setup', 'running', 'completed'], default: null },
  source: { type: String, enum: ['live', 'historical'], default: null },
  revision: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, closedAt: Date,
  playerParticipants: [{
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    nameSnapshot: { type: String, required: true }, citySnapshot: String,
  }],
  rounds: [roundSchema],
  finalStandings: [standingSchema],
  invalidatedRounds: [{ invalidatedAt: Date, invalidatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, reason: String, rounds: [roundSchema] }],
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

tournamentSchema.index({ engineVersion: 1, team: 1, status: 1, competitionYear: 1 });
tournamentSchema.index({ team: 1 }, {
  name: 'one_open_internal_per_team',
  unique: true,
  partialFilterExpression: {
    engineVersion: 'swiss-v1', type: 'team_internal', source: 'live',
    status: 'upcoming', phase: { $in: ['setup', 'running', null] },
  },
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
