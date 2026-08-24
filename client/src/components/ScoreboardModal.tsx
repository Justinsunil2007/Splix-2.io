import React, { useState } from 'react';
import { Trophy, History, Download, X, Award, Flame } from 'lucide-react';
import { MatchHistoryRecord, TournamentStanding } from '../../../shared/types.js';

interface ScoreboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  standings: TournamentStanding[];
  matchHistory: MatchHistoryRecord[];
}

export const ScoreboardModal: React.FC<ScoreboardModalProps> = ({
  isOpen,
  onClose,
  standings,
  matchHistory,
}) => {
  const [tab, setTab] = useState<'STANDINGS' | 'HISTORY'>('STANDINGS');

  if (!isOpen) return null;

  const exportCSV = () => {
    let csv = 'Rank,Team,Matches,Wins,Kills,Territory_Pct,Points\n';
    standings.forEach((s, idx) => {
      csv += `${idx + 1},"${s.teamName}",${s.matchesPlayed},${s.wins},${s.totalKills},${s.totalTerritoryPct.toFixed(1)}%,${s.points}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GRIDFALL_Tournament_Scores_${Date.now()}.csv`;
    a.click();
  };

  const exportJSON = () => {
    const data = { standings, matchHistory, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GRIDFALL_Tournament_Data_${Date.now()}.json`;
    a.click();
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
          maxWidth: '740px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(255, 214, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={24} color="#ffd600" />
            <h2 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Tournament Standings &amp; History
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

        {/* Tab & Export Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTab('STANDINGS')}
              className={`glass-button ${tab === 'STANDINGS' ? 'primary' : ''}`}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <Award size={16} /> OVERALL STANDINGS
            </button>
            <button
              type="button"
              onClick={() => setTab('HISTORY')}
              className={`glass-button ${tab === 'HISTORY' ? 'primary' : ''}`}
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <History size={16} /> MATCH LOGS ({matchHistory.length})
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={exportCSV}
              className="glass-button"
              style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#00ff88', color: '#00ff88' }}
            >
              <Download size={14} /> CSV
            </button>
            <button
              type="button"
              onClick={exportJSON}
              className="glass-button"
              style={{ padding: '6px 12px', fontSize: '12px', borderColor: '#00d2ff', color: '#00d2ff' }}
            >
              <Download size={14} /> JSON
            </button>
          </div>
        </div>

        {/* Content */}
        {tab === 'STANDINGS' ? (
          standings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              No completed matches recorded yet. Standings will generate after the first tournament round!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 70px 60px 80px 80px',
                  fontSize: '11px',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  padding: '4px 12px',
                  letterSpacing: '1px',
                }}
              >
                <span>RANK</span>
                <span>SQUAD</span>
                <span style={{ textAlign: 'center' }}>WINS</span>
                <span style={{ textAlign: 'center' }}>KILLS</span>
                <span style={{ textAlign: 'center' }}>TERRITORY</span>
                <span style={{ textAlign: 'right' }}>POINTS</span>
              </div>

              {standings.map((s, idx) => (
                <div
                  key={s.teamName}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '40px 1fr 70px 60px 80px 80px',
                    alignItems: 'center',
                    padding: '12px',
                    background: idx === 0 ? 'rgba(255, 214, 0, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${idx === 0 ? 'rgba(255, 214, 0, 0.4)' : 'rgba(255, 255, 255, 0.06)'}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                >
                  <span style={{ fontWeight: 800, color: idx === 0 ? '#ffd600' : 'var(--text-muted)' }}>
                    #{idx + 1}
                  </span>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <span style={{ fontSize: '18px' }}>{s.symbol}</span>
                    <strong style={{ color: s.color, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.teamName}
                    </strong>
                  </div>

                  <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#00ff88' }}>
                    {s.wins}
                  </span>

                  <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', color: '#ff2a5f' }}>
                    {s.totalKills}
                  </span>

                  <span style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '13px' }}>
                    {s.totalTerritoryPct.toFixed(1)}%
                  </span>

                  <span style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 800, color: '#00d2ff', fontSize: '16px' }}>
                    {s.points}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {matchHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                No past match history available.
              </div>
            ) : (
              matchHistory.map((m) => (
                <div
                  key={m.matchId + '-' + m.timestamp}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <strong style={{ color: '#00d2ff', marginRight: '8px' }}>{m.matchId}</strong>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(m.timestamp).toLocaleTimeString()} &bull; Duration: {m.durationSeconds}s
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#ffd600', fontWeight: 800 }}>
                      👑 {m.winnerTeamName}
                    </div>
                  </div>

                  {/* Team ranks row */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {m.rankings.map((r, idx) => (
                      <div
                        key={r.id}
                        style={{
                          fontSize: '12px',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          borderLeft: `3px solid ${r.color}`,
                        }}
                      >
                        #{idx + 1} {r.name}: <strong>{r.territoryPercentage}%</strong> ({r.kills || 0} kills)
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
