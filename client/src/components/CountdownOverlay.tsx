import React from 'react';
import { TeamInfo } from '../../../shared/types.js';

interface CountdownOverlayProps {
  seconds: number;
  isIntro?: boolean;
  introTeams?: TeamInfo[];
  matchId?: string;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({
  seconds,
  isIntro = false,
  introTeams = [],
  matchId,
}) => {
  if (seconds <= 0 && !isIntro) return null;

  if (isIntro) {
    // Cinematic intro: Show teams before countdown starts
    return (
      <div
        style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(5, 8, 15, 0.92)', backdropFilter: 'blur(16px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 500, pointerEvents: 'none', gap: '20px',
        }}
      >
        <div style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '5px', color: '#00d2ff', textTransform: 'uppercase' }}>
          Splix 2.io TOURNAMENT · {matchId || 'M-001'}
        </div>

        <div style={{ fontSize: 'clamp(22px, 5vw, 36px)', fontWeight: 900, color: '#ffffff', letterSpacing: '2px', textAlign: 'center' }}>
          {introTeams.length} SQUADS ENTER — ONE RISES
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '12px', maxWidth: '800px' }}>
          {introTeams.map((team) => (
            <div
              key={team.id}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                padding: '12px 20px', borderRadius: '10px',
                background: 'rgba(0,0,0,0.6)', border: `2px solid ${team.color}`,
                boxShadow: `0 0 20px ${team.color}55`, animation: 'fadeIn 0.4s ease',
              }}
            >
              <span style={{ fontSize: '28px' }}>{team.symbol}</span>
              <strong style={{ color: team.color, fontSize: '14px', textAlign: 'center' }}>{team.name}</strong>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>
          PREPARING ARENA...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
        backgroundColor: 'rgba(5, 8, 15, 0.8)', backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        zIndex: 500, pointerEvents: 'none',
      }}
    >
      <div style={{
        fontSize: '18px', fontWeight: 800, letterSpacing: '4px',
        color: '#00d2ff', textTransform: 'uppercase', marginBottom: '10px',
      }}>
        MATCH STARTING IN
      </div>

      <div
        key={seconds}
        style={{
          fontSize: 'clamp(90px, 20vw, 160px)',
          fontWeight: 900,
          fontFamily: 'var(--font-mono)',
          color: seconds <= 2 ? '#ff2a5f' : '#ffd600',
          textShadow: seconds <= 2 ? '0 0 60px #ff2a5f, 0 0 120px #ff2a5f55' : '0 0 40px #ffd600, 0 0 80px #ffd60055',
          lineHeight: '1',
          animation: 'countdown-pop 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        }}
      >
        {seconds}
      </div>

      <div style={{
        fontSize: '14px', fontWeight: 700, color: 'rgba(255, 255, 255, 0.6)',
        marginTop: '16px', letterSpacing: '1px',
      }}>
        {seconds <= 1 ? '⚡ GO GO GO!' : 'GET READY TO CAPTURE TERRITORY!'}
      </div>
    </div>
  );
};
