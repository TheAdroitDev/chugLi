const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Track active rooms: roomId -> Map<userId, { socketId, handle }>
const activeRooms = new Map();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins for simplicity (both local and prod)
      methods: ["GET", "POST"],
      credentials: false
    },
    transports: ['polling', 'websocket'], // Try polling first, then upgrade to websocket
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('✅ User connected:', socket.id);

    // JOIN ROOM
    socket.on('join_room', ({ roomId, userId, handle }) => {
      console.log(`User ${handle} (${userId}) joining room: ${roomId}`);
      
      socket.join(roomId);
      
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }
      
      const room = activeRooms.get(roomId);
      room.set(userId, { socketId: socket.id, handle });
      
      socket.roomId = roomId;
      socket.userId = userId;
      
      const participantCount = room.size;
      io.to(roomId).emit('participant_update', {
        participantCount,
        participants: Array.from(room.values()).map(u => u.handle)
      });
      
      console.log(`Room ${roomId} now has ${participantCount} unique participants`);
    });

    // SEND MESSAGE
    socket.on('send_message', (data) => {
      console.log('📨 Message received:', data);
      
      const { roomId, message, handle, id, timestamp } = data;
      
      io.to(roomId).emit('receive_message', {
        id: id || Date.now().toString(),
        roomId,
        message,
        handle,
        timestamp: timestamp || new Date(),
        reactions: []
      });
    });

    // ADD REACTION
    socket.on('add_reaction', ({ messageId, emoji, roomId }) => {
      console.log(`👍 Reaction: ${emoji} on message ${messageId}`);
      
      io.to(roomId).emit('new_reaction', {
        messageId,
        emoji
      });
    });

    // LEAVE ROOM
    socket.on('leave_room', (roomId) => {
      console.log(`User leaving room: ${roomId}`);
      handleUserLeave(socket, roomId);
    });

    // DELETE ROOM
    socket.on('delete_room', (roomId) => {
      console.log(`🗑️ Room ${roomId} being deleted`);
      
      io.to(roomId).emit('room_deleted');
      activeRooms.delete(roomId);
    });

    // DISCONNECT
    socket.on('disconnect', () => {
      console.log('❌ User disconnected:', socket.id);
      
      if (socket.roomId && socket.userId) {
        handleUserLeave(socket, socket.roomId);
      }
    });

    // Helper function to handle user leaving
    function handleUserLeave(socket, roomId) {
      if (!activeRooms.has(roomId)) return;
      
      const room = activeRooms.get(roomId);
      room.delete(socket.userId);
      
      const participantCount = room.size;
      io.to(roomId).emit('participant_update', {
        participantCount,
        participants: Array.from(room.values()).map(u => u.handle)
      });
      
      if (room.size === 0) {
        activeRooms.delete(roomId);
      }
      
      console.log(`Room ${roomId} now has ${participantCount} participants`);
    }
  });

  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`✅ Socket.io server running`);
      console.log(`📍 Environment: ${dev ? 'development' : 'production'}`);
    });
});
