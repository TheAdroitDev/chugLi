'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState({
    handle: '',
    email: '',
    blockedUsers: []
  });
  const [loading, setLoading] = useState(true);
  const appVersion = '1.0.0';

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/signin');
      return;
    }

    // Clear any leftover flags
    localStorage.removeItem('changingHandle');
    localStorage.removeItem('tempUserId');

    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      
      const res = await axios.get('/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setUser(res.data.user);
      
      // Update handle in localStorage if it changed
      localStorage.setItem('handle', res.data.user.handle);
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to load profile:', error);
      toast.error('Failed to load profile');
      setLoading(false);
    }
  };

  const handleChangeHandle = () => {
    // Save current email for after handle change
    localStorage.setItem('changingHandle', 'true');
    router.push('/select-handle');
  };

  const handleBlockedUsers = () => {
    router.push('/settings/blocked-users');
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      'Are you sure you want to delete your account?\n\n' +
      'This will permanently delete:\n' +
      '- Your profile and handle\n' +
      '- All your messages\n' +
      '- All rooms you created\n\n' +
      'This action cannot be undone.'
    );
    
    if (!confirmed) return;

    // Double confirmation
    const doubleConfirm = confirm('Are you absolutely sure? Type your handle to confirm.');
    if (!doubleConfirm) return;

    try {
      const token = localStorage.getItem('token');
      
      await axios.delete('/api/user/delete', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Clear all local storage
      localStorage.clear();
      
      toast.success('Account deleted successfully');
      router.push('/signup');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete account');
    }
  };

  const handleSignOut = () => {
    // Clear authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('handle');
    
    toast.info('Signed out successfully');
    router.push('/signin');
  };

  // Handle back navigation
  const handleBack = () => {
    // Always go to home page instead of using router.back()
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F1E8] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-6xl mb-4">⚙️</div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F1E8]">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10">
        <button 
          onClick={handleBack}  
          className="text-2xl mr-4 hover:opacity-70 transition-opacity"
        >
          ←
        </button>
        <h1 className="text-xl font-semibold text-gray-800">Settings</h1>
      </div>

      <div className="p-4 space-y-6 max-w-2xl mx-auto">
        {/* PROFILE Section */}
        <div className="space-y-2">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider font-semibold px-1">
            PROFILE
          </h2>
          
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <p className="text-gray-500 text-sm mb-1">Anonymous Handle</p>
                  <p className="font-bold text-xl text-gray-800">@{user.handle}</p>
                </div>
              </div>
              
              <button 
                onClick={handleChangeHandle}
                className="w-full text-blue-500 text-center py-3 border-t border-gray-100 hover:bg-blue-50 transition-colors font-medium"
              >
                Change Handle
              </button>
            </div>

            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="py-3">
                <p className="text-gray-500 text-sm mb-1">Email</p>
                <p className="font-semibold text-gray-800">
                  {user.email}
                </p>
              </div>

              <div className="flex justify-between items-center py-3 border-t border-gray-100">
                <span className="text-gray-700 font-medium">Account Status</span>
                <span className="bg-green-100 text-green-700 px-4 py-1.5 rounded-full text-sm font-bold">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* PRIVACY & SAFETY Section */}
        <div className="space-y-2">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider font-semibold px-1">
            PRIVACY & SAFETY
          </h2>
          
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button 
              onClick={handleBlockedUsers}
              className="w-full flex justify-between items-center p-4 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <span className="text-gray-800 font-medium text-lg">Blocked Users</span>
              <span className="text-gray-400 text-2xl">›</span>
            </button>
            
            <button 
              onClick={handleDeleteAccount}
              className="w-full flex justify-between items-center p-4 text-red-500 hover:bg-red-50 transition-colors"
            >
              <span className="font-semibold text-lg">Delete Account</span>
              <span className="text-2xl">🗑️</span>
            </button>
          </div>
        </div>

        {/* ABOUT Section */}
        <div className="space-y-2">
          <h2 className="text-gray-500 text-xs uppercase tracking-wider font-semibold px-1">
            ABOUT
          </h2>
          
          <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <span className="text-gray-700 font-medium text-lg">App Version</span>
            <span className="font-bold text-gray-800 text-lg">{appVersion}</span>
          </div>
        </div>

        {/* Sign Out Button */}
        <div className="pt-4 pb-8">
          <button 
            onClick={handleSignOut}
            className="w-full border-2 border-red-500 text-red-500 font-bold text-lg p-4 rounded-full hover:bg-red-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
