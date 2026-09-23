import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    minlength: [1, 'First name must be at least 1 character long'],
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    minlength: [1, 'Last name must be at least 1 character long'],
    maxlength: [50, 'Last name cannot exceed 50 characters'],
  },
  club: {
    type: String,
    trim: true,
    maxlength: [100, 'Club cannot exceed 100 characters'],
    default: null,
  },
  playerType: {
    type: String,
    enum: ['team', 'quarterly'],
    required: [true, 'Player type is required'],
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Normalized fields for duplicate detection on quarterly players.
  // Case-insensitive, whitespace-collapsed identity matching.
  normalizedFirstName: {
    type: String,
  },
  normalizedLastName: {
    type: String,
  },
  normalizedClub: {
    type: String,
  },
}, {
  timestamps: true,
});

// Compound unique index for quarterly players only.
// Team players are excluded from this constraint since their identity
// is tied to a User account, not first+last+club.
playerSchema.index(
  { normalizedFirstName: 1, normalizedLastName: 1, normalizedClub: 1 },
  {
    unique: true,
    partialFilterExpression: { playerType: 'quarterly' },
  }
);

playerSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.normalizedFirstName;
    delete ret.normalizedLastName;
    delete ret.normalizedClub;
    return ret;
  },
});

// Helper: normalize a string for identity matching
export const normalizeField = (value) => {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

// Pre-validate hook: set normalized fields for quarterly players
playerSchema.pre('validate', function(next) {
  if (this.playerType === 'quarterly') {
    this.normalizedFirstName = normalizeField(this.firstName);
    this.normalizedLastName = normalizeField(this.lastName);
    this.normalizedClub = normalizeField(this.club) || '';
  } else {
    // Team players don't participate in quarterly uniqueness
    this.normalizedFirstName = undefined;
    this.normalizedLastName = undefined;
    this.normalizedClub = undefined;
  }
  next();
});

const Player = mongoose.model('Player', playerSchema);
export default Player;
