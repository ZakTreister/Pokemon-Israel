import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    minlength: [1, 'Team name must be at least 1 character long'],
    maxlength: [100, 'Team name cannot exceed 100 characters'],
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

teamSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const normalizeTeamName = (value) => {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

teamSchema.pre('validate', function(next) {
  if (this.name) {
    this.normalizedName = normalizeTeamName(this.name);
  }
  next();
});

const Team = mongoose.model('Team', teamSchema);
export default Team;
