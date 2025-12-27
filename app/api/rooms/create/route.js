import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Room from '@/lib/models/Room';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { title, latitude, longitude } = await request.json();

    if (!title || !latitude || !longitude) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectDB();

    // Room expires in 2 hours
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    const room = await Room.create({
      title,
      hostId: decoded.userId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude]
      },
      participantCount: 1,
      expiresAt
    });

    console.log(`✅ Room created: ${room._id} by user ${decoded.userId}`);
    console.log(`⏰ Room will expire at: ${expiresAt}`);

    return NextResponse.json({
      success: true,
      room: {
        _id: room._id,
        title: room.title,
        expiresAt: room.expiresAt
      }
    });

  } catch (error) {
    console.error('Create room error:', error);
    return NextResponse.json({ error: 'Failed to create room' }, { status: 500 });
  }
}
