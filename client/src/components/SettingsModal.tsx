import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Monitor, Sliders, X, Zap } from 'lucide-react';
import { SoundManager } from '../audio/SoundManager.js';

export interface UserSettings {
  graphics: 'LOW' | 'MEDIUM' | 'HIGH';
  particles: boolean;
  screenShake: boolean;
  soundVolume: number;
  performanceMode: boolean;
  reducedMotion: boolean;
  showFpsPing: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  graphics: 'HIGH',
  particles: true,
  screenShake: true,
  soundVolume: 0.7,
  performanceMode: false,
  reducedMotion: false,
  showFpsPing: false,
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  if (!isOpen) return null;

  const handleChange = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const updated = { ...settings, [key]: value };
    if (key === 'soundVolume') {
      SoundManager.setVolume(value as number);
    }
    if (key === 'performanceMode' && value === true) {
      updated.particles = false;
      updated.screenShake = false;
      updated.graphics = 'LOW';
    }
    onUpdateSettings(updated);
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
          maxWidth: '520px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          border: '1px solid rgba(0, 210, 255, 0.4)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders size={20} color="#00d2ff" />
            <h2 style={{ fontSize: '18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Game Settings
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

        {/* Performance Mode Toggle */}
        <div
          style={{
            background: settings.performanceMode ? 'rgba(0, 255, 136, 0.12)' : 'rgba(255, 255, 255, 0.03)',
            border: `1px solid ${settings.performanceMode ? '#00ff88' : 'rgba(255, 255, 255, 0.1)'}`,
            padding: '12px 16px',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: settings.performanceMode ? '#00ff88' : '#fff' }}>
              ⚡ Performance Mode (60 FPS Mobile/PC)
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Disables bloom, heavy glow &amp; particles for max framerate.
            </div>
          </div>
          <input
            type="checkbox"
            checked={settings.performanceMode}
            onChange={(e) => handleChange('performanceMode', e.target.checked)}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
        </div>

        {/* Graphics Quality */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-muted)' }}>
            GRAPHICS QUALITY
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {(['LOW', 'MEDIUM', 'HIGH'] as const).map((lvl) => (
              <button
                type="button"
                key={lvl}
                disabled={settings.performanceMode}
                onClick={() => handleChange('graphics', lvl)}
                className={`glass-button ${settings.graphics === lvl ? 'primary' : ''}`}
                style={{ padding: '8px', fontSize: '13px' }}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Sound Volume Slider */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)' }}>
              SOUND VOLUME
            </label>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700 }}>
              {Math.round(settings.soundVolume * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.soundVolume}
            onChange={(e) => handleChange('soundVolume', parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: '#00d2ff', cursor: 'pointer' }}
          />
        </div>

        {/* Visual Toggles Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.particles}
              disabled={settings.performanceMode}
              onChange={(e) => handleChange('particles', e.target.checked)}
            />
            <span>Particles &amp; Glow</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.screenShake}
              disabled={settings.performanceMode}
              onChange={(e) => handleChange('screenShake', e.target.checked)}
            />
            <span>Screen Shake</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.showFpsPing}
              onChange={(e) => handleChange('showFpsPing', e.target.checked)}
            />
            <span>FPS &amp; Ping HUD</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => handleChange('reducedMotion', e.target.checked)}
            />
            <span>Reduced Motion</span>
          </label>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="glass-button primary"
          style={{ width: '100%', padding: '12px', fontSize: '15px', marginTop: '6px' }}
        >
          SAVE &amp; CLOSE
        </button>
      </div>
    </div>
  );
};
