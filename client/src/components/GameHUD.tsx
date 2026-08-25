import React, { useState, useEffect, useRef } from 'react';
import { GameStateSnapshot, TeamInfo, KillEvent } from '../../../shared/types.js';
import { Minimap } from './Minimap.js';
import { Clock, ShieldAlert, Skull, Eye, ChevronLeft, ChevronRight, Wifi, Gauge, Sliders } from 'lucide-react';
import { UserSettings } from './SettingsModal.js';

interface GameHUDProps {
  gameState: GameStateSnapshot;
  grid: (string | null)[][];
  myPlayerId: string;
  isAdmin?: boolean;
  settings?: UserSettings;
  spectateTargetId?: string;
  onSelectSpectateTarget?: (targetId: string) => void;
  fps?: number;
  onOpenSettings?: () => void;
}

interface ClaimToast {
  id: string;
  message: string;
  color: string;
  pct: number;
  timestamp: number;
}

interface KillStreakToast {
  id: string;
  message: string;
  color: string;
  timestamp: number;
}

const KILL_STREAK_MESSAGES: Record<number, string> = {
  2: '⚡ DOUBLE ELIMINATION',
  3: '🔥 TRIPLE THREAT',
  4: '💥 SQUAD WRECKER',
  5: '☠️ UNTOUCHABLE',
  6: '👑 TERRITORY KING',
};

