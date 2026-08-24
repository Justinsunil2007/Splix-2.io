import React from 'react';
import { BookOpen, X, Shield, Swords, Zap, Flag, Eye, Crosshair } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HowToPlayModal: React.FC<HowToPlayModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const rules = [
    {
      icon: <Shield size={24} color="#00d2ff" />,
      title: '1. Secure Your Base',
      desc: 'You start safely inside your squad’s territory base. As long as you stay inside, enemies cannot kill you by trail cutting.',
    },
    {
      icon: <Flag size={24} color="#00ff88" />,
      title: '2. Enclose & Capture',
      desc: 'Leave your territory to draw an energy trail. Return safely to your squad’s land to capture all enclosed territory into your team color!',
    },
    {
      icon: <Swords size={24} color="#ff2a5f" />,
      title: '3. Cut Enemy Trails',
      desc: 'Step on any enemy player’s active trail to eliminate them instantly. Never step on your own trail, and avoid head-on collisions!',
    },
    {
      icon: <Zap size={24} color="#ffd600" />,
      title: '4. Stay Inside Safe Zone',
      desc: 'The electric boundary shrinks in 4 phases. If outside, you have ~1.5s grace time to return before taking lethal zone damage.',
    },
    {
      icon: <Crosshair size={24} color="#b026ff" />,
      title: '5. Squad Victory',
      desc: 'Teammates cannot hurt each other. When you die, you spectate your squad. Last surviving team or highest territory at time-out wins!',
    },
  ];

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
          maxWidth: '620px',
          padding: '28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          maxHeight: '90vh',
          overflowY: 'auto',
          border: '1px solid rgba(0, 255, 136, 0.4)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={22} color="#00ff88" />
            <h2 style={{ fontSize: '20px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              How to Play &amp; Tournament Rules
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {rules.map((r, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: '14px',
                padding: '12px 14px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: '2px' }}>{r.icon}</div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', marginBottom: '2px' }}>
                  {r.title}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  {r.desc}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'rgba(0, 210, 255, 0.1)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(0, 210, 255, 0.3)', fontSize: '13px', textAlign: 'center' }}>
          ⌨️ <strong>PC:</strong> WASD or Arrow Keys &nbsp;|&nbsp; 📱 <strong>Mobile:</strong> Virtual D-Pad / Touch
        </div>

        <button
          type="button"
          onClick={onClose}
          className="glass-button primary"
          style={{ width: '100%', padding: '12px', fontSize: '15px' }}
        >
          GOT IT &mdash; LET&apos;S BATTLE!
        </button>
      </div>
    </div>
  );
};
