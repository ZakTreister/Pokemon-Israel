import mongoose from 'mongoose';

// One historic aggregate per person, not synthetic tournaments or fabricated results.
// The spreadsheet does not include city or an identity number. Linking to a canonical
// Player/User is therefore optional and must be reviewed rather than name-guessed.
const historicalRankingSchema = new mongoose.Schema(
  {
    source: { type: String, required: true },
    normalizedName: { type: String, required: true },
    playerName: { type: String, required: true },
    points: { type: Number, required: true, min: 0 },
    tournaments: { type: Number, required: true, min: 0 },
    isAllStars: { type: Boolean, default: false },
    sourceRow: { type: Number, required: true, min: 1 },
    sourceRank: { type: Number, min: 1 },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
    legacyUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

historicalRankingSchema.index({ source: 1, normalizedName: 1 }, { unique: true });

export default mongoose.model('HistoricalRanking', historicalRankingSchema);