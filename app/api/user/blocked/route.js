import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function GET(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    await connectDB();
    
    const user = await User.findById(decoded.userId)
      .populate('blockedUsers', 'handle');
    
    return NextResponse.json({
      blockedUsers: user?.blockedUsers || []
    });

  } catch (error) {
    console.error('Get blocked users error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
