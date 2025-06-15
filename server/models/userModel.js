import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    sparse: true, // Allows multiple null values but enforces uniqueness for non-null values
    trim: true,
    lowercase: true,
    validate: {
      validator: function(v) {
        // Only validate email format if email is provided
        return !v || /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(v);
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    validate: {
      validator: function(v) {
        return /^[0-9]{9,15}$/.test(v);
      },
      message: 'Phone number must be between 9-15 digits'
    }
  },
  role: {
    type: String,
    enum: ['player', 'admin'],
    default: 'player',
  },
}, {
  timestamps: true,
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Transform _id to id and remove __v when converting to JSON
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password; // Never send password in JSON response
    return ret;
  }
});

// Add index for better performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);
export default User;