import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import dotenv from 'dotenv';
import { SERVER_CONFIG, GAME_TITLE, GAME_VERSION } from '../../shared/constants.js';
import { GameServer } from './GameServer.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    game: GAME_TITLE,
    version: GAME_VERSION,
    timestamp: Date.now(),
  });
});

const httpServer = createServer(app);
const wss = new WebSocketServer({ server: httpServer });

const gameServer = new GameServer(wss);

const port = SERVER_CONFIG.PORT;
httpServer.listen(port, () => {
  console.log(`=========================================`);
  console.log(`⚡ ${GAME_TITLE} ${GAME_VERSION} Server Running`);
  console.log(`📡 WebSocket Port: ${port}`);
  console.log(`🔐 Admin Secret: Loaded from ADMIN_SECRET env or 'justin' fallback`);
  console.log(`⚔️  Max Capacity: ${SERVER_CONFIG.MAX_TOTAL_PLAYERS} Players`);
  console.log(`🏆  Tournament Mode: ${SERVER_CONFIG.MAX_TEAMS} Squads × ${SERVER_CONFIG.MAX_PLAYERS_PER_TEAM} Players`);
  console.log(`=========================================`);
});
