import React, { useRef, useEffect } from 'react';
import { GameStateSnapshot, Position, TeamInfo } from '../../../shared/types.js';
import { Camera } from '../game/Camera.js';
import { UserSettings } from './SettingsModal.js';

interface GameCanvasProps {
  gameState: GameStateSnapshot;
  grid: (string | null)[][];
  myPlayerId: string;
  isAdmin?: boolean;
  isObserverMode?: boolean;
  settings?: UserSettings;
  spectateTargetId?: string;
  onAutoSpectateTargetChange?: (targetId: string) => void;
}

interface ClaimParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  grid,
  myPlayerId,
  isAdmin = false,
  isObserverMode = false,
  settings,
  spectateTargetId,
  onAutoSpectateTargetChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraRef = useRef<Camera>(new Camera());
  const cameraInitialized = useRef<boolean>(false);
  const lastTargetIdRef = useRef<string>('');
  const particlesRef = useRef<ClaimParticle[]>([]);

  const teamMap = new Map<string, TeamInfo>();
  if (gameState?.availableTeams) {
    gameState.availableTeams.forEach((t) => teamMap.set(t.id, t));
  }
  if (gameState?.teams) {
    gameState.teams.forEach((t) => {
      if (!teamMap.has(t.id)) {
        teamMap.set(t.id, {
          id: t.id,
          name: t.name,
          color: t.color,
          trailColor: t.color,
          glowColor: t.color,
          secondaryColor: t.color,
          symbol: t.symbol || '⚔️',
        });
      }
    });
  }

  const getTeamInfo = (teamId: string | null): TeamInfo => {
    if (!teamId) {
      return {
        id: '',
        name: 'Neutral',
        color: '#8a99ad',
        trailColor: '#8a99ad',
        glowColor: '#8a99ad',
        secondaryColor: '#3a4454',
        symbol: '🏳️',
      };
    }
    return teamMap.get(teamId) || {
      id: teamId,
      name: 'Squad',
      color: '#00d2ff',
      trailColor: '#00d2ff',
      glowColor: '#00d2ff',
      secondaryColor: '#005580',
      symbol: '🛡️',
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      const mapW = grid[0]?.length || 100;
      const mapH = grid.length || 100;

      // Base responsive cell sizing
      let cellSize = width < 600 ? 14 : width < 900 ? 18 : 24;

      // Observer mode: fit entire arena nicely on projector
      if (isObserverMode) {
        cellSize = Math.max(6, Math.floor(Math.min(width / (mapW + 4), height / (mapH + 4))));
        cameraRef.current.setInstant((mapW * cellSize) / 2, (mapH * cellSize) / 2);
      } else {
        const myPlayer = gameState.players.find((p) => p.id === myPlayerId);
        let targetPlayer = (myPlayer && myPlayer.isAlive) ? myPlayer : null;

        if (!targetPlayer && spectateTargetId) {
          targetPlayer = gameState.players.find((p) => p.id === spectateTargetId && p.isAlive) || null;
        }

        if (!targetPlayer && myPlayer && !myPlayer.isAlive) {
          const aliveTeammate = gameState.players.find((p) => p.teamId === myPlayer.teamId && p.isAlive);
          if (aliveTeammate) {
            targetPlayer = aliveTeammate;
            if (aliveTeammate.id !== lastTargetIdRef.current) {
              lastTargetIdRef.current = aliveTeammate.id;
              onAutoSpectateTargetChange?.(aliveTeammate.id);
            }
          }
        }

        if (!targetPlayer && (isAdmin || (myPlayer && !myPlayer.isAlive))) {
          const anyAlive = gameState.players.find((p) => p.isAlive);
          if (anyAlive) targetPlayer = anyAlive;
        }

        if (targetPlayer) {
          const targetX = targetPlayer.x * cellSize + cellSize / 2;
          const targetY = targetPlayer.y * cellSize + cellSize / 2;
          const dx = targetX - cameraRef.current.x;
          const dy = targetY - cameraRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (!cameraInitialized.current || dist > cellSize * 8) {
            cameraRef.current.setInstant(targetX, targetY);
            cameraInitialized.current = true;
          } else {
            cameraRef.current.update(targetX, targetY);
          }
        }
      }

      const camera = cameraRef.current;
      const camX = camera.x;
      const camY = camera.y;

      const isPerf = settings?.performanceMode;

      // Dark Arena Background
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(Math.floor(width / 2 - camX), Math.floor(height / 2 - camY));

      const arenaPixelW = mapW * cellSize;
      const arenaPixelH = mapH * cellSize;

      // Background Grid
      if (!isPerf) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let x = 0; x <= arenaPixelW; x += cellSize) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, arenaPixelH);
        }
        for (let y = 0; y <= arenaPixelH; y += cellSize) {
          ctx.moveTo(0, y);
          ctx.lineTo(arenaPixelW, y);
        }
        ctx.stroke();
      }

      // Outer Arena Border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = isObserverMode ? 2 : 3;
      ctx.strokeRect(0, 0, arenaPixelW, arenaPixelH);

      // 1. Draw Team Owned Territory Cells
      const startCellX = isObserverMode ? 0 : Math.max(0, Math.floor((camX - width / 2) / cellSize));
      const endCellX = isObserverMode ? mapW - 1 : Math.min(mapW - 1, Math.ceil((camX + width / 2) / cellSize));
      const startCellY = isObserverMode ? 0 : Math.max(0, Math.floor((camY - height / 2) / cellSize));
      const endCellY = isObserverMode ? mapH - 1 : Math.min(mapH - 1, Math.ceil((camY + height / 2) / cellSize));

      for (let y = startCellY; y <= endCellY; y++) {
        for (let x = startCellX; x <= endCellX; x++) {
          const owner = grid[y]?.[x];
          if (owner) {
            const teamInfo = getTeamInfo(owner);
            ctx.fillStyle = teamInfo.color;
            ctx.globalAlpha = 0.35;
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);

            if (!isPerf && cellSize > 10) {
              ctx.strokeStyle = teamInfo.color;
              ctx.globalAlpha = 0.55;
              ctx.lineWidth = 1;
              ctx.strokeRect(x * cellSize + 0.5, y * cellSize + 0.5, cellSize - 1, cellSize - 1);
            }
          }
        }
      }
      ctx.globalAlpha = 1.0;

      // 2. Safe Zone Boundary
      const zone = gameState.zone;
      const zMinX = zone.minX * cellSize;
      const zMinY = zone.minY * cellSize;
      const zMaxX = (zone.maxX + 1) * cellSize;
      const zMaxY = (zone.maxY + 1) * cellSize;

      // Out of zone danger overlay
      ctx.fillStyle = 'rgba(255, 0, 50, 0.14)';
      ctx.fillRect(0, 0, arenaPixelW, zMinY);
      ctx.fillRect(0, zMaxY, arenaPixelW, arenaPixelH - zMaxY);
      ctx.fillRect(0, zMinY, zMinX, zMaxY - zMinY);
      ctx.fillRect(zMaxX, zMinY, arenaPixelW - zMaxX, zMaxY - zMinY);

      // Electric Border
      ctx.strokeStyle = zone.isShrinking ? '#ff2a5f' : '#00d2ff';
      ctx.lineWidth = isObserverMode ? 3 : 4;
      if (!isPerf) {
        ctx.shadowColor = zone.isShrinking ? '#ff2a5f' : '#00d2ff';
        ctx.shadowBlur = 12;
      }
      ctx.strokeRect(zMinX, zMinY, zMaxX - zMinX, zMaxY - zMinY);
      ctx.shadowBlur = 0;

      // 3. Player Trails
      for (const player of gameState.players) {
        if (!player.isAlive || player.trail.length === 0) continue;
        const teamInfo = getTeamInfo(player.teamId);

        ctx.fillStyle = teamInfo.color;
        if (!isPerf) {
          ctx.shadowColor = teamInfo.color;
          ctx.shadowBlur = 6;
        }

        for (let i = 0; i < player.trail.length; i++) {
          const pt = player.trail[i];
          const px = pt.x * cellSize + 2;
          const py = pt.y * cellSize + 2;
          ctx.fillRect(px, py, Math.max(2, cellSize - 4), Math.max(2, cellSize - 4));
        }
        ctx.shadowBlur = 0;
      }

      // 4. Players
      for (const player of gameState.players) {
        if (!player.isAlive) continue;
        const teamInfo = getTeamInfo(player.teamId);
        const px = player.x * cellSize;
        const py = player.y * cellSize;
        const isMe = player.id === myPlayerId;

        ctx.fillStyle = teamInfo.color;
        if (!isPerf) {
          ctx.shadowColor = isMe ? '#ffffff' : teamInfo.color;
          ctx.shadowBlur = isMe ? 16 : 8;
        }

        const radius = Math.max(2, Math.floor(cellSize / 4));
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, cellSize - 2, cellSize - 2, radius);
        ctx.fill();

        ctx.fillStyle = isMe ? '#ffffff' : '#000000';
        ctx.globalAlpha = isMe ? 0.9 : 0.35;
        const coreInset = Math.max(2, Math.floor(cellSize / 4));
        ctx.fillRect(px + coreInset, py + coreInset, cellSize - coreInset * 2, cellSize - coreInset * 2);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;

        // Eye Indicator
        if (cellSize > 10) {
          ctx.fillStyle = '#ffffff';
          let eyeX = px + cellSize / 2;
          let eyeY = py + cellSize / 2;
          const eyeOff = Math.max(3, Math.floor(cellSize / 4));
          if (player.direction === 'UP') eyeY -= eyeOff;
          if (player.direction === 'DOWN') eyeY += eyeOff;
          if (player.direction === 'LEFT') eyeX -= eyeOff;
          if (player.direction === 'RIGHT') eyeX += eyeOff;
          ctx.beginPath();
          ctx.arc(eyeX, eyeY, Math.max(1.5, cellSize / 8), 0, Math.PI * 2);
          ctx.fill();
        }

        // Compact Nameplate (only if not tiny)
        if (cellSize >= 14) {
          ctx.font = 'bold 10px Outfit, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillStyle = isMe ? '#00d2ff' : '#f0f4f8';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 4;
          ctx.fillText(player.name, px + cellSize / 2, py - 5);
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState, grid, myPlayerId, isAdmin, isObserverMode, settings, spectateTargetId]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'block',
      }}
    />
  );
};
