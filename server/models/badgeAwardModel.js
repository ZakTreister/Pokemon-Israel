import mongoose from 'mongoose';

const badgeAwardSchema = new mongoose.Schema({
  player: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Player',
    required: true,
  },
  badge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BadgeDefinition',
    required: true,
  },
  season: { type: mongoose.Schema.Types.ObjectId, ref: 'Season', default: null },
  revokedAt: { type: Date, default: null },
  revokedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  awardedAt: {
    type: Date,
    default: Date.now,
  },
  awardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

badgeAwardSchema.index(
  { player: 1, badge: 1, season: 1 },
  { name: 'one_current_badge_per_player_season', unique: true, partialFilterExpression: { season: { $type: 'objectId' }, revokedAt: null } }
);

badgeAwardSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const BadgeAward = mongoose.model('BadgeAward', badgeAwardSchema);
export default BadgeAward;
