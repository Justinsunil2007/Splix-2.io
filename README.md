# ⚡ TERRA CLASH: DOMINION — 5v5 Team Battle Royale

A high-performance, original browser-based multiplayer territory Battle Royale game designed for college club esports tournaments.

---

## 🎮 Overview

- **Capacity**: 30 simultaneous connected players (Target: 5 teams × 5 players = 25 players).
- **Match Flow**: Waiting → Lobby → 5s Countdown → Active Match → Zone Shrink → Team Elimination → Victory.
- **Server-Authoritative**: Position, trail capture, friendly-fire immunity, enemy trail severing, shrinking safe zone, and victory calculation are validated 100% on the backend.
- **Original Tech**: Custom 60 FPS HTML5 2D Canvas rendering, procedural Web Audio synthesizer sounds (no external audio assets), smooth camera lerp tracking, and responsive virtual touch controls for mobile.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Backend Game Server
Runs the authoritative WebSocket game server on port `8080`:
```bash
npm run dev:server
```

### 3. Start the Frontend Client (In another terminal)
Runs the Vite React client on `http://localhost:5173`:
```bash
npm run dev:client
```

---

## 🤖 25-Player Tournament Stress Test

To simulate a full 25-player (5 teams × 5 players) match under real WebSocket load with automated bot movement and admin trigger:
```bash
npm run stress-test
```
You will observe all 25 players connect to the server, distribute into their 5 respective teams, move continuously, trigger trail captures, and fight for territory dominion.

---

## 🛡️ Tournament Organizer / Admin Guide

1. Navigate to the top-right button labeled **`ADMIN / ORGANIZER`** in the lobby or in-game HUD.
2. Enter the organizer password (Default: `tournament2026`).
3. As the Organizer, you can:
   - Monitor real-time player counts per team (e.g. `5/5`, `4/5`).
   - Start the match with a 5-second synchronized countdown (`START MATCH`).
   - Force zone shrinking if matches need acceleration (`FORCE ZONE SHRINK`).
   - Force end a match (`FORCE END MATCH`).
   - Kick disruptive operatives.
   - Reset the match back to Lobby for the next round (`RESET TO LOBBY`).

---

## 🌐 Production Deployment

### Frontend (Vercel)
1. Import this repository into Vercel.
2. Set Framework Preset to **Vite**.
3. Set the Environment Variable:
   - `VITE_GAME_SERVER_URL`: `wss://your-render-or-railway-app.com`
4. Deploy!

### Backend WebSocket Server (Render / Railway / Fly.io)
1. Deploy as a Web Service / Docker container.
2. Build Command: `npm run build:server`
3. Start Command: `npm start`
4. Set Environment Variables:
   - `PORT`: `8080` (or host provided)
   - `ADMIN_PASSWORD`: `<your-custom-secure-password>`
