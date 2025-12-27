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

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      // Health check endpoint for Railway
      if (req.url === '/api/health' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', timestamp: Date.now() }));
        return;
      }

      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ["GET", "POST"],
      credentials: false
    },
    transports: ['polling', 'websocket'],
    allowEIO3: true,
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
      
      const participantCount = room.size;
      io.to(roomId).emit('participant_update', {
        participantCount,
        participants: Array.from(room.values()).map(u => u.handle)
      });
    });

    socket.on('send_message', (data) => {
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

    socket.on('add_reaction', ({ messageId, emoji, roomId }) => {
      io.to(roomId).emit('new_reaction', {
        messageId,
        emoji
      });
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
    }
  });

  // Graceful shutdown
  const gracefulShutdown = (signal) => {
    console.log(`\n${signal} received. Closing server gracefully...`);
    
    httpServer.close(() => {
      console.log('HTTP server closed');
      io.close(() => {
        console.log('Socket.io closed');
        process.exit(0);
      });
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  httpServer
    .once('error', (err) => {
      console.error('❌ Server error:', err);
      process.exit(1);
    })
    .listen(port, hostname, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      console.log(`✅ Health check available at /health`);
    });
}).catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
