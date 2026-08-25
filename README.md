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

## 🏢 COLLEGE LAB / LAN TOURNAMENT MODE

SPLIX 2.io is fully configured to run inside a college computer lab over a Local Area Network (LAN) with **zero internet connection required**. One host computer runs the game server and frontend, and all other lab PCs connect directly to it.

### Required Network Ports
| Service | Default Port | Config Env Variable | Binding | Protocol |
|---|---|---|---|---|
| **Frontend Web App** | `5173` | `FRONTEND_PORT` | `0.0.0.0` | HTTP / TCP |
| **Multiplayer Socket Server** | `8080` | `PORT` or `SERVER_PORT` | `0.0.0.0` | HTTP / WebSocket (TCP) |

---

### 🚀 Host Setup Guide (Step-by-Step)

#### 1. On the Host PC: Start the Tournament Server & Frontend
Open the project directory in a terminal and run:
```bash
npm run dev:lan
```
*(Or `npm run dev` — both bind to `0.0.0.0` automatically).*

The console will display:
```text
=========================================
⚡ Splix 2.io v2.5.0-TOURNAMENT Server Running
📡 Socket.IO Host: 0.0.0.0:8080
🌐 Host LAN IP:   192.168.1.50
🎮 Player Join URL: http://192.168.1.50:5173
🔐 Admin Secret:  SET (from env) or using fallback
=========================================
```

#### 2. Find Your Host LAN IP Address
If needed, you can also find it manually:
- **Windows:** Run `ipconfig` in Command Prompt $\rightarrow$ Look for **IPv4 Address** under your active Ethernet/Wi-Fi adapter (e.g. `192.168.1.50` or `10.0.0.25`).
- **Mac/Linux:** Run `ifconfig` or `ip a`.

#### 3. Share the URL with Lab Players
Have all participants in the computer lab open their browser and visit:
```text
http://<HOST_LAN_IP>:5173
```
*(Example: `http://192.168.1.50:5173`)*

- **QR Code Joining:** Click the **`PROJECTOR QR`** button in the lobby on the host computer or tournament projector to show an auto-generated QR code pointing to the LAN URL.
- **Client Auto-Detection:** The client will automatically detect it is running on a LAN IP and connect to `http://<HOST_LAN_IP>:8080` without touching the internet.

#### 4. Organizer Admin Controls
1. Click **`ADMIN / ORGANIZER`** in the top-right corner.
2. Enter the secret key (Default: `tournament2026` or `admin123`).
3. View the live **LAN HOST / NETWORK STATUS** panel showing connected player count, tick rate, and match controls.
4. Click **`LAUNCH MATCH`** to initiate the synchronized 5-second countdown.

---

### 🔥 Windows Firewall / Security Rule
If player computers cannot connect to the Host PC:
1. When starting Node.js for the first time, Windows Defender may ask: *"Allow Node.js to communicate on these networks"*. Check **Private Networks** and click **Allow access**.
2. Alternatively, allow inbound TCP traffic for ports **`5173`** and **`8080`** in Windows Defender Firewall:
   ```powershell
   New-NetFirewallRule -DisplayName "Splix 2.io LAN Server" -Direction Inbound -LocalPort 5173,8080 -Protocol TCP -Action Allow
   ```

---

## 🌐 Online Cloud Deployment (Vercel + Render)

The same codebase seamlessly supports online internet deployment:

### Frontend (Vercel)
1. Import repository into Vercel.
2. Set Environment Variable:
   - `VITE_GAME_SERVER_URL`: `https://your-backend-app.onrender.com` (or `wss://...`)
3. Deploy!

### Backend Server (Render.com)
1. Deploy as a Web Service.
2. Build Command: `npm run build:server`
3. Start Command: `npm start`
4. Set Environment Variables:
   - `PORT`: `8080`
   - `ADMIN_SECRET`: `<your-admin-password>`
   - `CORS_ORIGIN`: `*` (or your Vercel frontend URL)

