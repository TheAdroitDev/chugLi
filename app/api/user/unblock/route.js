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
    const { userId } = await request.json();
    
    await connectDB();
    
    await User.findByIdAndUpdate(decoded.userId, {
      $pull: { blockedUsers: userId }
    });

    return NextResponse.json({
      success: true,
      message: 'User unblocked'
    });

  } catch (error) {
    console.error('Unblock user error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
