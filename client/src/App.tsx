import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const getWsUrl = () => {
  if (import.meta.env.VITE_GAME_SERVER_URL) {
    return import.meta.env.VITE_GAME_SERVER_URL;
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.hostname}:8080`;
};

export const App: React.FC = () => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const fpsRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(0);

  // Touch device check
  const [isTouchDevice, setIsTouchDevice] = useState<boolean>(false);

  const inputManagerRef = useRef<InputManager | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

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

  // Set default selected team if available and none selected yet
  useEffect(() => {
    if (gameState?.availableTeams && gameState.availableTeams.length > 0 && !selectedTeam) {
      setSelectedTeam(gameState.availableTeams[0].id);
    }
  }, [gameState?.availableTeams, selectedTeam]);

  // Apply sound volume from settings
  useEffect(() => {
    SoundManager.setVolume(settings.soundVolume);
  }, [settings.soundVolume]);

  // Connect WebSocket with auto-reconnect
  useEffect(() => {
    let destroyed = false;
    let retryCount = 0;
    const MAX_RETRIES = 20;
    const BASE_DELAY_MS = 1500;

    const connect = () => {
      if (destroyed) return;
      const wsUrl = getWsUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setIsReconnecting(false);
        setErrorMsg(null);
        retryCount = 0;
        setSocket(ws);
        // Re-join lobby if we had already joined before disconnect
        if (hasJoined && playerName) {
          const msg: ClientMessage = { type: 'JOIN_LOBBY', name: playerName, teamId: selectedTeam || undefined };
          ws.send(JSON.stringify(msg));
        }
      };

      ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          handleServerMessage(msg);
        } catch (e) {
          console.error('Failed to parse server message', e);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        setSocket(null);
        socketRef.current = null;
        if (destroyed) return;
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          const delay = Math.min(BASE_DELAY_MS * retryCount, 15000);
          setIsReconnecting(true);
          setErrorMsg(`Connection lost — reconnecting... (attempt ${retryCount})`);
          reconnectTimerRef.current = setTimeout(connect, delay);
        } else {
          setIsReconnecting(false);
          setErrorMsg('Unable to reconnect. Please refresh the page.');
        }
      };

      ws.onerror = () => {
        // onerror always fires before onclose — let onclose handle retry
        setIsConnected(false);
      };
    };

    connect();

    return () => {
      destroyed = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      socketRef.current?.close();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Setup Input Manager
  useEffect(() => {
    inputManagerRef.current = new InputManager((direction: Direction) => {
      const ws = socketRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        const msg: ClientMessage = { type: 'SET_DIRECTION', direction };
        ws.send(JSON.stringify(msg));
      }
    });

    return () => {
      inputManagerRef.current?.destroy();
    };
  }, []);

  const handleServerMessage = useCallback((msg: ServerMessage) => {
    switch (msg.type) {
      case 'INIT_STATE': {
        setMyPlayerId(msg.playerId);
        setGrid(msg.grid);
        setGameState(msg.state);
        break;
      }

      case 'TICK_UPDATE': {
        setGameState(msg.state);
        if (msg.territoryDiffs && msg.territoryDiffs.length > 0) {
          setGrid((prevGrid) => {
            if (prevGrid.length === 0) return prevGrid;
            const newGrid = prevGrid.map((row) => [...row]);
            for (const diff of msg.territoryDiffs!) {
              for (const [x, y] of diff.tiles) {
                if (newGrid[y] && newGrid[y][x] !== undefined) {
                  newGrid[y][x] = diff.teamId;
                }
              }
            }
            return newGrid;
          });
        }
        break;
      }

      case 'TERRITORY_FULL_SYNC': {
        setGrid(msg.grid);
        break;
      }

      case 'MATCH_INTRO': {
        setIntroTeams(msg.teams);
        setIntroMatchId(msg.matchId);
        setIsInIntro(true);
        // Intro clears after 3 seconds (handled server-side)
        setTimeout(() => setIsInIntro(false), SERVER_INTRO_MS);
        break;
      }

      case 'MATCH_COUNTDOWN': {
        setIsInIntro(false);
        setCountdownSeconds(msg.seconds);
        SoundManager.playCountdownTick(msg.seconds === 1);
        break;
      }

      case 'MATCH_STARTED': {
        setCountdownSeconds(0);
        setIsInIntro(false);
        SoundManager.playCountdownTick(true);
        break;
      }

      case 'MATCH_PAUSED': {
        // Game state update handles visual via isPaused flag
        break;
      }

      case 'MATCH_RESUMED': {
        break;
      }

      case 'KILL_FEED': {
        SoundManager.playDeath();
        break;
      }

      case 'TEAM_ELIMINATED': {
        SoundManager.playTeamEliminated();
        break;
      }

      case 'TERRITORY_CLAIM_ANIMATION': {
        // Territory claim notif handled within GameHUD via score changes
        const isLarge = msg.tilesCount >= 20;
        SoundManager.playCapture(isLarge);
        break;
      }

      case 'MATCH_ENDED': {
        setCountdownSeconds(0);
        setIsInIntro(false);
        setIsReady(false);
        SoundManager.playVictory();
        if (msg.historyRecord) {
          setMatchHistory((prev) => [msg.historyRecord, ...prev].slice(0, 20));
        }
        break;
      }

      case 'TOURNAMENT_STANDINGS': {
        setStandings(msg.standings);
        break;
      }

      case 'MATCH_HISTORY': {
        setMatchHistory(msg.records);
        break;
      }

      case 'ADMIN_AUTH_RESULT': {
        if (msg.success) {
          setIsAdmin(true);
          setAdminToken(msg.message); // Server returns session token in message field
          setAuthError(null);
        } else {
          setAuthError(msg.message);
          setIsAdmin(false);
        }
        break;
      }

      case 'ERROR_MESSAGE': {
        setErrorMsg(msg.message);
        setTimeout(() => setErrorMsg(null), 4000);
        break;
      }
    }
  }, []);

  const sendMsg = useCallback((msg: ClientMessage) => {
    const ws = socketRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  const handleJoin = () => {
    sendMsg({ type: 'JOIN_LOBBY', name: playerName, teamId: selectedTeam || undefined });
    setHasJoined(true);
    SoundManager.playJoin();
  };

  const handleCreateTeam = (teamName: string, colorIndex: number, symbol?: string) => {
    sendMsg({ type: 'CREATE_TEAM', name: teamName, colorIndex, symbol });
    SoundManager.playReady();
  };

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId);
    if (hasJoined) {
      sendMsg({ type: 'SELECT_TEAM', teamId });
    }
  };

  const handleToggleReady = () => {
    const next = !isReady;
    setIsReady(next);
    sendMsg({ type: 'TOGGLE_READY' });
    if (next) SoundManager.playReady();
  };

  const handleAdminLogin = (token: string) => {
    sendMsg({ type: 'ADMIN_LOGIN', token });
  };

  const handleAdminCommand = (
    command: 'START_MATCH' | 'PAUSE_MATCH' | 'RESUME_MATCH' | 'EMERGENCY_RESET' | 'END_MATCH' | 'FORCE_SHRINK' | 'KICK_PLAYER' | 'SIMULATE_BOTS' | 'CLEAR_BOTS' | 'CLEAR_HISTORY',
    targetId?: string
  ) => {
    sendMsg({ type: 'ADMIN_COMMAND', command, targetId, token: adminToken });
  };

  const handleJoystickDirection = useCallback((dir: Direction) => {
    sendMsg({ type: 'SET_DIRECTION', direction: dir });
  }, [sendMsg]);

  const isLobbyState = !gameState || gameState.status === 'LOBBY' || gameState.status === 'WAITING' || gameState.status === 'MATCH_END';

  // Observer mode: show full arena projector view
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

      {/* Global Error / Reconnecting Banner */}
      {(errorMsg || isReconnecting) && (
        <div style={{
          position: 'fixed', top: '12px', left: '50%', transform: 'translateX(-50%)',
          background: isReconnecting ? 'rgba(255, 122, 0, 0.95)' : 'rgba(255, 42, 95, 0.95)',
          color: '#fff', padding: '6px 16px', borderRadius: '8px',
          zIndex: 999, fontWeight: 700, fontSize: '13px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.5)', width: 'max-content', maxWidth: 'calc(100vw - 32px)', textAlign: 'center',
          animation: isReconnecting ? 'neon-pulse 1.5s infinite' : undefined,
          boxSizing: 'border-box',
        }}>
          {isReconnecting ? `⟳ ${errorMsg || 'Reconnecting...'}` : errorMsg}
        </div>
      )}

      {/* Initial connecting indicator (first load) */}
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

      {/* Main Screen Switcher */}
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
          onStartPracticeMode={() => {
            // Practice mode: show how to play
            setIsHowToPlayOpen(true);
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
          {/* Game Canvas */}
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

          {/* Game HUD */}
          <GameHUD
            gameState={gameState!}
            grid={grid}
            myPlayerId={myPlayerId}
            isAdmin={isAdmin}
            settings={settings}
            spectateTargetId={spectateTargetId}
            onSelectSpectateTarget={(tid) => setSpectateTargetId(tid)}
            fps={settings.showFpsPing ? fps : undefined}
          />

          {/* Mobile Virtual Joystick */}
          {isTouchDevice && (
            <VirtualJoystick onDirectionChange={handleJoystickDirection} />
          )}

          {/* In-game settings shortcut */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            style={{
              position: 'absolute', top: '16px', left: '50%', marginLeft: '-50px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              zIndex: 10, pointerEvents: 'auto', opacity: 0.4, fontSize: '12px', color: '#fff',
            }}
          >
            ⚙ settings
          </button>
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

      {/* Admin Panel Modal */}
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

const SERVER_INTRO_MS = 3200; // Should match server INTRO_SECONDS + buffer
