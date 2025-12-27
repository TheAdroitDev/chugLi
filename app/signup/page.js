'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function SignUp() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState('');

  const checkPasswordStrength = (password) => {
    if (password.length === 0) return '';
    if (password.length < 6) return 'weak';
    if (password.length < 10) return 'medium';
    return 'strong';
  };

  const handlePasswordChange = (e) => {
    const newPassword = e.target.value;
    setFormData({...formData, password: newPassword});
    setPasswordStrength(checkPasswordStrength(newPassword));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    
    try {
      const res = await axios.post('/api/auth/signup', formData);
      
      if (res.data.success) {
        toast.success(res.data.message);
        localStorage.setItem('tempUserId', res.data.userId);
        router.push('/select-handle');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F5F1E8] px-4 py-8">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">ChugLi</h1>
          <p className="text-gray-500 text-sm">Anonymous Local Chat</p>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">Create Account</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-black"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>
          
          {/* Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              type="password"
              placeholder="Minimum 6 characters"
              className="w-full p-3 border text-black border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.password}
              onChange={handlePasswordChange}
              required
            />
            {/* Password Strength Indicator */}
            {passwordStrength && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      passwordStrength === 'weak' ? 'w-1/3 bg-red-500' :
                      passwordStrength === 'medium' ? 'w-2/3 bg-yellow-500' :
                      'w-full bg-green-500'
                    }`}
                  ></div>
                </div>
                <span className={`text-xs font-medium ${
                  passwordStrength === 'weak' ? 'text-red-500' :
                  passwordStrength === 'medium' ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                </span>
              </div>
            )}
          </div>
          
          {/* Confirm Password Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              placeholder="Re-enter your password"
              className="text-black w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#4A4A4A] text-white p-3.5 rounded-full font-semibold hover:bg-[#3A3A3A] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating account...
              </span>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        
        {/* Privacy Note */}
        <p className="mt-4 text-xs text-gray-500 text-center">
          By signing up, you agree to keep conversations respectful
        </p>
        
        {/* Sign In Link */}
        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a 
              href="/signin" 
              className="text-blue-600 font-semibold hover:text-blue-700 hover:underline transition-colors"
            >
              Sign In
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
