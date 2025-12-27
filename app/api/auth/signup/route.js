import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/lib/models/User';

export async function POST(request) {
  try {
    const { email, password, confirmPassword } = await request.json();

    // Validation
    if (!email || !password || !confirmPassword) {
      return NextResponse.json(
        { error: 'All fields required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check existing user
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user without handle (will be set later)
    const user = await User.create({
      email,
      password: hashedPassword,
      handle: `user${Date.now()}` // Temporary unique handle instead of empty string
    });

    return NextResponse.json({
      success: true,
      userId: user._id,
      message: 'Account created successfully'
    });

  } catch (error) {
    console.error('Signup error:', error); // ADD THIS LINE
    return NextResponse.json(
      { error: 'Server error: ' + error.message }, // ADD ERROR MESSAGE
      { status: 500 }
    );
  }
}
