'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function Home() {
  const router = useRouter();
  const [location, setLocation] = useState(null);
  const [accuracy, setAccuracy] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [userHandle, setUserHandle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check authentication and get handle
    const token = localStorage.getItem('token');
    const handle = localStorage.getItem('handle');

    if (!token || !handle) {
      router.push('/signin');
      return;
    }

    setUserHandle(handle);
    requestLocation();
  }, []);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setLocation({ latitude, longitude });
        setAccuracy(Math.round(accuracy));
        fetchNearbyRooms(latitude, longitude);
      },
      (error) => {
        toast.error('Location permission denied');
        setLoading(false);
      }
    );
  };

  const fetchNearbyRooms = async (lat, lng) => {
    try {
      const res = await axios.get(`/api/rooms/nearby?lat=${lat}&lng=${lng}`);
      setRooms(res.data.rooms);
    } catch (error) {
      console.error('Failed to fetch rooms');
    } finally {
      setLoading(false);
    }
  };

  const calculateTimeLeft = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m left`;
  };

  const handleDisableLocation = () => {
    setLocationEnabled(!locationEnabled);
    if (locationEnabled) {
      toast.info('Location disabled');
    } else {
      toast.success('Location enabled');
      requestLocation();
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] pb-24">
      {/* Navbar */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="p-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">ChugLi</h1>
            <p className="text-gray-600 text-sm mt-0.5">@{userHandle}</p>
          </div>
          <button
            onClick={() => router.push('/settings')}
            className="text-3xl hover:opacity-70 transition-opacity"
          >
            ⚙️
          </button>
        </div>

        {/* Location Controls */}
        <div className="px-4 pb-4 flex gap-2 text-black items-center flex-wrap">
          <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-full text-sm font-medium">
            <span>📍</span>
            <span>Precise ({accuracy || '...'}m)</span>
          </div>

          <button
            onClick={requestLocation}
            className="px-4 py-2 bg-white border border-gray-300 rounded-full flex items-center gap-2 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <span className="text-base">🔄</span> Refresh
          </button>

          <button
            onClick={handleDisableLocation}
            className={`px-4 py-2 border rounded-full flex items-center gap-2 text-sm font-medium transition-colors ${locationEnabled
                ? 'bg-white border-red-300 text-red-600 hover:bg-red-50'
                : 'bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200'
              }`}
          >
            <span className="text-base">✕</span> {locationEnabled ? 'Disable' : 'Disabled'}
          </button>
        </div>
      </div>

      {/* Rooms Section */}
      <div className="p-4">
        <h2 className="text-gray-500 text-xs font-bold tracking-wider mb-4">
          NEARBY ROOMS (5KM)
        </h2>

        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin text-6xl mb-4">🔄</div>
            <p className="text-gray-600">Finding rooms near you...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="text-7xl mb-4">🏠</div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">No rooms nearby</h3>
            <p className="text-gray-600 mb-6">Be the first to create a room<br />in your area!</p>
            <button
              onClick={() => router.push('/create-room')}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              <span className="text-xl">+</span>
              Create First Room
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {rooms.map((room) => (
              <div
                key={room._id}
                onClick={() => router.push(`/room/${room._id}`)}
                className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-100"
              >
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-800">{room.title}</h3>
                  <span className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold">
                    📍 Very near
                  </span>
                </div>

                <div className="flex justify-between text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <span className="text-base">👥</span>
                    {room.participantCount} {room.participantCount === 1 ? 'person' : 'people'}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="text-base">⏱️</span>
                    {calculateTimeLeft(room.expiresAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Room Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-[#F5F1E8] via-[#F5F1E8] to-transparent">
        <button
          onClick={() => router.push('/create-room')}
          className="w-full bg-[#4A4A4A] text-white p-4 rounded-full font-bold text-lg flex items-center justify-center gap-2 hover:bg-[#3A3A3A] transition-colors shadow-lg"
        >
          <span className="text-2xl">+</span>
          Create Room
        </button>
      </div>
    </div>
  );
}
