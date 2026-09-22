import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Season name is required'],
    trim: true,
    minlength: [2, 'Season name must be at least 2 characters long'],
    maxlength: [100, 'Season name cannot exceed 100 characters'],
  },
  status: {
    type: String,
    enum: ['active', 'closed'],
    default: 'active',
  },
  startedAt: {
    type: Date,
    default: Date.now,
  },
  closedAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

seasonSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const Season = mongoose.model('Season', seasonSchema);
export default Season;
