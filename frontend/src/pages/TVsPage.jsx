import React, { useEffect, useMemo, useRef, useState } from 'react';
import Background from '../components/tvs/Background';
import WelcomeText from '../components/tvs/WelcomeText';
import QRDisplay from '../components/tvs/QRDisplay';
import VideoStrip from '../components/tvs/VideoStrip';

const IDLE_HIDE_MS = 4000;

export default function TVsPage() {
  const [visibleUI, setVisibleUI] = useState(true);
  const [name, setName] = useState(() => localStorage.getItem('welcomeName') || 'Duluth Dental Center');
  const idleTimer = useRef(null);

  const poke = () => {
    setVisibleUI(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => setVisibleUI(false), IDLE_HIDE_MS);
  };

  useEffect(() => {
    const onMove = () => poke();
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mousedown', onMove);
    window.addEventListener('touchstart', onMove);
    poke();
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onMove);
      window.removeEventListener('touchstart', onMove);
      clearTimeout(idleTimer.current);
    };
  }, []);

  useEffect(() => {
    const val = (name || '').slice(0, 64).trim();
    localStorage.setItem('welcomeName', val || 'Friend');
  }, [name]);

  const toolbarStyle = useMemo(() => ({
    position: 'fixed',
    top: 16,
    left: 16,
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(0,0,0,0.45)',
    color: 'white',
    display: visibleUI ? 'flex' : 'none',
    alignItems: 'center',
    gap: 8,
    zIndex: 50,
    backdropFilter: 'blur(6px)'
  }), [visibleUI]);

  return (
    <>
      <Background />

      <div style={toolbarStyle}>
        <input
          aria-label="Your name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Duluth Dental Center"
          style={{
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            outline: 'none',
            width: 180
          }}
        />
      </div>

      <WelcomeText name={name} />
      <QRDisplay />
      <VideoStrip />
    </>
  );
}

