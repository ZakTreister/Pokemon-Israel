import { validateBirthDate, profileFields } from '../services/playerProfile.js';
import {
  mediaSchema,
  publicMediaUrl,
} from '../services/storage/mediaMetadata.js';
import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      minlength: [1, 'First name must be at least 1 character long'],
      maxlength: [50, 'First name cannot exceed 50 characters'],
    },
    lastName: {
      type: String,
      // An approved legacy ranking row may genuinely lack a surname.
      // Manual player creation still requires one.
      required() { return !this.historicalImportSource; },
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters'],
      default: '',
    },
    photoMedia: { type: mediaSchema, default: null },
    description: { type: String, trim: true, maxlength: 500, default: '' },
    dateOfBirth: {
      type: String,
      default: '',
      validate: {
        validator(value) {
          try {
            validateBirthDate(value || '');
            return true;
          } catch {
            return false;
          }
        },
        message: 'תאריך לידה לא תקין או עתידי',
      },
    },
    playerNumber: { type: String, trim: true, default: '' },
    // A historical import can create a player before city is known.
    historicalImportSource: { type: String, default: null },
    historicalNormalizedName: { type: String, default: null },
    // A year-only value is not an invented date of birth.
    birthYear: { type: Number, default: null, min: 1900, max: new Date().getFullYear() },
    city: { type: String, trim: true, maxlength: 100, default: '' },
    // An optional-city club QR intake can create an incomplete canonical profile.
    registrationSource: { type: String, enum: ['qr-club'], default: null },
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
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      default: null,
    },
    // Trial memberships remain explicit until an administrator approves or
    // dismisses them. Legacy records are permanent by default.
    teamMembershipStatus: {
      type: String,
      enum: ['permanent', 'trial', 'dismissed'],
      default: 'permanent',
    },
    // Normalized fields for likely-duplicate detection.
    // Case-insensitive, whitespace-collapsed identity matching.
    normalizedFirstName: {
      type: String,
    },
    normalizedLastName: {
      type: String,
    },
    normalizedCity: { type: String },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    joinedAt: { type: String, default: '' },
    deckMedia: { type: mediaSchema, default: null },
    pokemon: { type: [String], default: [] },
  },
  {
    timestamps: true,
  },
);

playerSchema.index(
  { historicalImportSource: 1, historicalNormalizedName: 1 },
  { unique: true, partialFilterExpression: { historicalNormalizedName: { $type: 'string' } } },
);

playerSchema.index({
  normalizedFirstName: 1,
  normalizedLastName: 1,
  normalizedCity: 1,
  playerType: 1,
});

// One-to-one: a Player can be linked to at most one User.
// Only applies when user is non-null; null links are unconstrained.
playerSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: { user: { $type: 'objectId' } },
  },
);

playerSchema.set('toJSON', {
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret.historicalNormalizedName;
    if (doc.playerType === 'team') {
      ret.photoUrl = publicMediaUrl(doc.photoMedia);
      ret.deckUrl = publicMediaUrl(doc.deckMedia);
    } else if (doc.playerType === 'quarterly') {
      delete ret.photoMedia;
      delete ret.photoUrl;
      delete ret.deckMedia;
      delete ret.joinedAt;
      delete ret.pokemon;
      delete ret.description;
      delete ret.dateOfBirth;
    }
    delete ret.club;
    delete ret._id;
    delete ret.__v;
    delete ret.normalizedFirstName;
    delete ret.normalizedLastName;
    delete ret.normalizedCity;
    return ret;
  },
});

// Helper: normalize a string for identity matching
export const normalizeField = (value) => {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

// Archive filtering preserves raw records and historical populated references.
for (const operation of [
  'find',
  'findOne',
  'countDocuments',
  'findOneAndUpdate',
]) {
  playerSchema.pre(operation, function () {
    if (!this.getOptions().includeDeleted) this.where({ deletedAt: null });
  });
}
playerSchema.pre('validate', function (next) {
  this.normalizedFirstName = normalizeField(this.firstName);
  this.normalizedLastName = normalizeField(this.lastName);
  this.normalizedCity = normalizeField(this.city);
  if (this.playerType === 'quarterly' && !this.city?.trim() && !this.historicalImportSource && this.registrationSource !== 'qr-club')
    this.invalidate('city', 'עיר היא שדה חובה');
  try {
    Object.assign(this, profileFields(this));
  } catch (e) {
    this.invalidate('pokemon', e.message);
  }
  next();
});

const Player = mongoose.model('Player', playerSchema);
export default Player;
