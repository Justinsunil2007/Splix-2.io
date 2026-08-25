import React, { useState } from 'react';
import { GameStateSnapshot, TeamInfo } from '../../../shared/types.js';
import { Shield, Play, RotateCcw, UserX, Zap, X, Pause, PlayCircle, Bot, Trash2 } from 'lucide-react';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  onLogin: (token: string) => void;
  onSendCommand: (command: 'START_MATCH' | 'PAUSE_MATCH' | 'RESUME_MATCH' | 'EMERGENCY_RESET' | 'END_MATCH' | 'FORCE_SHRINK' | 'KICK_PLAYER' | 'SIMULATE_BOTS' | 'CLEAR_BOTS' | 'CLEAR_HISTORY', targetId?: string) => void;
  gameState: GameStateSnapshot | null;
  authError: string | null;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  isAdmin,
  onLogin,
  onSendCommand,
  gameState,
  authError,
}) => {
  const [password, setPassword] = useState('');

  if (!isOpen) return null;

  const totalConnected = gameState?.players.length || 0;
  const readyCount = gameState?.readyCount || 0;

  const teamMap = new Map<string, TeamInfo>();
  if (gameState?.availableTeams) {
    gameState.availableTeams.forEach((t) => teamMap.set(t.id, t));
  }

  const getTeamInfo = (teamId: string) => {
    return teamMap.get(teamId) || {
      id: teamId,
      name: 'Squad',
      color: '#00d2ff',
      symbol: '🛡️',
    };
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    onLogin(password);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 600,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '720px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255, 42, 95, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={24} color="#ff2a5f" />
            <h2 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Splix 2.io Tournament Director Console
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="glass-button"
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Login Form (if not logged in) */}
        {!isAdmin ? (
          <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
              Enter the Tournament Director secret key to access match commands and player controls.
            </p>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
                ORGANIZER SECRET KEY
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password..."
                style={{
                  width: '100%',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              {authError && (
                <div style={{ color: '#ff2a5f', fontSize: '13px', marginTop: '6px', fontWeight: 600 }}>
                  {authError}
                </div>
              )}
            </div>

            <button type="submit" className="glass-button primary" style={{ padding: '12px', fontSize: '15px' }}>
              AUTHENTICATE AS ORGANIZER
            </button>
          </form>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Real-time Network & Tournament Status Card */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '10px',
                background: 'rgba(0, 0, 0, 0.3)',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NETWORK MODE</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: gameState?.hostInfo?.mode === 'ONLINE' ? '#00d2ff' : '#00ff88' }}>
                  {gameState?.hostInfo?.mode || (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && !window.location.hostname.includes('vercel') ? 'LAN' : 'ONLINE')}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SERVER STATUS</div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#00ff88' }}>ONLINE (ACTIVE)</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>MATCH STATUS</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#00d2ff' }}>{gameState?.status}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PLAYERS CONNECTED</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#00ff88' }}>{totalConnected}/30</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>PLAYERS READY</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#ffd600' }}>{readyCount}/{totalConnected}</div>
              </div>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>TICK RATE</div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#b026ff' }}>{gameState?.serverTickRate || 20} Hz</div>
              </div>
            </div>

            {/* LAN Joining Banner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                background: 'rgba(0, 210, 255, 0.08)',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', color: '#00d2ff', fontWeight: 700 }}>LAN PLAYER JOIN URL:</div>
                <div style={{ fontSize: '13px', fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 700 }}>
                  {typeof window !== 'undefined' ? window.location.origin : 'http://<HOST_IP>:5173'}
                </div>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Port: <span style={{ color: '#00ff88', fontFamily: 'var(--font-mono)' }}>{gameState?.hostInfo?.serverPort || 8080}</span>
              </div>
            </div>

            {/* Match Controls Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <button
                type="button"
                onClick={() => onSendCommand('START_MATCH')}
                disabled={gameState?.status !== 'LOBBY'}
                className="glass-button primary"
                style={{ padding: '12px', fontSize: '13px' }}
              >
                <Play size={16} />
                LAUNCH MATCH (5s COUNTDOWN)
              </button>

              {gameState?.isPaused ? (
                <button
                  type="button"
                  onClick={() => onSendCommand('RESUME_MATCH')}
                  className="glass-button"
                  style={{ padding: '12px', fontSize: '13px', borderColor: '#00ff88', color: '#00ff88' }}
                >
                  <PlayCircle size={16} color="#00ff88" />
                  RESUME GAMEPLAY
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onSendCommand('PAUSE_MATCH')}
                  disabled={gameState?.status === 'LOBBY' || gameState?.status === 'MATCH_END'}
                  className="glass-button"
                  style={{ padding: '12px', fontSize: '13px', borderColor: '#ffd600', color: '#ffd600' }}
                >
                  <Pause size={16} color="#ffd600" />
                  EMERGENCY PAUSE
                </button>
              )}

              <button
                type="button"
                onClick={() => onSendCommand('FORCE_SHRINK')}
                disabled={gameState?.status === 'LOBBY' || gameState?.status === 'MATCH_END'}
                className="glass-button"
                style={{ padding: '12px', fontSize: '13px', borderColor: '#00d2ff', color: '#00d2ff' }}
              >
                <Zap size={16} color="#00d2ff" />
                TRIGGER ZONE SHRINK
              </button>

              <button
                type="button"
                onClick={() => onSendCommand('EMERGENCY_RESET')}
                className="glass-button danger"
                style={{ padding: '12px', fontSize: '13px' }}
              >
                <RotateCcw size={16} />
                EMERGENCY RESET TO LOBBY
              </button>
            </div>

            {/* Simulated 25-Player Stress Test Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: 'rgba(176, 38, 255, 0.1)',
                border: '1px solid rgba(176, 38, 255, 0.3)',
                borderRadius: '8px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div>
                <div style={{ fontWeight: 800, fontSize: '13px', color: '#b026ff' }}>
                  🤖 25-Player Tournament Stress Simulator
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Populates 5 squads x 5 bots for dry-run performance testing.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => onSendCommand('SIMULATE_BOTS')}
                  className="glass-button"
                  style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#b026ff', color: '#b026ff' }}
                >
                  <Bot size={14} /> SPAWN 25 BOTS
                </button>
                <button
                  type="button"
                  onClick={() => onSendCommand('CLEAR_BOTS')}
                  className="glass-button"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  CLEAR BOTS
                </button>
              </div>
            </div>

            {/* Connected Operatives Roster */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
                  ROSTER &amp; PING MONITOR ({gameState?.players.length || 0})
                </div>
                <button
                  type="button"
                  onClick={() => onSendCommand('CLEAR_HISTORY')}
                  className="glass-button"
                  style={{ padding: '4px 8px', fontSize: '11px' }}
                >
                  <Trash2 size={12} /> CLEAR STANDINGS
                </button>
              </div>

              <div
                style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  background: 'rgba(0,0,0,0.4)',
                  borderRadius: '8px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                }}
              >
                {gameState?.players.map((p) => {
                  const tInfo = getTeamInfo(p.teamId);
                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '13px',
                        padding: '6px 10px',
                        background: 'rgba(255,255,255,0.03)',
                        borderRadius: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <span style={{ color: tInfo.color, fontSize: '15px' }}>{tInfo.symbol}</span>
                        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({tInfo.name})</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '11px', color: (p.ping || 25) < 80 ? '#00ff88' : '#ffd600', fontFamily: 'var(--font-mono)' }}>
                          {p.ping || 25}ms
                        </span>
                        <span style={{ fontSize: '11px', color: p.isReady ? '#00ff88' : '#ff2a5f', fontWeight: 700 }}>
                          {p.isReady ? 'READY' : 'NOT READY'}
                        </span>
                        <button
                          type="button"
                          onClick={() => onSendCommand('KICK_PLAYER', p.id)}
                          className="glass-button"
                          style={{ padding: '3px 8px', fontSize: '11px', color: '#ff2a5f' }}
                        >
                          <UserX size={12} />
                          KICK
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
