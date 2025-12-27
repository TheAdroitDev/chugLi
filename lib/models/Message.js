import mongoose from 'mongoose';

const MessageSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Use string ID from client
  roomId: { type: String, required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  handle: { type: String, required: true },
  content: { type: String, required: true },
  reactions: [{
    emoji: String,
    userId: String
  }],
  expiresAt: { type: Date, required: true }, // Removed "index: true" from here
  createdAt: { type: Date, default: Date.now }
});

// Single index with TTL for auto-deletion
MessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Additional indexes for queries
MessageSchema.index({ roomId: 1, createdAt: 1 }); // For fetching room messages in order

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
