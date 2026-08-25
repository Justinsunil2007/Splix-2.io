import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import os from 'os';
import { SERVER_CONFIG, GAME_TITLE, GAME_VERSION } from '../../shared/constants.js';
import { GameServer } from './GameServer.js';
import { connectMongoDB, loadMatchHistoryFromDB } from './db.js';

dotenv.config();

const app = express();

// Helper to find LAN IP on the host machine
export function getLocalLanIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Look for non-internal IPv4
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const LAN_IP = getLocalLanIp();
const FRONTEND_PORT = process.env.FRONTEND_PORT || '5173';
const SERVER_PORT = process.env.PORT || process.env.SERVER_PORT || String(SERVER_CONFIG.PORT);
const IS_PRODUCTION = process.env.NODE_ENV === 'production' && !process.env.LAN_MODE;

// Dynamic CORS Origin Validator
const configuredCors = process.env.CORS_ORIGIN || '';
const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true; // allow curl / non-browser / local requests
  if (configuredCors === '*' || process.env.LAN_MODE === 'true') return true;
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    // Always allow localhost & loopback
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    // Allow Private LAN IP ranges: 192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x
    if (
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
    ) {
      return true;
    }

    // Check configured online origins (e.g. Vercel domain)
    if (configuredCors) {
      const allowedList = configuredCors.split(',').map((o) => o.trim());
      if (allowedList.includes(origin) || allowedList.includes(hostname)) {
        return true;
      }
      // Wildcard check for *.vercel.app if configured
      for (const allowed of allowedList) {
        if (allowed.startsWith('*') && hostname.endsWith(allowed.slice(1))) {
          return true;
        }
      }
    }
  } catch {
    // If URL parsing fails
  }

  return false;
};

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Fallback to permissive for tournament LAN
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  credentials: true,
}));
app.use(express.json());

const httpServer = createServer(app);

// Socket.IO server with optimised settings for low-latency multiplayer
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 10000,    // Heartbeat every 10s
  pingTimeout: 5000,      // Disconnect after 5s no response
  maxHttpBufferSize: 1e5, // 100 KB max message
  connectTimeout: 8000,
});

const gameServer = new GameServer(io);

// Health check endpoint with LAN tournament info
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: GAME_TITLE,
    version: GAME_VERSION,
    mode: IS_PRODUCTION ? 'ONLINE' : 'LAN / LOCAL',
    lanIp: LAN_IP,
    lanJoinUrl: `http://${LAN_IP}:${FRONTEND_PORT}`,
    serverPort: parseInt(SERVER_PORT, 10),
    uptime: Math.floor(process.uptime()),
    connectedPlayers: gameServer.match.players.size,
    matchStatus: gameServer.match.status,
    timestamp: Date.now(),
  });
});

const port = parseInt(SERVER_PORT, 10);
const host = '0.0.0.0'; // Binds to all network interfaces for LAN host capability

httpServer.listen(port, host, async () => {
  console.log(`=========================================`);
  console.log(`⚡ ${GAME_TITLE} ${GAME_VERSION} Server Running`);
  console.log(`📡 Socket.IO Host: ${host}:${port}`);
  console.log(`🌐 Host LAN IP:   ${LAN_IP}`);
  console.log(`🎮 Player Join URL: http://${LAN_IP}:${FRONTEND_PORT}`);
  console.log(`🔐 Admin Secret:  ${process.env.ADMIN_SECRET ? 'SET (from env)' : 'using fallback (admin123 / tournament2026)'}`);
  console.log(`⚔️  Max Capacity:  ${SERVER_CONFIG.MAX_TOTAL_PLAYERS} Players`);
  console.log(`🏆  Tournament:    ${SERVER_CONFIG.MAX_TEAMS} Squads × ${SERVER_CONFIG.MAX_PLAYERS_PER_TEAM} Players`);

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

