import React, { useState } from 'react';
import { GameStateSnapshot, TeamInfo } from '../../../shared/types.js';
import { TEAM_PALETTES, TEAM_ICONS, GAME_TITLE, GAME_VERSION } from '../../../shared/constants.js';
import { Users, Play, ShieldAlert, Sparkles, Volume2, VolumeX, Plus, Shield, Sliders, BookOpen, Trophy, QrCode, Eye } from 'lucide-react';
import { SoundManager } from '../audio/SoundManager.js';

interface LobbyViewProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  selectedTeam: string;
  setSelectedTeam: (team: string) => void;
  isReady: boolean;
  onToggleReady: () => void;
  onJoin: () => void;
  onCreateTeam: (name: string, colorIndex: number, symbol: string) => void;
  hasJoined: boolean;
  gameState: GameStateSnapshot | null;
  onOpenAdmin: () => void;
  onOpenSettings: () => void;
  onOpenHowToPlay: () => void;
  onOpenScoreboard: () => void;
  onStartObserverMode: () => void;
  onStartPracticeMode: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  playerName,
  setPlayerName,
  selectedTeam,
  setSelectedTeam,
  isReady,
  onToggleReady,
  onJoin,
  onCreateTeam,
  hasJoined,
  gameState,
  onOpenAdmin,
  onOpenSettings,
  onOpenHowToPlay,
  onOpenScoreboard,
  onStartObserverMode,
  onStartPracticeMode,
}) => {
  const [isMuted, setIsMuted] = useState(SoundManager.isMuted);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedPaletteIndex, setSelectedPaletteIndex] = useState(0);
  const [selectedSymbol, setSelectedSymbol] = useState(TEAM_ICONS[0]);

  const handleToggleMute = () => {
    setIsMuted(SoundManager.toggleMute());
  };

  const handleCreateTeamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newTeamName.trim()) return;
    onCreateTeam(newTeamName.trim(), selectedPaletteIndex, selectedSymbol);
    setNewTeamName('');
    setShowCreateTeam(false);
  };

  const totalConnected = gameState?.players.length || 0;
  const readyCount = gameState?.readyCount || 0;
  const isLobbyFull = totalConnected >= 30;
  const availableTeams: TeamInfo[] = gameState?.availableTeams || [];

  const currentHostUrl = typeof window !== 'undefined' ? window.location.href : 'http://localhost:5173/';
  const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(currentHostUrl)}`;

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: 'clamp(10px, 3vw, 24px)',
        position: 'relative',
        background: 'radial-gradient(circle at center, #0d1527 0%, #050810 100%)',
        overflowY: 'auto',
        overflowX: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top Header Bar */}
      <header
        style={{
          width: '100%',
          maxWidth: '840px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          zIndex: 10,
          marginBottom: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onOpenHowToPlay}
            className="glass-button"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title="How to Play"
          >
            <BookOpen size={14} color="#00d2ff" />
            <span className="btn-label-desktop">HOW TO PLAY</span>
            <span className="btn-label-mobile">RULES</span>
          </button>
          <button
            type="button"
            onClick={onOpenScoreboard}
            className="glass-button"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title="Tournament Standings"
          >
            <Trophy size={14} color="#ffd600" />
            <span className="btn-label-desktop">STANDINGS</span>
            <span className="btn-label-mobile">RANKS</span>
          </button>
          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            className="glass-button"
            style={{ padding: '6px 10px', fontSize: '12px' }}
            title="Scan QR to Join"
          >
            <QrCode size={14} color="#00ff88" />
            <span className="btn-label-desktop">PROJECTOR QR</span>
            <span className="btn-label-mobile">QR</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onStartObserverMode}
            className="glass-button"
            style={{ padding: '6px 10px', fontSize: '12px', borderColor: '#b026ff', color: '#b026ff' }}
            title="Observer Mode for Stage Projector"
          >
            <Eye size={14} color="#b026ff" />
            <span className="btn-label-desktop">OBSERVER</span>
          </button>
          <button
            type="button"
            onClick={onOpenSettings}
            className="glass-button"
            style={{ padding: '6px 10px' }}
            title="Game Settings"
          >
            <Sliders size={14} />
          </button>
          <button
            type="button"
            onClick={handleToggleMute}
            className="glass-button"
            style={{ padding: '6px 10px' }}
            title={isMuted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {isMuted ? <VolumeX size={14} color="#ff2a5f" /> : <Volume2 size={14} color="#00d2ff" />}
          </button>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="glass-button"
            style={{ padding: '6px 10px', fontSize: '12px', border: '1px solid rgba(255, 42, 95, 0.4)' }}
            title="Tournament Admin"
          >
            <ShieldAlert size={14} color="#ff2a5f" />
            <span className="btn-label-desktop">ADMIN</span>
          </button>
        </div>
      </header>

      {/* Main Branding */}
      <div style={{ textAlign: 'center', marginTop: '4px', marginBottom: '16px', maxWidth: '100%' }}>
        <div
          style={{
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '3px',
            color: '#00d2ff',
            textTransform: 'uppercase',
            marginBottom: '4px',
          }}
        >
          College Esports Battle Royale Tournament
        </div>
        <h1
          className="neon-title"
          style={{
            fontSize: 'clamp(26px, 6.5vw, 52px)',
            fontWeight: 900,
            letterSpacing: '1px',
            background: 'linear-gradient(135deg, #ffffff 0%, #00d2ff 50%, #ff2a5f 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textTransform: 'uppercase',
            lineHeight: '1.1',
            wordBreak: 'break-word',
          }}
        >
          {GAME_TITLE}
        </h1>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
            5v5 Squad Territory Domination &bull; 25-Player Match
          </span>
          <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text-muted)' }}>
            {GAME_VERSION}
          </span>
        </div>
      </div>

      {/* Main Lobby Card */}
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '840px',
          padding: 'clamp(14px, 4vw, 24px)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          boxSizing: 'border-box',
        }}
      >
        {/* Status Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '13px', fontWeight: 600 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={16} color="#00d2ff" />
              <span>PLAYERS:</span>
              <span style={{ color: '#00ff88', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {totalConnected}/30
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#ffd600" />
              <span>READY:</span>
              <span style={{ color: '#ffd600', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                {readyCount}/{totalConnected}
              </span>
            </div>
          </div>

          <div
            style={{
              fontSize: '12px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: gameState?.status === 'LOBBY' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 214, 0, 0.15)',
              color: gameState?.status === 'LOBBY' ? '#00ff88' : '#ffd600',
              fontWeight: 800,
            }}
          >
            {gameState?.status || 'LOBBY READY'}
          </div>
        </div>

        {/* Player Name Input */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
            OPERATIVE CALLSIGN
          </label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={15}
            placeholder="Enter your name..."
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '15px',
              fontFamily: 'var(--font-main)',
              fontWeight: 600,
              outline: 'none',
            }}
          />
        </div>

        {/* Squad Selection Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
              CHOOSE OR CREATE A SQUAD
            </label>
            <span style={{ fontSize: '11px', color: '#8a99ad', marginLeft: '8px' }}>
              ({availableTeams.length}/6 Squads)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateTeam(!showCreateTeam)}
            className="glass-button"
            style={{
              padding: '6px 12px',
              fontSize: '12px',
              background: showCreateTeam ? 'rgba(255, 42, 95, 0.3)' : 'rgba(0, 210, 255, 0.2)',
              borderColor: showCreateTeam ? '#ff2a5f' : '#00d2ff',
            }}
          >
            {showCreateTeam ? (
              'Cancel'
            ) : (
              <>
                <Plus size={14} /> CREATE SQUAD
              </>
            )}
          </button>
        </div>

        {/* Create Squad Form */}
        {showCreateTeam && (
          <form
            onSubmit={handleCreateTeamSubmit}
            style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 210, 255, 0.4)',
              borderRadius: '10px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 800, color: '#00d2ff' }}>
              REGISTER NEW SQUAD
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                Squad Name
              </label>
              <input
                type="text"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                maxLength={15}
                placeholder="e.g. Phoenix Vanguard..."
                style={{
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            {/* Emblem and Color Selector Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Squad Color
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {TEAM_PALETTES.map((pal, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setSelectedPaletteIndex(idx);
                        setSelectedSymbol(pal.symbol);
                      }}
                      style={{
                        width: '30px',
                        height: '30px',
                        borderRadius: '50%',
                        backgroundColor: pal.color,
                        border: selectedPaletteIndex === idx ? '3px solid #ffffff' : '2px solid transparent',
                        boxShadow: selectedPaletteIndex === idx ? `0 0 12px ${pal.color}` : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {selectedPaletteIndex === idx ? '✓' : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Squad Emblem
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {TEAM_ICONS.slice(0, 6).map((icon) => (
                    <button
                      type="button"
                      key={icon}
                      onClick={() => setSelectedSymbol(icon)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: selectedSymbol === icon ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.05)',
                        border: `1px solid ${selectedSymbol === icon ? '#00d2ff' : 'rgba(255,255,255,0.1)'}`,
                        fontSize: '16px',
                        cursor: 'pointer',
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!newTeamName.trim()}
              className="glass-button primary"
              style={{ padding: '10px', fontSize: '14px', marginTop: '4px' }}
            >
              REGISTER SQUAD &amp; JOIN
            </button>
          </form>
        )}

        {/* Existing Squads List with Roster */}
        {availableTeams.length === 0 ? (
          <div
            style={{
              padding: '24px',
              textAlign: 'center',
              border: '1px dashed rgba(255, 255, 255, 0.2)',
              borderRadius: '10px',
              color: 'var(--text-muted)',
              fontSize: '14px',
            }}
          >
            <Shield size={28} color="#00d2ff" style={{ margin: '0 auto 8px', opacity: 0.7 }} />
            <div>No squads have been registered yet.</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
              Click <strong>&quot;CREATE SQUAD&quot;</strong> above to start the first team!
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: '10px',
            }}
          >
            {availableTeams.map((teamInfo) => {
              const teamMembers = gameState?.players.filter((p) => p.teamId === teamInfo.id) || [];
              const isSelected = selectedTeam === teamInfo.id;
              const isFull = teamMembers.length >= 5 && !isSelected;

              return (
                <button
                  type="button"
                  key={teamInfo.id}
                  disabled={isFull}
                  onClick={() => setSelectedTeam(teamInfo.id)}
                  style={{
                    background: isSelected ? 'rgba(0, 210, 255, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                    border: `2px solid ${isSelected ? teamInfo.color : 'rgba(255, 255, 255, 0.12)'}`,
                    borderRadius: '10px',
                    padding: '12px',
                    textAlign: 'left',
                    cursor: isFull ? 'not-allowed' : 'pointer',
                    opacity: isFull ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? `0 0 16px ${teamInfo.glowColor || teamInfo.color}` : 'none',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>{teamInfo.symbol || '⚔️'}</span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 800,
                        fontFamily: 'var(--font-mono)',
                        color: teamMembers.length >= 5 ? '#ff2a5f' : '#00ff88',
                      }}
                    >
                      {teamMembers.length}/5
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {teamInfo.name}
                  </div>

                  {/* Operative list in squad */}
                  <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {teamMembers.map((m) => (
                      <div key={m.id} style={{ fontSize: '11px', color: m.isReady ? '#00ff88' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{m.isReady ? '●' : '○'}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - teamMembers.length) }).map((_, i) => (
                      <div key={i} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)' }}>
                        &bull; Empty Slot
                      </div>
                    ))}
                  </div>

                  <div style={{ fontSize: '10px', color: isSelected ? '#00d2ff' : 'var(--text-muted)', marginTop: '6px', fontWeight: 700 }}>
                    {isFull ? 'SQUAD FULL' : isSelected ? 'SELECTED SQUAD' : 'CLICK TO JOIN'}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Action Button & Practice Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
          {!hasJoined ? (
            <button
              type="button"
              onClick={onJoin}
              disabled={isLobbyFull || !playerName.trim() || availableTeams.length === 0}
              className="glass-button primary"
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              <Play size={20} />
              JOIN TOURNAMENT SQUAD
            </button>
          ) : (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={onToggleReady}
                className={`glass-button ${isReady ? 'primary' : ''}`}
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '16px',
                  background: isReady ? 'linear-gradient(135deg, #00ff88 0%, #009955 100%)' : undefined,
                }}
              >
                <Sparkles size={18} />
                {isReady ? '✓ MARKED READY (WAITING FOR ORGANIZER START)' : 'CLICK TO MARK READY'}
              </button>
              <p style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Organizer controls match start once all 25 players are ready.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onStartPracticeMode}
            className="glass-button"
            style={{ width: '100%', padding: '8px', fontSize: '13px', borderColor: 'rgba(255,255,255,0.1)' }}
          >
            🎯 Enter Solo Practice Mode (Test Controls)
          </button>
        </div>
      </div>

      {/* Projector QR Code Modal */}
      {showQrModal && (
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
              maxWidth: '460px',
              padding: '28px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: 800, color: '#00d2ff' }}>
              <QrCode size={20} color="#00d2ff" />
              <span>LAN GAME JOIN QR CODE</span>
            </div>

            {/* Network Mode Badge */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.3)',
              color: '#00ff88',
              fontSize: '12px',
              fontWeight: 700,
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#00ff88', display: 'inline-block' }} />
              {gameState?.hostInfo?.mode === 'ONLINE' ? 'ONLINE TOURNAMENT' : 'LOCAL LAN TOURNAMENT'}
            </div>

            <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
              <img
                src={qrApiUrl}
                alt="Game QR Code"
                style={{ width: '200px', height: '200px', display: 'block' }}
              />
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(0, 210, 255, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              width: '100%',
              boxSizing: 'border-box',
            }}>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>PLAYER JOIN URL:</div>
              <div style={{ wordBreak: 'break-all', fontFamily: 'var(--font-mono)', fontSize: '14px', color: '#00ff88', fontWeight: 700 }}>
                {currentHostUrl}
              </div>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              All players connected to this computer lab LAN can scan this QR code on mobile or enter the URL above on their lab PC browser!
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="glass-button primary"
              style={{ width: '100%', padding: '10px' }}
            >
              CLOSE
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
