import React, { useRef, useEffect, useState } from 'react';
import { GameStateSnapshot } from '../../../shared/types.js';

interface ObserverViewProps {
  gameState: GameStateSnapshot;
  grid: (string | null)[][];
  onExit: () => void;
}

export const ObserverView: React.FC<ObserverViewProps> = ({ gameState, grid, onExit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tick, setTick] = useState(0);

  // Force re-render every tick to keep canvas fresh
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 80);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;

    const mapW = grid[0]?.length || 100;
    const mapH = grid.length || 100;

    // Panel on right side for telemetry
    const telemetryW = 220;
    const gameAreaW = W - telemetryW;

    // Fit arena in game area with padding
    const padding = 32;
    const cellSize = Math.max(4, Math.floor(Math.min(
      (gameAreaW - padding * 2) / mapW,
      (H - padding * 2) / mapH
    )));

    const arenaPixelW = mapW * cellSize;
    const arenaPixelH = mapH * cellSize;
    const offsetX = padding + Math.floor((gameAreaW - padding * 2 - arenaPixelW) / 2);
    const offsetY = padding + Math.floor((H - padding * 2 - arenaPixelH) / 2);

    // Background
    ctx.fillStyle = '#050810';
    ctx.fillRect(0, 0, W, H);

    // Subtle arena background grid
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= arenaPixelW; x += cellSize) {
      ctx.moveTo(offsetX + x, offsetY);
      ctx.lineTo(offsetX + x, offsetY + arenaPixelH);
    }
    for (let y = 0; y <= arenaPixelH; y += cellSize) {
      ctx.moveTo(offsetX, offsetY + y);
      ctx.lineTo(offsetX + arenaPixelW, offsetY + y);
    }
    ctx.stroke();

    // Territory
    const teamColorCache = new Map<string, string>();
    const getColor = (teamId: string): string => {
      if (teamColorCache.has(teamId)) return teamColorCache.get(teamId)!;
      const t = gameState.availableTeams?.find((a) => a.id === teamId);
      const col = t?.color || '#8a99ad';
      teamColorCache.set(teamId, col);
      return col;
    };

    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const owner = grid[y]?.[x];
        if (owner) {
          ctx.fillStyle = getColor(owner);
          ctx.globalAlpha = 0.38;
          ctx.fillRect(offsetX + x * cellSize, offsetY + y * cellSize, cellSize, cellSize);
        }
      }
    }
    ctx.globalAlpha = 1;

    // Safe Zone
    const zone = gameState.zone;
    const zMinX = offsetX + zone.minX * cellSize;
    const zMinY = offsetY + zone.minY * cellSize;
    const zMaxX = offsetX + (zone.maxX + 1) * cellSize;
    const zMaxY = offsetY + (zone.maxY + 1) * cellSize;

    ctx.fillStyle = 'rgba(255, 0, 50, 0.1)';
    ctx.fillRect(offsetX, offsetY, arenaPixelW, zMinY - offsetY);
    ctx.fillRect(offsetX, zMaxY, arenaPixelW, offsetY + arenaPixelH - zMaxY);
    ctx.fillRect(offsetX, zMinY, zMinX - offsetX, zMaxY - zMinY);
    ctx.fillRect(zMaxX, zMinY, offsetX + arenaPixelW - zMaxX, zMaxY - zMinY);

    ctx.strokeStyle = zone.isShrinking ? '#ff2a5f' : '#00d2ff';
    ctx.lineWidth = 3;
    ctx.shadowColor = zone.isShrinking ? '#ff2a5f' : '#00d2ff';
    ctx.shadowBlur = 14;
    ctx.strokeRect(zMinX, zMinY, zMaxX - zMinX, zMaxY - zMinY);
    ctx.shadowBlur = 0;

    // Players
    for (const player of gameState.players) {
      if (!player.isAlive) continue;
      const col = getColor(player.teamId);
      ctx.fillStyle = col;
      ctx.shadowColor = col;
      ctx.shadowBlur = 6;
      const px = offsetX + player.x * cellSize + 1;
      const py = offsetY + player.y * cellSize + 1;
      const sz = Math.max(4, cellSize - 2);
      ctx.fillRect(px, py, sz, sz);
    }
    ctx.shadowBlur = 0;

    // Arena border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX, offsetY, arenaPixelW, arenaPixelH);

    // Right Telemetry Panel
    ctx.fillStyle = 'rgba(5, 10, 20, 0.92)';
    ctx.fillRect(gameAreaW, 0, telemetryW, H);
    ctx.strokeStyle = 'rgba(0, 210, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gameAreaW, 0);
    ctx.lineTo(gameAreaW, H);
    ctx.stroke();

    const px2 = gameAreaW + 14;
    let py2 = 20;

    // Title
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 11px Outfit, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Splix 2.io · BROADCAST', px2, py2);
    py2 += 16;

    // Match ID and timer
    ctx.fillStyle = '#8a99ad';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText(`${gameState.matchId || 'M-001'} · ${gameState.status}`, px2, py2);
    py2 += 22;

    // Timer
    const mins = Math.floor(gameState.timer / 60).toString().padStart(2, '0');
    const secs = (gameState.timer % 60).toString().padStart(2, '0');
    ctx.fillStyle = gameState.timer < 60 ? '#ff2a5f' : '#ffffff';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.fillText(`${mins}:${secs}`, px2, py2);
    py2 += 26;

    // Zone phase
    const phaseNames = ['PHASE 1 · 100%', 'PHASE 2 · 75%', 'PHASE 3 · 50%', 'PHASE 4 · FINAL'];
    ctx.fillStyle = '#ff7a00';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillText(`⚡ ${phaseNames[gameState.zone?.shrinkPhase || 0] || phaseNames[0]}`, px2, py2);
    py2 += 24;

    // Divider
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px2 - 2, py2);
    ctx.lineTo(gameAreaW + telemetryW - 14, py2);
    ctx.stroke();
    py2 += 12;

    // Teams
    const sortedTeams = [...gameState.teams].filter((t) => t.totalPlayers > 0).sort((a, b) => b.territoryPercentage - a.territoryPercentage);

    for (const team of sortedTeams) {
      const teamInfo = gameState.availableTeams?.find((a) => a.id === team.id);
      const color = teamInfo?.color || '#8a99ad';
      const symbol = teamInfo?.symbol || '🛡️';

      // Team name
      ctx.fillStyle = team.isEliminated ? '#555555' : color;
      ctx.font = `bold 12px Outfit, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`${symbol} ${team.name}`, px2, py2);

      // Status right-aligned
      ctx.textAlign = 'right';
      ctx.fillStyle = team.isEliminated ? '#ff2a5f' : '#00ff88';
      ctx.font = 'bold 11px "Courier New", monospace';
      ctx.fillText(team.isEliminated ? 'ELIM' : `${team.aliveCount}/${team.totalPlayers}`, gameAreaW + telemetryW - 14, py2);
      py2 += 14;

      // Territory bar
      const barW = telemetryW - 28;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.fillRect(px2, py2, barW, 6);

      if (!team.isEliminated) {
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.75;
        ctx.fillRect(px2, py2, Math.floor(barW * team.territoryPercentage / 100), 6);
        ctx.globalAlpha = 1;
      }

      // Territory %
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.font = '9px "Courier New", monospace';
      ctx.fillText(`${team.territoryPercentage}%`, gameAreaW + telemetryW - 14, py2 + 6);
      py2 += 20;
    }

    py2 += 8;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px2 - 2, py2);
    ctx.lineTo(gameAreaW + telemetryW - 14, py2);
    ctx.stroke();
    py2 += 14;

    // Event feed (recent kills)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8a99ad';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.fillText('ELIMINATIONS', px2, py2);
    py2 += 14;

    for (const kill of gameState.recentKills.slice(0, 8)) {
      if (py2 > H - 40) break;
      const killerColor = gameState.availableTeams?.find((a) => a.id === kill.killerTeam)?.color || '#8a99ad';
      const victimColor = gameState.availableTeams?.find((a) => a.id === kill.victimTeam)?.color || '#8a99ad';
      const icon = kill.reason === 'TRAIL_CUT' ? '🔪' : kill.reason === 'ZONE_DEATH' ? '⚡' : '⚔️';

      ctx.font = 'bold 9px Outfit, sans-serif';
      ctx.fillStyle = killerColor;
      const killerText = kill.killerName.substring(0, 9);
      ctx.fillText(killerText, px2, py2);

      const kw = ctx.measureText(killerText).width;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(` ${icon} `, px2 + kw, py2);
      const iw = ctx.measureText(` ${icon} `).width;

      ctx.fillStyle = victimColor;
      ctx.fillText(kill.victimName.substring(0, 9), px2 + kw + iw, py2);
      py2 += 13;
    }

    // Observer badge bottom
    ctx.fillStyle = 'rgba(0, 210, 255, 0.15)';
    ctx.fillRect(gameAreaW, H - 28, telemetryW, 28);
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('👁 BROADCAST / OBSERVER MODE', gameAreaW + telemetryW / 2, H - 10);

  }, [gameState, grid, tick]);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#050810', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />

      {/* Exit Observer Mode button */}
      <button
        type="button"
        onClick={onExit}
        className="glass-button"
        style={{
          position: 'absolute', top: '16px', left: '16px',
          padding: '8px 16px', fontSize: '13px', zIndex: 50, pointerEvents: 'auto',
          borderColor: 'rgba(255, 255, 255, 0.3)',
        }}
      >
        ← EXIT OBSERVER
      </button>
    </div>
  );
};
