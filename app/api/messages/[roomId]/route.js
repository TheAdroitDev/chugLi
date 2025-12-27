import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Message from '@/lib/models/Message';
import User from '@/lib/models/User';

// GET messages for a room
export async function GET(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { roomId } = await params;
    
    await connectDB();
    
    // Get current user's blocked users list
    const currentUser = await User.findById(decoded.userId).select('blockedUsers');
    const blockedUserIds = currentUser?.blockedUsers || [];
    
    // Get messages that haven't expired and are not from blocked users
    const messages = await Message.find({
      roomId,
      expiresAt: { $gt: new Date() },
      userId: { $nin: blockedUserIds } // Exclude blocked users' messages
    }).sort({ createdAt: 1 }).limit(100);

    return NextResponse.json({ messages });

  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST new message
export async function POST(request, { params }) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { roomId } = await params;
    const { message, handle, messageId } = await request.json();
    
    await connectDB();
    
    // Message expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newMessage = await Message.create({
      _id: messageId,
      roomId,
      userId: decoded.userId,
      handle,
      content: message,
      expiresAt
    });

    return NextResponse.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    // Duplicate key error (message already exists)
    if (error.code === 11000) {
      return NextResponse.json({ success: true, message: 'Duplicate' });
    }
    
    console.error('Save message error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
