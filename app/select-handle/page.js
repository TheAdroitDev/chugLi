'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function SelectHandle() {
  const router = useRouter();
  const [handles, setHandles] = useState([]);
  const [selectedHandle, setSelectedHandle] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isChangingHandle, setIsChangingHandle] = useState(false);
  const [currentHandle, setCurrentHandle] = useState('');

  const fetchHandles = async () => {
    setRefreshing(true);
    try {
      const res = await axios.get('/api/auth/select-handle');
      setHandles(res.data.handles);
    } catch (error) {
      toast.error('Failed to load handles');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // Check if this is a handle change or new signup
    const changingHandle = localStorage.getItem('changingHandle');
    const tempUserId = localStorage.getItem('tempUserId');
    const token = localStorage.getItem('token');
    const handle = localStorage.getItem('handle');

    if (changingHandle === 'true' && token) {
      // User is changing their existing handle
      setIsChangingHandle(true);
      setCurrentHandle(handle);
    } else if (!tempUserId) {
      // Neither changing handle nor signing up - redirect to signup
      toast.error('Please sign up first');
      router.push('/signup');
      return;
    }
    
    fetchHandles();
  }, []);

  const handleSubmit = async () => {
    if (!selectedHandle) {
      toast.error('Please select a handle');
      return;
    }

    setLoading(true);

    try {
      if (isChangingHandle) {
        // Update existing user's handle
        const token = localStorage.getItem('token');
        
        const res = await axios.patch('/api/user/profile',
          { handle: selectedHandle },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (res.data.success) {
          // Update local storage with new handle
          localStorage.setItem('handle', selectedHandle);
          localStorage.removeItem('changingHandle');
          toast.success('Handle updated successfully');
          router.push('/settings');
        }
      } else {
        // New user signup
        const userId = localStorage.getItem('tempUserId');
        
        const res = await axios.post('/api/auth/select-handle', {
          userId,
          handle: selectedHandle
        });
        
        if (res.data.success) {
          toast.success(res.data.message);
          localStorage.removeItem('tempUserId');
          router.push('/signin');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to set handle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center px-4 py-8">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎭</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            {isChangingHandle ? 'Change Your Handle' : 'Choose Your Handle'}
          </h1>
          <p className="text-gray-600">
            {isChangingHandle 
              ? `Current handle: @${currentHandle}` 
              : 'This will be your anonymous identity in ChugLi'
            }
          </p>
        </div>

        {/* Handle Grid */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {handles.map((handle) => (
            <button
              key={handle}
              onClick={() => setSelectedHandle(handle)}
              disabled={refreshing}
              className={`p-5 rounded-xl border-2 transition-all duration-200 font-semibold text-lg ${
                selectedHandle === handle
                  ? 'border-blue-500 bg-blue-50 text-blue-700 scale-105 shadow-md'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:shadow-sm'
              } disabled:opacity-50`}
            >
              <span className="text-blue-600">@</span>{handle}
            </button>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                <strong>Don't like these?</strong> Click the refresh button to get new options. 
                Your handle will be visible to others in chat rooms.
              </p>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={fetchHandles}
          disabled={refreshing}
          className="w-full mb-3 p-3 border-2 border-gray-300 rounded-full font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
          {refreshing ? 'Loading...' : 'Refresh Handles'}
        </button>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {isChangingHandle && (
            <button
              onClick={() => {
                localStorage.removeItem('changingHandle');
                router.push('/settings');
              }}
              className="flex-1 border-2 border-gray-300 text-gray-700 p-4 rounded-full font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={!selectedHandle || loading}
            className={`${isChangingHandle ? 'flex-1' : 'w-full'} bg-[#4A4A4A] text-white p-4 rounded-full font-semibold text-lg hover:bg-[#3A3A3A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isChangingHandle ? 'Updating...' : 'Setting up...'}
              </span>
            ) : (
              isChangingHandle ? 'Update Handle' : 'Continue'
            )}
          </button>
        </div>

        {/* Selected Handle Preview */}
        {selectedHandle && (
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {isChangingHandle ? 'New handle:' : 'You selected:'}
            </p>
            <p className="text-2xl font-bold text-blue-600">@{selectedHandle}</p>
          </div>
        )}
      </div>
    </div>
  );
}
