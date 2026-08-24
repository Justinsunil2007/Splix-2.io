import React, { useState, useEffect } from 'react';
import { GameStateSnapshot, TeamInfo } from '../../../shared/types.js';

interface MinimapProps {
  gameState: GameStateSnapshot;
  grid: (string | null)[][];
  myPlayerId: string;
}

export const Minimap: React.FC<MinimapProps> = ({ gameState, grid, myPlayerId }) => {
  const [minimapSize, setMinimapSize] = useState(window.innerWidth < 600 ? 90 : 130);

  useEffect(() => {
    const handleResize = () => {
      setMinimapSize(window.innerWidth < 600 ? 90 : 130);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const teamMap = new Map<string, TeamInfo>();
  if (gameState?.availableTeams) {
    gameState.availableTeams.forEach((t) => teamMap.set(t.id, t));
  }

  const mapW = grid[0]?.length || 100;
  const mapH = grid.length || 100;

  const scaleX = minimapSize / mapW;
  const scaleY = minimapSize / mapH;

  const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
  const zone = gameState.zone;

  return (
    <div
      style={{
        width: `${minimapSize}px`,
        height: `${minimapSize}px`,
        background: 'rgba(5, 8, 15, 0.85)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
      }}
    >
      {/* Zone boundary on minimap */}
      <div
        style={{
          position: 'absolute',
          left: `${zone.minX * scaleX}px`,
          top: `${zone.minY * scaleY}px`,
          width: `${(zone.maxX - zone.minX + 1) * scaleX}px`,
          height: `${(zone.maxY - zone.minY + 1) * scaleY}px`,
          border: `1.5px solid ${zone.isShrinking ? '#ff2a5f' : '#00d2ff'}`,
          backgroundColor: 'rgba(0, 210, 255, 0.05)',
          transition: 'all 0.3s ease',
        }}
      />

      {/* Players on Minimap */}
      {gameState.players.map((p) => {
        if (!p.isAlive) return null;
        const isMe = p.id === myPlayerId;
        const isTeammate = myPlayer && p.teamId === myPlayer.teamId;
        const teamInfo = teamMap.get(p.teamId);

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x * scaleX - (isMe ? 3 : 2)}px`,
              top: `${p.y * scaleY - (isMe ? 3 : 2)}px`,
              width: isMe ? '6px' : '4px',
              height: isMe ? '6px' : '4px',
              borderRadius: '50%',
              backgroundColor: isMe ? '#ffffff' : isTeammate && teamInfo ? teamInfo.color : 'rgba(255,255,255,0.6)',
              boxShadow: isMe ? '0 0 6px #ffffff' : undefined,
              zIndex: isMe ? 10 : 2,
            }}
          />
        );
      })}

      <div
        style={{
          position: 'absolute',
          bottom: '2px',
          right: '4px',
          fontSize: minimapSize < 100 ? '7px' : '8px',
          color: 'rgba(255,255,255,0.4)',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
        }}
      >
        RADAR
      </div>
    </div>
  );
};
