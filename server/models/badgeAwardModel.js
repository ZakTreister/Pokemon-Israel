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
  { player: 1, badge: 1 },
  { unique: true }
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
