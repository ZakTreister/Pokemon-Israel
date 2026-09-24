import mongoose from 'mongoose';

const teamSeasonRosterSchema = new mongoose.Schema({
  season: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Season',
    required: true,
  },
  team: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
  },
  teamNameSnapshot: {
    type: String,
    required: true,
  },
  players: [
    {
      player: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true,
      },
      firstNameSnapshot: {
        type: String,
        required: true,
      },
      lastNameSnapshot: {
        type: String,
        required: true,
      },
    },
  ],
}, {
  timestamps: true,
});

teamSeasonRosterSchema.index(
  { season: 1, team: 1 },
  { unique: true }
);

teamSeasonRosterSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const TeamSeasonRoster = mongoose.model('TeamSeasonRoster', teamSeasonRosterSchema);
export default TeamSeasonRoster;
