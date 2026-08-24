import React, { useState } from 'react';
import { Direction } from '../../../shared/types.js';

interface VirtualJoystickProps {
  onDirectionChange: (dir: Direction) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onDirectionChange }) => {
  const [activeDir, setActiveDir] = useState<Direction | null>(null);

  const handlePress = (dir: Direction, e?: React.TouchEvent | React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setActiveDir(dir);
    onDirectionChange(dir);
  };

  const btnStyle = (dir: Direction): React.CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: activeDir === dir ? 'rgba(0, 210, 255, 0.5)' : 'rgba(20, 30, 45, 0.85)',
    border: `1.5px solid ${activeDir === dir ? '#00d2ff' : 'rgba(255, 255, 255, 0.25)'}`,
    color: '#ffffff',
    fontSize: '18px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    touchAction: 'none',
    boxShadow: '0 4px 16px rgba(0,0,0,0.6)',
    WebkitTapHighlightColor: 'transparent',
  });

  return (
    <div
      style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 48px)',
        gridTemplateRows: 'repeat(2, 48px)',
        gap: '6px',
        zIndex: 90,
      }}
    >
      <div />
      <button
        style={btnStyle('UP')}
        onTouchStart={(e) => handlePress('UP', e)}
        onClick={(e) => handlePress('UP', e)}
      >
        ▲
      </button>
      <div />
      <button
        style={btnStyle('LEFT')}
        onTouchStart={(e) => handlePress('LEFT', e)}
        onClick={(e) => handlePress('LEFT', e)}
      >
        ◀
      </button>
      <button
        style={btnStyle('DOWN')}
        onTouchStart={(e) => handlePress('DOWN', e)}
        onClick={(e) => handlePress('DOWN', e)}
      >
        ▼
      </button>
      <button
        style={btnStyle('RIGHT')}
        onTouchStart={(e) => handlePress('RIGHT', e)}
        onClick={(e) => handlePress('RIGHT', e)}
      >
        ▶
      </button>
    </div>
  );
};
