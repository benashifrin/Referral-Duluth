import React, { useEffect, useMemo, useRef, useState } from 'react';
import Background from '../components/tvs/Background';
import VideoStrip from '../components/tvs/VideoStrip';
import BrandedSidebar from '../components/tvs/BrandedSidebar';

const IDLE_HIDE_MS = 4000;

export default function TVsPage() {
  const [visibleUI, setVisibleUI] = useState(true);
  const [name, setName] = useState(() => localStorage.getItem('welcomeName') || 'Duluth Dental Center');
  const [showBrandedContent, setShowBrandedContent] = useState(false);
  const [safeMode, setSafeMode] = useState(false);
  const idleTimer = useRef(null);
  const brandedContentTimer = useRef(null);
  const hideContentTimer = useRef(null);

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
    localStorage.setItem('welcomeName', val || 'Duluth Dental Center');
  }, [name]);

  // Detect Windows and/or reduced motion and enable safe mode to reduce GPU load
  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const isWindows = /Windows/i.test(ua);
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const params = new URLSearchParams(window.location.search);
      const paramSafe = params.has('safe') ? params.get('safe') : null;
      const stored = localStorage.getItem('tvsSafeMode');

      let enable = isWindows || prefersReduced;
      if (paramSafe !== null) enable = paramSafe === '1' || paramSafe === 'true';
      if (stored !== null) enable = stored === '1' || stored === 'true';
      setSafeMode(enable);
    } catch (e) {
      setSafeMode(false);
    }
  }, []);

  // Branded content timer system - 5 minutes on, 1 minute overlay
  useEffect(() => {
    const showBrandedContentCycle = () => {
      // Show branded content overlay (no video pause)
      setShowBrandedContent(true);
      
      // Hide after 1 minute
      hideContentTimer.current = setTimeout(() => {
        setShowBrandedContent(false);
      }, 60 * 1000); // 1 minute
    };

    // Start after 5 minutes, then repeat every 6 minutes (5min video + 1min overlay)
    const initialTimer = setTimeout(() => {
      showBrandedContentCycle();
      brandedContentTimer.current = setInterval(showBrandedContentCycle, 6 * 60 * 1000); // 6 minutes
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearTimeout(initialTimer);
      if (brandedContentTimer.current) {
        clearInterval(brandedContentTimer.current);
      }
      if (hideContentTimer.current) {
        clearTimeout(hideContentTimer.current);
      }
    };
  }, []);


  const toolbarStyle = useMemo(() => ({
    position: 'fixed',
    top: 16,
    left: 16,
    padding: '10px 12px',
    borderRadius: 12,
    background: safeMode ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.45)',
    color: 'white',
    display: visibleUI ? 'flex' : 'none',
    alignItems: 'center',
    gap: 8,
    zIndex: 30,
    ...(safeMode ? {} : { backdropFilter: 'blur(6px)' })
  }), [visibleUI, safeMode]);

  return (
    <>
      <Background reducedMotion={safeMode} />

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

      {showBrandedContent && <BrandedSidebar name={name} reducedMotion={safeMode} />}
      <VideoStrip />
    </>
  );
}
