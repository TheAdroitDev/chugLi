'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function CreateRoom() {
  const router = useRouter();
  const [roomTitle, setRoomTitle] = useState('');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signin');
      return;
    }

    // Get user location
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      setGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        setGettingLocation(false);
      },
      (error) => {
        toast.error('Location permission required to create room');
        setGettingLocation(false);
      }
    );
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!roomTitle.trim()) {
      toast.error('Please enter a room title');
      return;
    }

    if (!location) {
      toast.error('Location not available. Please enable location.');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.post(
        '/api/rooms/create',
        {
          title: roomTitle.trim(),
          longitude: location.longitude,
          latitude: location.latitude
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      if (res.data.success) {
        toast.success(res.data.message);
        router.push(`/room/${res.data.room._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    'Campus Chat 📚',
    'Coffee Lovers ☕',
    'Local News 📰',
    'Study Group 📖',
    'Game Night 🎮',
    'Movie Discussion 🎬',
    'Food Recommendations 🍕',
    'Tech Talk 💻'
  ];

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="p-4 flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="text-2xl hover:opacity-70 transition-opacity"
          >
            ←
          </button>
          <h1 className="text-xl font-bold text-gray-800">Create Room</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 max-w-2xl mx-auto">
        {gettingLocation ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="animate-spin text-6xl mb-4">📍</div>
            <p className="text-gray-600">Getting your location...</p>
          </div>
        ) : (
          <>
            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">💡</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 mb-1">About Rooms</h3>
                  <p className="text-sm text-gray-700">
                    Rooms are visible to people within 5km of your location. 
                    They automatically expire after 2 hours.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Room Title Input */}
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Room Title
                </label>
                <input
                  type="text"
                  placeholder="e.g., Winter chill tech talk"
                  value={roomTitle}
                  onChange={(e) => setRoomTitle(e.target.value)}
                  maxLength={50}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                  required
                />
                <p className="text-xs text-gray-500 mt-2">
                  {roomTitle.length}/50 characters
                </p>
              </div>

              {/* Suggestions */}
              <div>
                <h3 className="text-sm font-bold text-gray-700 mb-3">
                  💭 Suggestions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {suggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setRoomTitle(suggestion)}
                      className="bg-white border border-gray-200 p-3 rounded-xl text-sm font-medium text-gray-700 hover:border-blue-500 hover:bg-blue-50 transition-all"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Status */}
              <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <div>
                    <p className="font-semibold text-gray-800">Location</p>
                    <p className="text-xs text-gray-600">
                      {location ? 'Ready to create' : 'Location not available'}
                    </p>
                  </div>
                </div>
                {location && (
                  <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">
                    ✓ Active
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !location}
                className="w-full bg-[#4A4A4A] text-white p-4 rounded-full font-bold text-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating room...
                  </span>
                ) : (
                  <>
                    <span className="text-xl">+</span> Create Room
                  </>
                )}
              </button>
            </form>

            {/* Warning */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                You'll become the host and can delete the room anytime
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
