import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/lib/models/Room';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const longitude = parseFloat(searchParams.get('lng'));
    const latitude = parseFloat(searchParams.get('lat'));

    await connectDB();

    // Find rooms within 5km
    const rooms = await Room.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude]
          },
          $maxDistance: 5000 // 5km in meters
        }
      },
      expiresAt: { $gt: new Date() }
    });

    return NextResponse.json({ rooms });

  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
