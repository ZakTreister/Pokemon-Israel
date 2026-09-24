import mongoose from 'mongoose';

const badgeDefinitionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Badge name is required'],
    trim: true,
    minlength: [1, 'Badge name must be at least 1 character long'],
    maxlength: [100, 'Badge name cannot exceed 100 characters'],
  },
  normalizedName: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  icon: {
    type: String,
    trim: true,
    maxlength: [50, 'Icon cannot exceed 50 characters'],
    default: '',
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

badgeDefinitionSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const normalizeBadgeName = (value) => {
  if (!value) return '';
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
};

badgeDefinitionSchema.pre('validate', function(next) {
  if (this.name) {
    this.normalizedName = normalizeBadgeName(this.name);
  }
  next();
});

const BadgeDefinition = mongoose.model('BadgeDefinition', badgeDefinitionSchema);
export default BadgeDefinition;
