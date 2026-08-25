import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientMessage,
  Direction,
  GameStateSnapshot,
  MatchHistoryRecord,
  ServerMessage,
  TeamInfo,
  TournamentStanding,
} from '../../shared/types.js';
import { LobbyView } from './components/LobbyView.js';
import { GameCanvas } from './components/GameCanvas.js';
import { GameHUD } from './components/GameHUD.js';
import { VirtualJoystick } from './components/VirtualJoystick.js';
import { VictoryModal } from './components/VictoryModal.js';
import { AdminPanel } from './components/AdminPanel.js';
import { CountdownOverlay } from './components/CountdownOverlay.js';
import { ObserverView } from './components/ObserverView.js';
import { SettingsModal, UserSettings, DEFAULT_SETTINGS } from './components/SettingsModal.js';
import { HowToPlayModal } from './components/HowToPlayModal.js';
import { ScoreboardModal } from './components/ScoreboardModal.js';
import { SoundManager } from './audio/SoundManager.js';
import { InputManager } from './game/InputManager.js';

// Helper to check if a hostname is a local LAN / loopback host
const isLocalOrLanHostname = (hostname: string): boolean => {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1') {
    return true;
  }
  // Private IPv4 ranges: 192.168.x.x, 10.x.x.x, 172.16.x.x-172.31.x.x
  return (
    /^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(hostname)
  );
};

