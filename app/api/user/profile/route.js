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
      .select('-password') // Exclude password
      .populate('blockedUsers', 'handle'); // Populate blocked users with their handles
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        _id: user._id,
        handle: user.handle,
        email: user.email,
        blockedUsers: user.blockedUsers || [],
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// Update user profile
export async function PATCH(request) {
  try {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { handle } = await request.json();
    
    await connectDB();
    
    // Check if new handle is taken
    if (handle) {
      const existing = await User.findOne({ handle, _id: { $ne: decoded.userId } });
      if (existing) {
        return NextResponse.json({ error: 'Handle already taken' }, { status: 400 });
      }
    }
    
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      { handle },
      { new: true }
    ).select('-password');

    return NextResponse.json({
      success: true,
      user: {
        handle: user.handle,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
