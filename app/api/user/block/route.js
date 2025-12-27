import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { userIdToBlock, handleToBlock } = await request.json();
    
    await connectDB();
    
    // Don't allow blocking yourself
    if (decoded.userId === userIdToBlock) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }
    
    // Add to blocked users list (using $addToSet to avoid duplicates)
    await User.findByIdAndUpdate(decoded.userId, {
      $addToSet: { blockedUsers: userIdToBlock }
    });

    console.log(`🚫 User ${decoded.userId} blocked user ${userIdToBlock} (@${handleToBlock})`);

    return NextResponse.json({
      success: true,
      message: `Blocked @${handleToBlock}`
    });

  } catch (error) {
    console.error('Block user error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