// Resolve the server URL — supports both local LAN mode and cloud Vercel/Render deployments
export const getServerUrl = (): string => {
  const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isLan = isLocalOrLanHostname(currentHostname);

  // 1. If explicitly opened on a LAN IP / localhost, always connect to the LAN WebSocket server
  if (isLan) {
    const serverPort = import.meta.env.VITE_SERVER_PORT || '8080';
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${currentHostname}:${serverPort}`;
  }

  // 2. Otherwise (e.g. deployed on Vercel domain), use the configured production backend
  const configuredUrl = import.meta.env.VITE_GAME_SERVER_URL || import.meta.env.VITE_SERVER_URL;
  if (configuredUrl) {
    let url = configuredUrl.trim();
    if (url.startsWith('wss://')) {
      url = 'https://' + url.slice(6);
    } else if (url.startsWith('ws://')) {
      url = 'http://' + url.slice(5);
    }
    return url;
  }

  // Fallback default
  return `${window.location.protocol}//${window.location.hostname}:8080`;
};

// Create Socket.IO connection once (module scope — survives hot reload)
let globalSocket: Socket | null = null;

const getSocket = (): Socket => {
  if (!globalSocket || globalSocket.disconnected) {
    globalSocket = io(getServerUrl(), {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 10000,
      autoConnect: true,
    });
  }
  return globalSocket;
};

const SERVER_INTRO_MS = 3200;

export const App: React.FC = () => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Player State
  const [myPlayerId, setMyPlayerId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>('Operative_' + Math.floor(Math.random() * 900 + 100));
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [isReady, setIsReady] = useState<boolean>(false);
  const [hasJoined, setHasJoined] = useState<boolean>(false);

  // Spectator State
  const [spectateTargetId, setSpectateTargetId] = useState<string>('');

  // Countdown / Intro State
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [isInIntro, setIsInIntro] = useState<boolean>(false);
  const [introTeams, setIntroTeams] = useState<TeamInfo[]>([]);
  const [introMatchId, setIntroMatchId] = useState<string>('M-001');

  // Game Engine State
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [grid, setGrid] = useState<(string | null)[][]>([]);

  // Tournament / History State
  const [matchHistory, setMatchHistory] = useState<MatchHistoryRecord[]>([]);
  const [standings, setStandings] = useState<TournamentStanding[]>([]);

  // UI State
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [adminToken, setAdminToken] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isObserverMode, setIsObserverMode] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isHowToPlayOpen, setIsHowToPlayOpen] = useState<boolean>(false);
  const [isScoreboardOpen, setIsScoreboardOpen] = useState<boolean>(false);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // FPS tracking
  const [fps, setFps] = useState<number>(60);

  // Touch device check
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  const inputManagerRef = useRef<InputManager | null>(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  // FPS counter
  useEffect(() => {
    let last = performance.now();
    let frames = 0;
    let rafId: number;

    const loop = () => {
      frames++;
      const now = performance.now();
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Default selected team when available
  useEffect(() => {
    if (gameState?.availableTeams && gameState.availableTeams.length > 0 && !selectedTeam) {
      setSelectedTeam(gameState.availableTeams[0].id);
    }
  }, [gameState?.availableTeams, selectedTeam]);

  // Apply sound volume from settings
  useEffect(() => {
    SoundManager.setVolume(settings.soundVolume);
  }, [settings.soundVolume]);

  // ── Socket.IO Connection ─────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setErrorMsg(null);

      // Re-join lobby on reconnect if we had previously joined
      if (hasJoined && playerName) {
        socket.emit('JOIN_LOBBY', { name: playerName, teamId: selectedTeam || undefined });
      }
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason !== 'io client disconnect') {
        setIsReconnecting(true);
        setErrorMsg(`Connection lost — reconnecting...`);
      }
    });

    socket.on('connect_error', (err) => {
      setIsConnected(false);
      setIsReconnecting(true);
      setErrorMsg(`Connecting to server...`);
    });

    socket.io.on('reconnect', () => {
      setIsConnected(true);
      setIsReconnecting(false);
      setErrorMsg(null);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      setErrorMsg(`Reconnecting... (attempt ${attempt})`);
    });

    // ── Game Message Handlers ──────────────────────────────────
    socket.on('INIT_STATE', (msg: any) => {
      setMyPlayerId(msg.playerId);
      setGrid(msg.grid);
      const snapshot: GameStateSnapshot = msg.state;
      if (msg.hostInfo) {
        snapshot.hostInfo = msg.hostInfo;
      }
      setGameState(snapshot);
    });

    socket.on('TICK_UPDATE', (msg: any) => {
      setGameState(msg.state);
      if (msg.territoryDiffs && msg.territoryDiffs.length > 0) {
        setGrid((prevGrid) => {
          if (prevGrid.length === 0) return prevGrid;
          const newGrid = prevGrid.map((row: (string | null)[]) => [...row]);
          for (const diff of msg.territoryDiffs) {
            for (const [x, y] of diff.tiles) {
              if (newGrid[y] && newGrid[y][x] !== undefined) {
                newGrid[y][x] = diff.teamId;
              }
            }
          }
          return newGrid;
        });
      }
    });

    socket.on('TERRITORY_FULL_SYNC', (msg: any) => {
      setGrid(msg.grid);
    });

    socket.on('MATCH_INTRO', (msg: any) => {
      setIntroTeams(msg.teams);
      setIntroMatchId(msg.matchId);
      setIsInIntro(true);
      setTimeout(() => setIsInIntro(false), SERVER_INTRO_MS);
    });

    socket.on('MATCH_COUNTDOWN', (msg: any) => {
      setIsInIntro(false);
      setCountdownSeconds(msg.seconds);
      SoundManager.playCountdownTick(msg.seconds === 1);
    });

    socket.on('MATCH_STARTED', () => {
      setCountdownSeconds(0);
      setIsInIntro(false);
      SoundManager.playCountdownTick(true);
    });

    socket.on('KILL_FEED', () => {
      SoundManager.playDeath();
    });

    socket.on('TEAM_ELIMINATED', () => {
      SoundManager.playTeamEliminated();
    });

    socket.on('TERRITORY_CLAIM_ANIMATION', (msg: any) => {
      const isLarge = msg.tilesCount >= 20;
      SoundManager.playCapture(isLarge);
    });

    socket.on('MATCH_ENDED', (msg: any) => {
      setCountdownSeconds(0);
      setIsInIntro(false);
      setIsReady(false);
      SoundManager.playVictory();
      if (msg.historyRecord) {
        setMatchHistory((prev) => [msg.historyRecord, ...prev].slice(0, 20));
      }
    });

    socket.on('TOURNAMENT_STANDINGS', (msg: any) => {
      setStandings(msg.standings);
    });

    socket.on('MATCH_HISTORY', (msg: any) => {
      setMatchHistory(msg.records);
    });

    socket.on('ADMIN_AUTH_RESULT', (msg: any) => {
      if (msg.success) {
        setIsAdmin(true);
        setAdminToken(msg.message);
        setAuthError(null);
      } else {
        setAuthError(msg.message);
        setIsAdmin(false);
      }
    });

    socket.on('ERROR_MESSAGE', (msg: any) => {
      setErrorMsg(msg.message);
      setTimeout(() => setErrorMsg(null), 4000);
    });

    return () => {
      // Remove all listeners but keep socket connected (so reconnect works)
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('INIT_STATE');
      socket.off('TICK_UPDATE');
      socket.off('TERRITORY_FULL_SYNC');
      socket.off('MATCH_INTRO');
      socket.off('MATCH_COUNTDOWN');
      socket.off('MATCH_STARTED');
      socket.off('KILL_FEED');
      socket.off('TEAM_ELIMINATED');
      socket.off('TERRITORY_CLAIM_ANIMATION');
      socket.off('MATCH_ENDED');
      socket.off('TOURNAMENT_STANDINGS');
      socket.off('MATCH_HISTORY');
      socket.off('ADMIN_AUTH_RESULT');
      socket.off('ERROR_MESSAGE');
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup Input Manager
  useEffect(() => {
    inputManagerRef.current = new InputManager((direction: Direction) => {
      const socket = socketRef.current;
      if (socket && socket.connected) {
        socket.emit('SET_DIRECTION', { direction });
      }
    });

    return () => {
      inputManagerRef.current?.destroy();
    };
  }, []);

  const sendMsg = useCallback((type: string, payload?: Record<string, any>) => {
    const socket = socketRef.current;
    if (socket && socket.connected) {
      socket.emit(type, payload || {});
    }
  }, []);

  const handleJoin = () => {
    sendMsg('JOIN_LOBBY', { name: playerName, teamId: selectedTeam || undefined });
    setHasJoined(true);
    SoundManager.playJoin();
  };

  const handleCreateTeam = (teamName: string, colorIndex: number, symbol?: string) => {
    // If player hasn't joined yet, they'll be auto-joined on the server side
    sendMsg('CREATE_TEAM', { name: teamName, colorIndex, symbol });
    // Mark as joined so the UI updates
    setHasJoined(true);
    SoundManager.playReady();
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    if (hasJoined) {
      sendMsg('SELECT_TEAM', { teamId });
    }
  };

  const handleToggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    sendMsg('TOGGLE_READY');
    if (next) SoundManager.playReady();
  };

  const handleAdminLogin = (token: string) => {
    sendMsg('ADMIN_LOGIN', { token });
  };

  const handleAdminCommand = (
    command: 'START_MATCH' | 'PAUSE_MATCH' | 'RESUME_MATCH' | 'EMERGENCY_RESET' | 'END_MATCH' | 'FORCE_SHRINK' | 'KICK_PLAYER' | 'SIMULATE_BOTS' | 'CLEAR_BOTS' | 'CLEAR_HISTORY',
    targetId?: string
  ) => {
    sendMsg('ADMIN_COMMAND', { command, targetId, token: adminToken });
  };

  const handleJoystickDirection = useCallback((dir: Direction) => {
    sendMsg('SET_DIRECTION', { direction: dir });
  }, [sendMsg]);

  const isLobbyState = !gameState || gameState.status === 'LOBBY' || gameState.status === 'WAITING' || gameState.status === 'MATCH_END';

  // Observer mode
  if (isObserverMode && gameState) {
    return (
      <ObserverView
        gameState={gameState}
        grid={grid}
        onExit={() => setIsObserverMode(false)}
      />
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        maxWidth: '100vw',
        position: 'relative',
        overflow: isLobbyState ? 'auto' : 'hidden',
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Connection status banner */}
      {(errorMsg || isReconnecting) && (
        <div style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          background: isReconnecting ? 'rgba(255, 122, 0, 0.95)' : 'rgba(255, 42, 95, 0.95)',
          color: '#fff', padding: '6px 16px', borderRadius: '8px',
          zIndex: 999, fontWeight: 700, fontSize: '13px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)', width: 'max-content', maxWidth: 'calc(100vw - 32px)', textAlign: 'center',
          boxSizing: 'border-box',
        }}>
          {isReconnecting ? `⟳ ${errorMsg || 'Reconnecting...'}` : errorMsg}
        </div>
      )}

      {/* Initial connecting indicator */}
      {!isConnected && !isReconnecting && !errorMsg && (
        <div style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255, 122, 0, 0.9)', color: '#fff', padding: '5px 14px',
          borderRadius: '20px', zIndex: 999, fontWeight: 700, fontSize: '12px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          ⟳ Connecting to server...
        </div>
      )}

      {/* Main Screen */}
      {isLobbyState ? (
        <LobbyView
          playerName={playerName}
          setPlayerName={setPlayerName}
          selectedTeam={selectedTeam}
          setSelectedTeam={handleTeamChange}
          isReady={isReady}
          onToggleReady={handleToggleReady}
          onJoin={handleJoin}
          onCreateTeam={handleCreateTeam}
          hasJoined={hasJoined}
          gameState={gameState}
          onOpenAdmin={() => setIsAdminOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenHowToPlay={() => setIsHowToPlayOpen(true)}
          onOpenScoreboard={() => setIsScoreboardOpen(true)}
          onStartObserverMode={() => setIsObserverMode(true)}
          onStartPracticeMode={() => setIsHowToPlayOpen(true)}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          <GameCanvas
            gameState={gameState!}
            grid={grid}
            myPlayerId={myPlayerId}
            isAdmin={isAdmin}
            isObserverMode={false}
            settings={settings}
            spectateTargetId={spectateTargetId}
            onAutoSpectateTargetChange={(tid) => setSpectateTargetId(tid)}
          />

          <GameHUD
            gameState={gameState!}
            grid={grid}
            myPlayerId={myPlayerId}
            isAdmin={isAdmin}
            settings={settings}
            spectateTargetId={spectateTargetId}
            onSelectSpectateTarget={(tid) => setSpectateTargetId(tid)}
            fps={settings.showFpsPing ? fps : undefined}
            onOpenSettings={() => setIsSettingsOpen(true)}
          />

          {isTouchDevice && (
            <VirtualJoystick onDirectionChange={handleJoystickDirection} />
          )}
        </div>
      )}

      {/* Cinematic Intro Overlay */}
      {isInIntro && (
        <CountdownOverlay
          seconds={0}
          isIntro={true}
          introTeams={introTeams}
          matchId={introMatchId}
        />
      )}

      {/* 5-Second Countdown Overlay */}
      {!isInIntro && (countdownSeconds > 0 || gameState?.status === 'COUNTDOWN') && (
        <CountdownOverlay
          seconds={countdownSeconds || gameState?.countdownTimer || 5}
          isIntro={false}
        />
      )}

      {/* Victory Modal */}
      {gameState?.status === 'MATCH_END' && (
        <VictoryModal
          gameState={gameState}
          isAdmin={isAdmin}
          onResetMatch={() => handleAdminCommand('EMERGENCY_RESET')}
          onOpenAdmin={() => setIsAdminOpen(true)}
        />
      )}

      {/* Admin Panel */}
      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isAdmin={isAdmin}
        onLogin={handleAdminLogin}
        onSendCommand={handleAdminCommand}
        gameState={gameState}
        authError={authError}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
      />

      {/* How To Play Modal */}
      <HowToPlayModal
        isOpen={isHowToPlayOpen}
        onClose={() => setIsHowToPlayOpen(false)}
      />

      {/* Tournament Scoreboard Modal */}
      <ScoreboardModal
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
        standings={standings}
        matchHistory={matchHistory}
      />
    </div>
  );
};
