import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Room from '@/lib/models/Room';
import Message from '@/lib/models/Message';

export async function DELETE(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // AWAIT params before accessing properties
    const { id } = await params;
    
    await connectDB();
    
    const room = await Room.findById(id);
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }
    
    // Only host can delete
    if (room.hostId.toString() !== decoded.userId) {
      return NextResponse.json({ error: 'Only the host can delete this room' }, { status: 403 });
    }

    // Delete the room
    await Room.findByIdAndDelete(id);
    
    // Also delete all messages in the room
    await Message.deleteMany({ roomId: id });

    console.log(`✅ Room ${id} deleted by host ${decoded.userId}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Room deleted successfully' 
    });

  } catch (error) {
    console.error('Delete room error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete room: ' + error.message 
    }, { status: 500 });
  }
}
