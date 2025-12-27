import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: true, 
    unique: true,
    lowercase: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true,
    minlength: 6
  },
  handle: { 
    type: String, 
    required: false, // Changed from true to false
    unique: true,
    sparse: true // Allows multiple null/undefined values
  },
  blockedUsers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Prevent model recompilation in development
export default mongoose.models.User || mongoose.model('User', UserSchema);
