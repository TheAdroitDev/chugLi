const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const activeRooms = new Map();
let httpServer;
let io;

// PREPARE FIRST - DO NOT START SERVER YET
app.prepare().then(() => {
  console.log('✅ Next.js ready');

  // NOW create and start server
  httpServer = createServer(async (req, res) => {
    try {
      if (req.url === '/health' || req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
      }

      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  io = new Server(httpServer, {
    cors: { origin: '*', methods: ["GET", "POST"] },
    transports: ['polling', 'websocket'],
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    socket.on('join_room', ({ roomId, userId, handle }) => {
      socket.join(roomId);
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }
      const room = activeRooms.get(roomId);
      room.set(userId, { socketId: socket.id, handle });
      socket.roomId = roomId;
      socket.userId = userId;
      
      io.to(roomId).emit('participant_update', {
        participantCount: room.size,
        participants: Array.from(room.values()).map(u => u.handle)
      });
    });

    socket.on('send_message', (data) => {
      const { roomId, message, handle, id, timestamp } = data;
      io.to(roomId).emit('receive_message', {
        id: id || Date.now().toString(),
        roomId, message, handle,
        timestamp: timestamp || new Date(),
        reactions: []
      });
    });

    socket.on('add_reaction', ({ messageId, emoji, roomId }) => {
      io.to(roomId).emit('new_reaction', { messageId, emoji });
    });

    socket.on('leave_room', (roomId) => {
      handleUserLeave(socket, roomId);
    });

    socket.on('delete_room', (roomId) => {
      io.to(roomId).emit('room_deleted');
      activeRooms.delete(roomId);
    });

    socket.on('disconnect', () => {
      if (socket.roomId && socket.userId) {
        handleUserLeave(socket, socket.roomId);
      }
    });
  });

  function handleUserLeave(socket, roomId) {
    if (!activeRooms.has(roomId)) return;
    const room = activeRooms.get(roomId);
    room.delete(socket.userId);
    
    io.to(roomId).emit('participant_update', {
      participantCount: room.size,
      participants: Array.from(room.values()).map(u => u.handle)
    });
    
    if (room.size === 0) activeRooms.delete(roomId);
  }

  console.log('✅ Socket.io ready');

  // Listen LAST - after everything is ready
  httpServer.listen(port, hostname, () => {
    console.log(`🚀 Server ready on http://${hostname}:${port}`);
  });

}).catch((err) => {
  console.error('❌ Failed to prepare:', err);
  process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`${signal} - Shutting down...`);
  if (io) io.close();
  if (httpServer) {
    httpServer.close(() => process.exit(0));
  }
  setTimeout(() => process.exit(1), 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));