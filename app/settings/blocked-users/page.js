'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import axios from 'axios';

export default function BlockedUsers() {
    const router = useRouter();
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/signin');
            return;
        }

        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/blocked', {
                headers: { Authorization: `Bearer ${token}` }
            });

            setBlockedUsers(res.data.blockedUsers || []);
            setLoading(false);
        } catch (error) {
            console.error('Failed to load blocked users');
            setLoading(false);
        }
    };

    const handleUnblock = async (userId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/user/unblock',
                { userId },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success('User unblocked');
            fetchBlockedUsers();
        } catch (error) {
            toast.error('Failed to unblock user');
        }
    };

    return (
        <div className="min-h-screen bg-[#F5F1E8]">
            {/* Header */}
            <div className="bg-white p-4 flex items-center shadow-sm sticky top-0 z-10">
                <button
                    onClick={() => router.back()}
                    className="text-2xl mr-4 hover:opacity-70"
                >
                    ←
                </button>
                <h1 className="text-xl font-semibold">Blocked Users</h1>
            </div>

            <div className="p-4 max-w-2xl mx-auto">
                {loading ? (
                    <div className="text-center py-20">
                        <div className="animate-spin text-6xl mb-4">⏳</div>
                        <p className="text-gray-600">Loading...</p>
                    </div>
                ) : blockedUsers.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                        <div className="text-7xl mb-4">🚫</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No blocked users</h3>
                        <p className="text-gray-600">You haven't blocked anyone yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {blockedUsers.map((user) => (
                            <div
                                key={user._id}
                                className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center"
                            >
                                <div>
                                    <p className="font-semibold text-gray-800">@{user.handle}</p>
                                    <p className="text-xs text-gray-500">Blocked</p>
                                </div>
                                <button
                                    onClick={() => handleUnblock(user._id)}
                                    className="bg-blue-500 text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-blue-600"
                                >
                                    Unblock
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
