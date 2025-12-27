import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

// Generate random handles
function generateHandles() {
  const adjectives = ['Swift', 'Cool', 'Mystic', 'Brave', 'Silent', 'Bright'];
  const nouns = ['Tiger', 'Eagle', 'Wolf', 'Phoenix', 'Dragon', 'Falcon'];
  const handles = [];
  
  for (let i = 0; i < 6; i++) {
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 999);
    handles.push(`${adj}${noun}${num}`);
  }
  
  return handles;
}

export async function GET() {
  return NextResponse.json({ handles: generateHandles() });
}

export async function POST(request) {
  try {
    const { userId, handle } = await request.json();

    await connectDB();

    // Check if handle is taken
    const existing = await User.findOne({ handle });
    if (existing) {
      return NextResponse.json(
        { error: 'Handle already taken' },
        { status: 400 }
      );
    }

    // Update user with handle
    await User.findByIdAndUpdate(userId, { handle });

    return NextResponse.json({
      success: true,
      handle,
      message: 'Handle set successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' },
      { status: 500 }
    );
  }
}
