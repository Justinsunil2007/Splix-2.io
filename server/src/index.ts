import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { SERVER_CONFIG, GAME_TITLE, GAME_VERSION } from '../../shared/constants.js';
import { GameServer } from './GameServer.js';
import { connectMongoDB, loadMatchHistoryFromDB } from './db.js';

dotenv.config();

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? true : corsOrigin.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: GAME_TITLE,
    version: GAME_VERSION,
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

const httpServer = createServer(app);

// Socket.IO server with optimised settings for low-latency multiplayer
const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Prefer WebSocket, fall back to polling for corporate/college networks
  transports: ['websocket', 'polling'],
  pingInterval: 10000,    // Heartbeat every 10s
  pingTimeout: 5000,      // Disconnect after 5s no response
  maxHttpBufferSize: 1e5, // 100 KB max message
  connectTimeout: 8000,
});

const gameServer = new GameServer(io);

const port = process.env.PORT ? parseInt(process.env.PORT) : SERVER_CONFIG.PORT;

httpServer.listen(port, async () => {
  console.log(`=========================================`);
  console.log(`⚡ ${GAME_TITLE} ${GAME_VERSION} Server Running`);
  console.log(`📡 Socket.IO Port: ${port}`);
  console.log(`🌐 CORS Origin: ${corsOrigin}`);
  console.log(`🔐 Admin Secret: ${process.env.ADMIN_SECRET ? 'SET (from env)' : 'using dev fallback'}`);
  console.log(`⚔️  Max Capacity: ${SERVER_CONFIG.MAX_TOTAL_PLAYERS} Players`);
  console.log(`🏆  Tournament: ${SERVER_CONFIG.MAX_TEAMS} Squads × ${SERVER_CONFIG.MAX_PLAYERS_PER_TEAM} Players`);

  const connected = await connectMongoDB();
  if (connected) {
    const history = await loadMatchHistoryFromDB();
    if (history.length > 0) {
      gameServer.match.matchHistory = history;
      console.log(`📜 Restored ${history.length} match records from MongoDB Atlas`);
    }
  }
  console.log(`=========================================`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  io.close();
  httpServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  io.close();
  httpServer.close(() => process.exit(0));
});
