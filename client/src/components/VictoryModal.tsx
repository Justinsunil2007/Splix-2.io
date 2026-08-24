import React from 'react';
import { GameStateSnapshot, TeamInfo } from '../../../shared/types.js';
import { Trophy, RotateCcw } from 'lucide-react';

interface VictoryModalProps {
  gameState: GameStateSnapshot;
  onResetMatch: () => void;
  isAdmin: boolean;
  onOpenAdmin?: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ gameState, onResetMatch, isAdmin, onOpenAdmin }) => {
  const winnerTeamId = gameState.winnerTeam || '';
  const teamMap = new Map<string, TeamInfo>();
  if (gameState?.availableTeams) {
    gameState.availableTeams.forEach((t) => teamMap.set(t.id, t));
  }

  const winnerInfo = teamMap.get(winnerTeamId) || {
    id: winnerTeamId,
    name: 'Victory Squad',
    color: '#00d2ff',
    trailColor: '#00d2ff',
    glowColor: 'rgba(0, 210, 255, 0.5)',
    secondaryColor: '#005580',
    symbol: '👑',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '540px',
          padding: '36px 28px',
          textAlign: 'center',
          border: `2px solid ${winnerInfo.color}`,
          boxShadow: `0 0 40px ${winnerInfo.glowColor}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 214, 0, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #ffd600',
          }}
        >
          <Trophy size={36} color="#ffd600" />
        </div>

        <div>
          <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-muted)', letterSpacing: '2px' }}>
            MATCH COMPLETE — VICTORY
          </div>
          <h2
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: winnerInfo.color,
              marginTop: '4px',
              textTransform: 'uppercase',
            }}
          >
            {winnerInfo.name}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '6px' }}>
            Dominant territory capture and last surviving team standing!
          </p>
        </div>

        {/* Team Score Breakdown */}
        <div
          style={{
            width: '100%',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {gameState.teams
            .sort((a, b) => b.territoryPercentage - a.territoryPercentage)
            .map((t, idx) => {
              const info = teamMap.get(t.id);
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: 'var(--text-muted)', width: '16px' }}>#{idx + 1}</span>
                    <span style={{ color: info?.color || t.color, fontWeight: 700 }}>{info?.name || t.name}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700 }}>{t.territoryPercentage}% area</div>
                </div>
              );
            })}
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            type="button"
            onClick={onResetMatch}
            className="glass-button primary"
            style={{ width: '100%', padding: '14px', fontSize: '16px' }}
          >
            <RotateCcw size={18} />
            RESET &amp; RETURN TO LOBBY
          </button>
          {onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="glass-button"
              style={{ width: '100%', padding: '10px', fontSize: '13px', borderColor: 'rgba(255, 42, 95, 0.4)', color: '#ff2a5f' }}
            >
              Director Admin Console
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
