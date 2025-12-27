import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Room from '@/lib/models/Room';

export async function GET(request, { params }) {
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

    // Check if current user is the host
    const isHost = room.hostId.toString() === decoded.userId;

    return NextResponse.json({
      room: {
        _id: room._id,
        title: room.title,
        hostId: room.hostId,
        participantCount: room.participantCount || 1,
        expiresAt: room.expiresAt,
        createdAt: room.createdAt
      },
      isHost
    });

  } catch (error) {
    console.error('Get room error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
