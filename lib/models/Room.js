import mongoose from 'mongoose';

const RoomSchema = new mongoose.Schema({
  title: { type: String, required: true },
  hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  participantCount: { type: Number, default: 1 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now }
});

// Geospatial index for finding nearby rooms
RoomSchema.index({ location: '2dsphere' });

// TTL index - MongoDB will automatically delete expired rooms
RoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.Room || mongoose.model('Room', RoomSchema);
