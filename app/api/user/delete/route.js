import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';
import Room from '@/lib/models/Room';
import Message from '@/lib/models/Message';

export async function DELETE(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    await connectDB();
    
    console.log(`🗑️ Deleting account for user: ${decoded.userId}`);
    
    // Delete all rooms created by user
    const deletedRooms = await Room.deleteMany({ hostId: decoded.userId });
    console.log(`Deleted ${deletedRooms.deletedCount} rooms`);
    
    // Delete all messages by user
    const deletedMessages = await Message.deleteMany({ userId: decoded.userId });
    console.log(`Deleted ${deletedMessages.deletedCount} messages`);
    
    // Delete user account
    await User.findByIdAndDelete(decoded.userId);
    console.log(`✅ User account deleted: ${decoded.userId}`);

    return NextResponse.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete account: ' + error.message 
    }, { status: 500 });
  }
}
