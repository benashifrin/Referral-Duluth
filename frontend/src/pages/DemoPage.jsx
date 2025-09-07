import React, { useEffect, useRef, useState, useMemo } from 'react';
import { API_URL } from '../services/api';

const ROTATE_MS = 30_000;
const FADE_MS = 400;

const QR_TARGETS = [
  {
    key: 'rewards',
    label: 'Scan to enter rewards program',
    path: '/qr/login',
    alt: 'QR Code for BestDentistDuluth.com Login',
  },
  {
    key: 'review',
    label: 'Leave us a review',
    path: '/qr/review',
    alt: 'QR Code to leave a Google review',
  },
];

/** Mint/Teal themes */
const THEMES = [
  {
    name: 'mint-teal',
    baseFrom: '#a8edea',
    baseTo:   '#14b8a6',
    stops: ['#006d77', '#14b8a6', '#83eaf1', '#d1f9f4', '#a8edea', '#14b8a6'],
  },
  {
    name: 'deep-teal-lav',
    baseFrom: '#b5c7f2',
    baseTo:   '#14b8a6',
    stops: ['#0e7490', '#06b6d4', '#99f6e4', '#a7f3d0', '#b5c7f2', '#14b8a6'],
  },
];

const DemoPage = () => {
  /** ---------- STATIC CSS (uses CSS variables) ---------- */
  const staticStyles = `
    .flowing-background {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: 0;
      overflow: hidden;
      pointer-events: none;
      background: linear-gradient(135deg, var(--base-from) 0%, var(--base-to) 100%);
      transition: background 500ms ease;
    }

    .gradient-layer {
      position: absolute;
      top: 0; left: 0;
      width: 200%; height: 200%;
      opacity: 0.8;
      mix-blend-mode: screen;
      filter: blur(40px);
      transition: background 500ms ease;
    }

    .gradient-layer-1 {
      background: conic-gradient(
        from 0deg at 50% 50%,
        var(--c1), var(--c2), var(--c3), var(--c4), var(--c5), var(--c1)
      );
      animation: rotate-flow-1 20s linear infinite;
      transform-origin: center center;
    }

    .gradient-layer-2 {
      background: conic-gradient(
        from 180deg at 30% 70%,
        var(--c2), var(--c4), var(--c3), var(--c5), var(--c1), var(--c2)
      );
      animation: rotate-flow-2 25s linear infinite reverse;
      transform-origin: 30% 70%;
      opacity: 0.6;
    }

    .gradient-layer-3 {
      background: conic-gradient(
        from 90deg at 70% 30%,
        var(--c3), var(--c5), var(--c2), var(--c4), var(--c1), var(--c3)
      );
      animation: rotate-flow-3 30s linear infinite;
      transform-origin: 70% 30%;
      opacity: 0.4;
    }

    @keyframes rotate-flow-1 {
      0%   { transform: rotate(0deg)   scale(1)   translate(0%, 0%);   filter: blur(40px) hue-rotate(0deg); }
      25%  { transform: rotate(90deg)  scale(1.1) translate(-5%, 5%);  filter: blur(45px) hue-rotate(90deg); }
      50%  { transform: rotate(180deg) scale(1)   translate(0%, 0%);   filter: blur(40px) hue-rotate(180deg); }
      75%  { transform: rotate(270deg) scale(1.1) translate(5%, -5%);  filter: blur(45px) hue-rotate(270deg); }
      100% { transform: rotate(360deg) scale(1)   translate(0%, 0%);   filter: blur(40px) hue-rotate(360deg); }
    }

    @keyframes rotate-flow-2 {
      0%   { transform: rotate(0deg)   scale(1.2) translate(-10%, 10%); filter: blur(50px) hue-rotate(0deg); }
      33%  { transform: rotate(120deg) scale(1)   translate(5%, -5%);   filter: blur(35px) hue-rotate(120deg); }
      66%  { transform: rotate(240deg) scale(1.1) translate(-5%, 5%);   filter: blur(45px) hue-rotate(240deg); }
      100% { transform: rotate(360deg) scale(1.2) translate(-10%, 10%); filter: blur(50px) hue-rotate(360deg); }
    }

    @keyframes rotate-flow-3 {
      0%   { transform: rotate(0deg)   scale(0.9) translate(15%, -15%); filter: blur(30px) hue-rotate(0deg); }
      40%  { transform: rotate(144deg) scale(1.3) translate(-10%, 10%); filter: blur(55px) hue-rotate(144deg); }
      80%  { transform: rotate(288deg) scale(1)   translate(5%, -5%);   filter: blur(40px) hue-rotate(288deg); }
      100% { transform: rotate(360deg) scale(0.9) translate(15%, -15%); filter: blur(30px) hue-rotate(360deg); }
    }

    .flowing-background, .gradient-layer {
      backface-visibility: hidden;
      perspective: 1000px;
      will-change: transform;
    }

    @media (prefers-reduced-motion: reduce) {
      .gradient-layer-1 { animation-duration: 60s; }
      .gradient-layer-2 { animation-duration: 80s; }
      .gradient-layer-3 { animation-duration: 100s; }
    }

    .demo-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 2rem;
      text-align: center;
      color: white;
    }

    .demo-card {
      background: transparent;
      border: none;
      border-radius: 24px;
      padding: 1.5rem;
      max-width: 100%;
      margin: 1rem 0;
      box-shadow: none;
      animation: none;
    }

    .qr-container { position: relative; display: inline-block; }

    /* Doubled size */
    .qr-code {
      width: 500px; height: 500px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.25);
      transition: all 0.3s ease, opacity ${FADE_MS}ms ease;
      background: white;
      padding: 16px;
    }

    .qr-code:hover {
      transform: scale(1.05);
      box-shadow:
        0 25px 60px rgba(0,0,0,0.5),
        0 10px 30px rgba(0,0,0,0.3),
        inset 0 2px 10px rgba(255,255,255,0.2);
    }

    /* Doubled glow padding */
    .qr-glow {
      position: absolute;
      top: -40px; left: -40px; right: -40px; bottom: -40px;
      background: conic-gradient(from 0deg, var(--c1), var(--c2), var(--c3), var(--c4), var(--c5), var(--c1));
      border-radius: 35px;
      opacity: 0.30;
      filter: blur(15px);
      animation: rotate 8s linear infinite;
      z-index: -1;
      transition: background 500ms ease, opacity ${FADE_MS}ms ease;
    }

    @keyframes rotate {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* ----------- MORE VISIBLE TEXT ----------- */
    .scan-text {
      color: #0f172a;            /* slate-900 for strong contrast */
      font-size: 2.1rem;
      font-weight: 800;          /* bolder */
      margin-top: 1.5rem;
      letter-spacing: 0.2px;
      display: block;
      /* subtle outline so it's readable over busy bg even without pill */
      text-shadow:
        0 1px 2px rgba(255,255,255,0.7),
        0 0 20px rgba(255,255,255,0.35);
      transition: color 300ms ease, opacity ${FADE_MS}ms ease;
    }
    /* High-contrast pill behind the text for maximum legibility */
    .scan-pill {
      display: inline-block;
      padding: 10px 18px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.92);
      color: #0f172a;            /* dark text on light pill */
      border: 1px solid rgba(255,255,255,0.7);
      backdrop-filter: blur(6px) saturate(120%);
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      line-height: 1.1;
    }

    /* Controls (hidden by default, fade-in on tap, fade-out after idle) */
    .controls {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      display: flex;
      gap: 12px;
      padding: 8px 12px;
      border-radius: 9999px;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(10px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.25);
      z-index: 2;
      opacity: 0;
      pointer-events: none;
      transition: opacity 300ms ease;
    }
    .controls.visible {
      opacity: 1;
      pointer-events: auto;
    }
    .controls button {
      appearance: none;
      border: none;
      border-radius: 9999px;
      padding: 10px 16px;
      font-weight: 700;
      cursor: pointer;
      color: white;
      background: #14b8a6;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    }
    .controls button.alt { background: #0ea5e9; }
    .controls button:active { transform: translateY(1px); }
  `;

  /** ---------- QR swapping (every 30s, clock-aligned) ---------- */
  const initialIndex = useMemo(
    () => Math.floor(Date.now() / ROTATE_MS) % QR_TARGETS.length,
    []
  );
  const [qrIndex, setQrIndex] = useState(initialIndex);
  const [isCycling, setIsCycling] = useState(true);
  const [isFading, setIsFading] = useState(false);

  // timer refs
  const alignTimeoutRef = useRef(null);
  const cycleIntervalRef = useRef(null);

  useEffect(() => {
    const clearTimers = () => {
      if (alignTimeoutRef.current) { clearTimeout(alignTimeoutRef.current); alignTimeoutRef.current = null; }
      if (cycleIntervalRef.current) { clearInterval(cycleIntervalRef.current); cycleIntervalRef.current = null; }
    };

    if (!isCycling) {
      clearTimers();
      return;
    }

    const doSwapWithFade = () => {
      setIsFading(true);
      setTimeout(() => {
        setQrIndex(prev => (prev + 1) % QR_TARGETS.length);
        setIsFading(false);
      }, FADE_MS);
    };

    const now = Date.now();
    let delay = ROTATE_MS - (now % ROTATE_MS);
    if (delay === ROTATE_MS) delay = 0;

    alignTimeoutRef.current = setTimeout(() => {
      doSwapWithFade();
      cycleIntervalRef.current = setInterval(doSwapWithFade, ROTATE_MS);
    }, delay);

    return clearTimers;
  }, [isCycling]);

  const current = QR_TARGETS[qrIndex];
  const theme = THEMES[qrIndex % THEMES.length]; // swap theme with QR
  const qrDataUrl = `${API_URL}${current.path}`;
  const qrImgSrc = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(qrDataUrl)}`;

  /** ---------- Dynamic CSS variables for theme ---------- */
  const dynamicVars = `
    :root {
      --base-from: ${theme.baseFrom};
      --base-to:   ${theme.baseTo};
      --c1: ${theme.stops[0]};
      --c2: ${theme.stops[1]};
      --c3: ${theme.stops[2]};
      --c4: ${theme.stops[3]};
      --c5: ${theme.stops[4]};
      --c6: ${theme.stops[5]};
    }
  `;

  /** ---------- SOUND (unchanged) ---------- */
  const [unlocked, setUnlocked] = useState(false);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const KEY = 'qrSoundUnlocked';

  useEffect(() => {
    try { setUnlocked(localStorage.getItem(KEY) === '1'); } catch {}
  }, []);

  const beepFallback = () => {
    try {
      audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(880, ctx.currentTime);
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
      o.start(); o.stop(ctx.currentTime + 0.22);
    } catch {}
  };

  const ding = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return true;
      }
    } catch {}
    beepFallback();
    return true;
  };

  const enableSound = async () => {
    await ding();
    try { localStorage.setItem(KEY, '1'); } catch {}
    setUnlocked(true);
  };

  // SSE / polling for events (unchanged)
  useEffect(() => {
    if (!unlocked) return;
    let es;
    let fallbackTimer = null;

    const startPolling = () => {
      let since = new Date().toISOString();
      const poll = async () => {
        try {
          const res = await fetch(`${API_URL}/qr/events?since=${encodeURIComponent(since)}`);
          const data = await res.json();
          if (data && Array.isArray(data.events) && data.events.length > 0) {
            await ding();
          }
          if (data && data.now) since = data.now;
        } catch {}
        fallbackTimer = setTimeout(poll, 1500);
      };
      poll();
    };

    try {
      es = new EventSource(`${API_URL}/qr/stream`);
      es.onmessage = async (evt) => {
        try { JSON.parse(evt.data); } catch {}
        await ding();
      };
      es.onerror = () => {
        try { es.close(); } catch {}
        if (!fallbackTimer) startPolling();
      };
    } catch (e) {
      startPolling();
    }

    return () => {
      try { es && es.close(); } catch {}
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [unlocked]);

  /** ---------- Controls visibility (hidden by default; show on tap; auto-hide) ---------- */
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimerRef = useRef(null);

  const scheduleHide = () => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 4000);
  };

  useEffect(() => {
    const onUserInteract = () => {
      setControlsVisible(true);
      scheduleHide();
    };
    window.addEventListener('pointerdown', onUserInteract, { passive: true });
    window.addEventListener('touchstart', onUserInteract, { passive: true });
    window.addEventListener('mousemove', onUserInteract, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', onUserInteract);
      window.removeEventListener('touchstart', onUserInteract);
      window.removeEventListener('mousemove', onUserInteract);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  /** ---------- Control handlers ---------- */
  const switchInstant = (key) => {
    setIsCycling(false);
    setIsFading(false);
    const idx = QR_TARGETS.findIndex((q) => q.key === key);
    if (idx >= 0) setQrIndex(idx);
    setControlsVisible(true);
    scheduleHide();
  };

  const startCycling = () => {
    setIsCycling(true);
    setControlsVisible(true);
    scheduleHide();
  };

  // fade style used for auto-cycling transitions
  const fadingStyle = { opacity: isFading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` };

  return (
    <>
      {/* Static CSS + dynamic theme variables */}
      <style dangerouslySetInnerHTML={{ __html: staticStyles }} />
      <style dangerouslySetInnerHTML={{ __html: dynamicVars }} />

      {/* Animated background */}
      <div className="flowing-background">
        <div className="gradient-layer gradient-layer-1" style={fadingStyle}></div>
        <div className="gradient-layer gradient-layer-2" style={fadingStyle}></div>
        <div className="gradient-layer gradient-layer-3" style={fadingStyle}></div>
      </div>

      {/* Foreground content */}
      <div className="demo-content">
        <div className="demo-card" style={{ maxWidth: 'unset' }}>
          <div
            style={{
              display: 'flex',
              gap: '24px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            {/* Single QR that swaps every 30s; colors/theme swap in sync */}
            <div style={{ textAlign: 'center' }}>
              <div className="qr-container" aria-live="polite" aria-atomic="true" style={fadingStyle}>
                <div className="qr-glow" style={fadingStyle}></div>
                <img
                  key={current.key}
                  src={qrImgSrc}
                  alt={current.alt}
                  className="qr-code"
                  style={fadingStyle}
                />
              </div>
              {/* Pill-backed text for max visibility */}
              <p className="scan-text" style={fadingStyle}>
                <span className="scan-pill">{current.label}</span>
              </p>
            </div>
          </div>

          {/* Hidden audio element and enable button */}
          <audio ref={audioRef} src="/ding.wav" preload="auto" playsInline style={{ display: 'none' }} />
          {!unlocked && (
            <div style={{ marginTop: '24px' }}>
              <button
                onClick={enableSound}
                className="btn-primary"
                style={{
                  background: '#14b8a6',
                  color: 'white',
                  borderRadius: 12,
                  padding: '10px 16px',
                  fontWeight: 700,
                }}
              >
                Enable Sound
              </button>
              <div style={{ marginTop: '8px', fontSize: '12px', color: '#e5e7eb' }}>
                Tap once to allow sound on this device.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Controls: hidden by default, fade in on tap, fade out after a few seconds */}
      <div className={`controls ${controlsVisible ? 'visible' : ''}`}>
        <button className="alt" onClick={() => switchInstant('review')}>Review</button>
        <button onClick={() => switchInstant('rewards')}>Referral</button>
        <button className="alt" onClick={startCycling}>
          {isCycling ? 'Cycling…' : 'Cycle'}
        </button>
      </div>
    </>
  );
};

export default DemoPage;
