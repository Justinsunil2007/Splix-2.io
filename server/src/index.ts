import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { SERVER_CONFIG, GAME_TITLE, GAME_VERSION } from '../../shared/constants.js';
import { GameServer } from './GameServer.js';

dotenv.config();

const app = express();

// ── CORS: allow Vercel frontend (or * for dev/testing) ──────────
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin === '*' ? '*' : corsOrigin.split(',').map((o) => o.trim()),
  methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json());

// ── Health check (used by Render health checks + keep-alive) ────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    game: GAME_TITLE,
    version: GAME_VERSION,
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

// ── Prevent Render free-tier cold-start by self-pinging ─────────
// Render's free tier sleeps after 15 min of inactivity.
// Self-ping every 10 minutes keeps it awake during the tournament.
const SELF_PING_MS = 10 * 60 * 1000; // 10 minutes
const selfUrl = process.env.RENDER_EXTERNAL_URL || null;
if (selfUrl) {
  setInterval(() => {
    fetch(`${selfUrl}/health`).catch(() => { /* ignore */ });
  }, SELF_PING_MS);
}

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const gameServer = new GameServer(wss);

const port = process.env.PORT ? parseInt(process.env.PORT) : SERVER_CONFIG.PORT;
httpServer.listen(port, () => {
  console.log(`=========================================`);
  console.log(`⚡ ${GAME_TITLE} ${GAME_VERSION} Server Running`);
  console.log(`📡 WebSocket Port: ${port}`);
  console.log(`🌐 CORS Origin: ${corsOrigin}`);
  console.log(`🔐 Admin Secret: ${process.env.ADMIN_SECRET ? 'SET (from env)' : 'WARNING: using fallback!'}`);
  console.log(`⚔️  Max Capacity: ${SERVER_CONFIG.MAX_TOTAL_PLAYERS} Players`);
  console.log(`🏆  Tournament: ${SERVER_CONFIG.MAX_TEAMS} Squads × ${SERVER_CONFIG.MAX_PLAYERS_PER_TEAM} Players`);
  console.log(`=========================================`);
});

// ── Graceful shutdown ─────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received — shutting down gracefully');
  httpServer.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0));
});