export const GameHUD: React.FC<GameHUDProps> = ({
  gameState,
  grid,
  myPlayerId,
  isAdmin = false,
  settings,
  spectateTargetId,
  onSelectSpectateTarget,
  fps,
  onOpenSettings,
}) => {
  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  const [claimToasts, setClaimToasts] = useState<ClaimToast[]>([]);
  const [killStreakToast, setKillStreakToast] = useState<KillStreakToast | null>(null);
  const prevKillsRef = useRef<number>(0);
  const prevKillFeedRef = useRef<KillEvent[]>([]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Kill streak detection
  useEffect(() => {
    if (!myPlayer) return;
    const myKills = myPlayer.kills;
    if (myKills > prevKillsRef.current && myKills >= 2) {
      const msg = KILL_STREAK_MESSAGES[myKills];
      if (msg) {
        const myTeam = gameState.availableTeams?.find((t) => t.id === myPlayer.teamId);
        setKillStreakToast({
          id: `streak-${Date.now()}`,
          message: msg,
          color: myTeam?.color || '#00d2ff',
          timestamp: Date.now(),
        });
        setTimeout(() => setKillStreakToast(null), 2800);
      }
    }
    prevKillsRef.current = myKills;
  }, [myPlayer?.kills]);

  // Kill feed announcements
  useEffect(() => {
    const kills = gameState.recentKills;
    const prev = prevKillFeedRef.current;
    if (kills.length > prev.length) {
      const newKill = kills[0];
      if (newKill && newKill.killerId !== 'WORLD' && newKill.killerTeam === myPlayer?.teamId) {
        const msg = `${newKill.reason === 'TRAIL_CUT' ? '🔪 Trail Cut' : '💥 Eliminated'}: ${newKill.victimName}`;
        const myTeam = gameState.availableTeams?.find((t) => t.id === myPlayer?.teamId);
        const toast: ClaimToast = {
          id: `kill-${Date.now()}`,
          message: msg,
          color: myTeam?.color || '#ff2a5f',
          pct: 0,
          timestamp: Date.now(),
        };
        setClaimToasts((prev) => [toast, ...prev].slice(0, 3));
        setTimeout(() => {
          setClaimToasts((prev) => prev.filter((t) => t.id !== toast.id));
        }, 2500);
      }
    }
    prevKillFeedRef.current = kills;
  }, [gameState.recentKills.length]);

  const teamMap = new Map<string, TeamInfo>();
  if (gameState?.availableTeams) {
    gameState.availableTeams.forEach((t) => teamMap.set(t.id, t));
  }

  const getTeamInfo = (teamId: string | null): TeamInfo => {
    if (!teamId) {
      return { id: '', name: 'Neutral', color: '#8a99ad', trailColor: '#8a99ad', glowColor: '#8a99ad', secondaryColor: '#3a4454', symbol: '🏳️' };
    }
    return teamMap.get(teamId) || { id: teamId, name: 'Squad', color: '#00d2ff', trailColor: '#00d2ff', glowColor: '#00d2ff', secondaryColor: '#005580', symbol: '🛡️' };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isZoneWarning = !myPlayer?.isInSafeZone && myPlayer?.isAlive;
  const isSpectating = (myPlayer && !myPlayer.isAlive) || isAdmin;
  const alivePlayers = gameState.players.filter((p) => p.isAlive);
  const spectatedPlayer = gameState.players.find((p) => p.id === spectateTargetId) || alivePlayers[0];
  const myTeamInfo = getTeamInfo(myPlayer?.teamId || null);

  const zonePhaseLabel = (() => {
    const phase = gameState.zone?.shrinkPhase || 0;
    if (phase === 0) return 'PHASE 1 (100%)';
    if (phase === 1) return 'PHASE 2 (75%)';
    if (phase === 2) return 'PHASE 3 (50%)';
    return 'PHASE 4 — FINAL';
  })();

  const handleNextSpectate = () => {
    if (alivePlayers.length === 0) return;
    const currentIndex = alivePlayers.findIndex((p) => p.id === spectatedPlayer?.id);
    const nextIndex = (currentIndex + 1) % alivePlayers.length;
    onSelectSpectateTarget?.(alivePlayers[nextIndex].id);
  };

  const handlePrevSpectate = () => {
    if (alivePlayers.length === 0) return;
    const currentIndex = alivePlayers.findIndex((p) => p.id === spectatedPlayer?.id);
    const prevIndex = (currentIndex - 1 + alivePlayers.length) % alivePlayers.length;
    onSelectSpectateTarget?.(alivePlayers[prevIndex].id);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>

      {/* ═══ PAUSE BANNER ═══ */}
      {gameState.isPaused && (
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          background: 'rgba(255, 214, 0, 0.95)', color: '#060810', padding: '12px 30px', borderRadius: '8px',
          fontSize: isMobile ? '15px' : '22px', fontWeight: 900, letterSpacing: '2px', zIndex: 100,
          boxShadow: '0 0 40px rgba(255,214,0,0.6)', textAlign: 'center', width: '90%', maxWidth: '500px',
        }}>
          ⏸ MATCH PAUSED
        </div>
      )}

      {/* ═══ TOP CENTER: Timer + Zone Phase + Settings ═══ */}
      <div style={{
        position: 'absolute', top: isMobile ? '8px' : '16px', left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', zIndex: 60,
        pointerEvents: 'auto',
      }}>
        <div className="glass-panel" style={{
          padding: isMobile ? '4px 10px' : '6px 16px', display: 'flex', alignItems: 'center', gap: '8px',
          borderColor: gameState.timer < 60 ? 'rgba(255, 42, 95, 0.5)' : undefined,
          background: 'rgba(5, 8, 16, 0.85)', backdropFilter: 'blur(8px)',
        }}>
          <Clock size={isMobile ? 14 : 18} color={gameState.timer < 60 ? '#ff2a5f' : '#00d2ff'} />
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: isMobile ? '16px' : '22px', fontWeight: 800,
            color: gameState.timer < 60 ? '#ff2a5f' : '#ffffff', letterSpacing: '1px',
          }}>
            {formatTime(gameState.timer)}
          </span>
          {gameState.matchId && (
            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>
              {gameState.matchId}
            </span>
          )}

          {/* Clean Prominent Settings Button */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="glass-button"
              style={{
                padding: isMobile ? '3px 7px' : '4px 10px',
                fontSize: '11px',
                marginLeft: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(0, 210, 255, 0.15)',
                borderColor: '#00d2ff',
                color: '#ffffff',
                cursor: 'pointer',
              }}
              title="Game Settings"
            >
              <Sliders size={isMobile ? 12 : 14} color="#00d2ff" />
              <span style={{ fontSize: isMobile ? '10px' : '11px', fontWeight: 700 }}>
                {isMobile ? 'SET' : 'SETTINGS'}
              </span>
            </button>
          )}
        </div>

        {/* Zone Phase Indicator */}
        {(gameState.status === 'ZONE_SHRINKING' || gameState.status === 'ENDGAME') && (
          <div style={{
            background: gameState.status === 'ENDGAME' ? 'rgba(255, 42, 95, 0.25)' : 'rgba(255, 122, 0, 0.2)',
            border: `1px solid ${gameState.status === 'ENDGAME' ? '#ff2a5f' : '#ff7a00'}`,
            padding: isMobile ? '2px 8px' : '3px 12px', borderRadius: '20px',
            fontSize: isMobile ? '9px' : '11px', fontWeight: 800,
            color: gameState.status === 'ENDGAME' ? '#ff2a5f' : '#ff7a00',
            animation: 'neon-pulse 1.5s infinite', whiteSpace: 'nowrap',
          }}>
            ⚡ {isMobile ? 'ZONE' : zonePhaseLabel}
          </div>
        )}
      </div>

      {/* ═══ TOP LEFT: Squad Dominance Panel ═══ */}
      <div className="glass-panel" style={{
        position: 'absolute', top: isMobile ? '8px' : '16px', left: isMobile ? '8px' : '16px',
        padding: isMobile ? '6px 8px' : '12px 16px', minWidth: isMobile ? '100px' : '220px',
        maxWidth: isMobile ? '125px' : '250px', display: 'flex', flexDirection: 'column',
        gap: isMobile ? '3px' : '8px', zIndex: 10,
        maxHeight: isMobile ? '130px' : 'none', overflowY: isMobile ? 'auto' : 'visible',
      }}>
        <div style={{ fontSize: isMobile ? '9px' : '11px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '1px' }}>
          {isMobile ? 'SQUADS' : `SQUADS · ${alivePlayers.length} ALIVE`}
        </div>

        {gameState.teams.filter((t) => t.totalPlayers > 0).map((t) => {
          const teamInfo = getTeamInfo(t.id);
          const isMyTeam = myPlayer?.teamId === t.id;

          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontSize: isMobile ? '10px' : '13px', opacity: t.isEliminated ? 0.3 : 1, gap: '4px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                <span style={{ fontSize: isMobile ? '11px' : '14px', flexShrink: 0 }}>{teamInfo.symbol || '🛡️'}</span>
                <span style={{
                  fontWeight: isMyTeam ? 800 : 600, color: isMyTeam ? '#ffffff' : '#cfd8e3',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {t.name.split(' ')[0]}
                  {isMyTeam && ' ★'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>
                {!isMobile && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{t.territoryPercentage}%</span>}
                {t.isEliminated ? (
                  <span style={{ fontSize: isMobile ? '8px' : '11px', color: '#ff2a5f', fontWeight: 700 }}>
                    {isMobile ? '✗' : 'ELIM'}
                  </span>
                ) : (
                  <span style={{ color: '#00ff88', fontWeight: 700, fontSize: isMobile ? '10px' : '12px' }}>
                    {t.aliveCount}{!isMobile && '/' + t.totalPlayers}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ TOP RIGHT: Kill Feed ═══ */}
      {!isMobile && (
        <div style={{
          position: 'absolute', top: '16px', right: '16px',
          display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', zIndex: 10,
        }}>
          {gameState.recentKills.slice(0, 5).map((k, idx) => {
            const killerInfo = getTeamInfo(k.killerTeam);
            const victimInfo = getTeamInfo(k.victimTeam);
            const reasonIcon = k.reason === 'TRAIL_CUT' ? '🔪' : k.reason === 'ZONE_DEATH' ? '⚡' : k.reason === 'SELF_COLLISION' ? '💀' : '⚔️';
            return (
              <div key={k.timestamp + '-' + idx} className="glass-panel" style={{
                padding: '5px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                background: 'rgba(10, 15, 25, 0.75)', animation: idx === 0 ? 'fadeIn 0.3s ease' : undefined,
              }}>
                {k.streak && k.streak >= 2 && <span style={{ color: '#ffd600', fontSize: '11px' }}>x{k.streak}</span>}
                <span style={{ color: killerInfo.color, fontWeight: 700 }}>{k.killerName}</span>
                <span>{reasonIcon}</span>
                <Skull size={11} color="#ff2a5f" />
                <span style={{ color: victimInfo.color, fontWeight: 700 }}>{k.victimName}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ KILL STREAK TOAST ═══ */}
      {killStreakToast && (
        <div style={{
          position: 'absolute', top: '35%', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.85)', border: `2px solid ${killStreakToast.color}`,
          boxShadow: `0 0 30px ${killStreakToast.color}`, borderRadius: '10px',
          padding: '10px 24px', fontSize: isMobile ? '16px' : '24px', fontWeight: 900,
          color: killStreakToast.color, whiteSpace: 'nowrap', zIndex: 40,
          animation: 'fadeIn 0.2s ease', textAlign: 'center', letterSpacing: '1px',
        }}>
          {killStreakToast.message}
        </div>
      )}

      {/* ═══ TERRITORY CLAIM TOASTS ═══ */}
      <div style={{
        position: 'absolute', right: isMobile ? '8px' : '20px', bottom: isMobile ? '170px' : '100px',
        display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', zIndex: 30,
        pointerEvents: 'none',
      }}>
        {claimToasts.map((toast) => (
          <div key={toast.id} style={{
            background: 'rgba(0,0,0,0.75)', border: `1px solid ${toast.color}`,
            borderRadius: '8px', padding: '4px 10px', fontSize: '11px',
            fontWeight: 700, color: toast.color, animation: 'fadeIn 0.2s ease', whiteSpace: 'nowrap',
          }}>
            {toast.message}
          </div>
        ))}
      </div>

      {/* ═══ MINIMAP ═══ */}
      <div style={{ position: 'absolute', bottom: isMobile ? '20px' : '16px', left: isMobile ? '8px' : '16px', zIndex: 10 }}>
        <Minimap gameState={gameState} grid={grid} myPlayerId={myPlayerId} />
      </div>

      {/* ═══ FPS / PING OVERLAY ═══ */}
      {settings?.showFpsPing && (
        <div style={{
          position: 'absolute', bottom: isMobile ? '20px' : '16px', right: isMobile ? '180px' : '16px',
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', zIndex: 10,
        }}>
          {fps !== undefined && (
            <div className="glass-panel" style={{ padding: '3px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: fps < 30 ? '#ff2a5f' : '#00ff88' }}>
              <Gauge size={11} style={{ display: 'inline', marginRight: '4px' }} />
              {fps} FPS
            </div>
          )}
          {myPlayer?.ping !== undefined && (
            <div className="glass-panel" style={{ padding: '3px 8px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: myPlayer.ping > 100 ? '#ff2a5f' : '#00d2ff' }}>
              <Wifi size={11} style={{ display: 'inline', marginRight: '4px' }} />
              {myPlayer.ping}ms
            </div>
          )}
        </div>
      )}

      {/* ═══ SPECTATOR SWITCHER ═══ */}
      {isSpectating && spectatedPlayer && (
        <div className="glass-panel" style={{
          position: 'absolute', bottom: isMobile ? '20px' : '20px', left: '50%', transform: 'translateX(-50%)',
          padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '10px',
          pointerEvents: 'auto', zIndex: 50, boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
        }}>
          <button type="button" onClick={handlePrevSpectate} className="glass-button" style={{ padding: '5px', borderRadius: '50%' }}>
            <ChevronLeft size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Eye size={14} color="#00d2ff" />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                SPECTATING · {alivePlayers.length} ALIVE
              </div>
              <div style={{ fontSize: '12px', fontWeight: 800, color: getTeamInfo(spectatedPlayer.teamId).color }}>
                {spectatedPlayer.name} ({getTeamInfo(spectatedPlayer.teamId).name})
              </div>
            </div>
          </div>

          <button type="button" onClick={handleNextSpectate} className="glass-button" style={{ padding: '5px', borderRadius: '50%' }}>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* ═══ BOTTOM RIGHT: Player Stats ═══ */}
      {myPlayer && !isMobile && !isSpectating && (
        <div className="glass-panel" style={{
          position: 'absolute', bottom: '16px', right: '16px',
          padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '4px',
          alignItems: 'flex-end', zIndex: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>{myTeamInfo.symbol}</span>
            <div style={{ fontSize: '15px', fontWeight: 800, color: myTeamInfo.color }}>{myPlayer.name}</div>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Score: <strong style={{ color: '#ffffff' }}>{myPlayer.score}</strong>
            {' | '}
            Kills: <strong style={{ color: '#ff2a5f' }}>{myPlayer.kills}</strong>
          </div>
        </div>
      )}

      {/* ═══ ZONE DANGER BANNER ═══ */}
      {isZoneWarning && (
        <div style={{
          position: 'absolute', bottom: isMobile ? '180px' : '80px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255, 42, 95, 0.9)', color: '#ffffff',
          padding: isMobile ? '5px 12px' : '8px 24px', borderRadius: '8px',
          fontSize: isMobile ? '10px' : '14px', fontWeight: 800,
          display: 'flex', alignItems: 'center', gap: '6px',
          boxShadow: '0 0 20px rgba(255, 42, 95, 0.8)', animation: 'neon-pulse 0.8s infinite',
          whiteSpace: 'nowrap', zIndex: 20,
        }}>
          <ShieldAlert size={isMobile ? 13 : 18} />
          {isMobile ? 'OUTSIDE SAFE ZONE!' : 'OUTSIDE SAFE ZONE! RETURN IMMEDIATELY!'}
        </div>
      )}
    </div>
  );
};
