'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import axios from 'axios';
import { use } from 'react';

let socket;

export default function ChatRoom({ params }) {
    const { id } = use(params);

    const router = useRouter();
    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isHost, setIsHost] = useState(false);
    const [room, setRoom] = useState(null);
    const [userHandle, setUserHandle] = useState('');
    const [userId, setUserId] = useState('');
    const [loading, setLoading] = useState(true);
    const [participantCount, setParticipantCount] = useState(0);
    const [socketConnected, setSocketConnected] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [showMenuForMessage, setShowMenuForMessage] = useState(null);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const handle = localStorage.getItem('handle');

        if (!token || !handle) {
            router.push('/signin');
            return;
        }

        // Decode token to get userId
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);
            setUserId(decoded.userId);
        } catch (error) {
            console.error('Token decode error:', error);
        }

        setUserHandle(handle);
        fetchRoomDetails();
        loadBlockedUsers();
        loadMessages();
        initializeSocket(handle);

        return () => {
            if (socket) {
                socket.emit('leave_room', id);
                socket.disconnect();
            }
        };
    }, [id]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showMenuForMessage) {
                setShowMenuForMessage(null);
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showMenuForMessage]);

    const fetchRoomDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/rooms/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setRoom(res.data.room);
            setIsHost(res.data.isHost);
            setLoading(false);
        } catch (error) {
            toast.error('Room not found');
            router.push('/');
        }
    };

    const loadBlockedUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/user/blocked', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Store blocked user handles
            const blockedHandles = res.data.blockedUsers.map(u => u.handle);
            setBlockedUsers(blockedHandles);
        } catch (error) {
            console.error('Failed to load blocked users');
        }
    };

    const loadMessages = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/messages/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const loadedMessages = res.data.messages.map(msg => ({
                id: msg._id,
                roomId: msg.roomId,
                message: msg.content,
                handle: msg.handle,
                userId: msg.userId,
                timestamp: msg.createdAt,
                reactions: msg.reactions || []
            }));

            setMessages(loadedMessages);
        } catch (error) {
            console.error('Failed to load messages');
        }
    };

    const initializeSocket = (handle) => {
        const socketUrl = typeof window !== 'undefined'
            ? window.location.origin
            : 'http://localhost:3000';

        socket = io(socketUrl, {
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5,
            timeout: 20000
        });

        socket.on('connect', () => {
            setSocketConnected(true);

            const token = localStorage.getItem('token');
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            const decoded = JSON.parse(jsonPayload);

            socket.emit('join_room', {
                roomId: id,
                userId: decoded.userId,
                handle
            });
        });

        socket.on('connect_error', (error) => {
            setSocketConnected(false);
        });

        socket.on('reconnect', () => {
            toast.success('Reconnected!');
        });

        socket.on('reconnect_failed', () => {
            toast.error('Connection lost. Please refresh.');
        });

        socket.on('receive_message', (data) => {
            if (blockedUsers.includes(data.handle)) return;

            setMessages((prev) => {
                if (prev.some(msg => msg.id === data.id)) return prev;
                return [...prev, data];
            });
        });

        socket.on('new_reaction', ({ messageId, emoji }) => {
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === messageId
                        ? { ...msg, reactions: [...(msg.reactions || []), emoji] }
                        : msg
                )
            );
        });

        socket.on('participant_update', ({ participantCount }) => {
            setParticipantCount(participantCount);
        });

        socket.on('room_deleted', () => {
            toast.error('Room deleted by host');
            router.push('/');
        });

        socket.on('disconnect', (reason) => {
            setSocketConnected(false);
            if (reason === 'io server disconnect') {
                socket.connect();
            }
        });
    };

    const sendMessage = async () => {
        if (!inputMessage.trim()) return;

        if (!socket || !socketConnected) {
            toast.error('Not connected. Please refresh the page.');
            return;
        }

        const messageId = Date.now().toString() + Math.random().toString(36).substring(7);
        const messageData = {
            id: messageId,
            roomId: id,
            message: inputMessage.trim(),
            handle: userHandle,
            timestamp: new Date()
        };

        socket.emit('send_message', messageData);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/messages/${id}`, {
                messageId,
                message: inputMessage.trim(),
                handle: userHandle
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to save message:', error);
        }

        setInputMessage('');
    };

    const addReaction = (messageId, emoji) => {
        if (!socket || !socketConnected) return;

        socket.emit('add_reaction', {
            messageId,
            emoji,
            roomId: id
        });
    };

    const blockUser = async (messageUserId, messageHandle) => {
        if (!confirm(`Block @${messageHandle}? You won't see their messages anymore.`)) {
            return;
        }

        try {
            const token = localStorage.getItem('token');

            await axios.post('/api/user/block', {
                userIdToBlock: messageUserId,
                handleToBlock: messageHandle
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Add to local blocked list
            setBlockedUsers(prev => [...prev, messageHandle]);

            // Remove all messages from this user
            setMessages(prev => prev.filter(msg => msg.handle !== messageHandle));

            toast.success(`Blocked @${messageHandle}`);
            setShowMenuForMessage(null);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to block user');
        }
    };

    const deleteRoom = async () => {
        if (!confirm('Are you sure you want to delete this room?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/rooms/${id}/delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (socket) {
                socket.emit('delete_room', id);
            }
            toast.success('Room deleted');
            router.push('/');
        } catch (error) {
            toast.error('Failed to delete room');
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-[#F5F1E8]">
                <div className="text-center">
                    <div className="animate-spin text-6xl mb-4">💬</div>
                    <p className="text-gray-600">Loading room...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-[#F5F1E8]">
            {/* Header */}
            <div className="bg-white shadow-sm">
                <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="text-2xl hover:opacity-70 transition-opacity"
                        >
                            ←
                        </button>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-lg font-bold text-gray-800">{room?.title}</h1>
                                <div
                                    className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500' : 'bg-red-500'}`}
                                    title={socketConnected ? 'Connected' : 'Disconnected'}
                                />
                            </div>
                            <p className="text-xs text-gray-600">
                                <span className="inline-flex items-center gap-1">
                                    <span className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                                    {participantCount} {participantCount === 1 ? 'person' : 'people'} active
                                </span>
                            </p>
                        </div>
                    </div>

                    {isHost && (
                        <button
                            onClick={deleteRoom}
                            className="text-red-600 font-semibold text-sm hover:text-red-700 transition-colors"
                        >
                            🗑️ Delete
                        </button>
                    )}
                </div>

                {isHost && (
                    <div className="px-4 pb-3">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 flex items-center gap-2">
                            <span className="text-sm">👑</span>
                            <span className="text-xs text-blue-700 font-medium">You're the host</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">💬</div>
                        <p className="text-gray-600 font-semibold">No messages yet</p>
                        <p className="text-sm text-gray-500 mt-2">Start the conversation!</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg) => {
                            const isOwnMessage = msg.handle === userHandle;
                            const isBlocked = blockedUsers.includes(msg.handle);

                            // Don't show blocked users' messages
                            if (isBlocked) return null;

                            return (
                                <div
                                    key={msg.id}
                                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className="relative max-w-[75%]">
                                        <div
                                            className={`${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-white'} p-3 rounded-2xl shadow-sm`}
                                        // REMOVED: onLongPress - not a valid React event
                                        >
                                            {!isOwnMessage && (
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-semibold text-sm text-blue-600">
                                                        @{msg.handle}
                                                    </p>
                                                    {/* Three dots menu */}
                                                    <button
                                                        onClick={() => setShowMenuForMessage(showMenuForMessage === msg.id ? null : msg.id)}
                                                        className="text-gray-400 hover:text-gray-600 ml-2 text-xl font-bold"
                                                    >
                                                        ⋮
                                                    </button>
                                                </div>
                                            )}
                                            <p className={isOwnMessage ? 'text-white' : 'text-gray-800'}>
                                                {msg.message}
                                            </p>

                                            <div className="flex gap-1 mt-2 flex-wrap">
                                                {['😊', '👍', '❤️', '🔥'].map((emoji) => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => addReaction(msg.id, emoji)}
                                                        className="text-lg hover:scale-125 transition-transform"
                                                        disabled={!socketConnected}
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>

                                            {msg.reactions && msg.reactions.length > 0 && (
                                                <div className="mt-1 text-sm">
                                                    {msg.reactions.join(' ')}
                                                </div>
                                            )}
                                        </div>

                                        {/* Message Menu */}
                                        {showMenuForMessage === msg.id && !isOwnMessage && (
                                            <div className="absolute top-0 right-0 mt-10 mr-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-20 min-w-37.5">
                                                <button
                                                    onClick={() => blockUser(msg.userId, msg.handle)}
                                                    className="w-full px-4 py-3 text-left text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2 font-medium"
                                                >
                                                    <span className="text-lg">🚫</span>
                                                    Block @{msg.handle}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
                {!socketConnected && (
                    <div className="mb-2 text-center text-xs text-red-600">
                        ⚠️ Not connected. Refresh the page.
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                        placeholder="Type a message..."
                        className="flex-1 p-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={!socketConnected}
                    />
                    <button
                        onClick={sendMessage}
                        disabled={!inputMessage.trim() || !socketConnected}
                        className="bg-[#4A4A4A] text-white px-6 py-3 rounded-full font-semibold hover:bg-[#3A3A3A] transition-colors disabled:opacity-50"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
}
