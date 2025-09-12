import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../services/api';

const FADE_MS = 400;

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

export default function ReferralProgram() {
  const [themeIndex, setThemeIndex] = useState(0);
  const theme = THEMES[themeIndex % THEMES.length];

  // Cycle background color palette subtly every ~25s for visual interest
  useEffect(() => {
    const t = setInterval(() => setThemeIndex((i) => i + 1), 25000);
    return () => clearInterval(t);
  }, []);

  const staticStyles = `
    .flowing-background { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 0; overflow: hidden; pointer-events: none; background: linear-gradient(135deg, var(--base-from) 0%, var(--base-to) 100%); transition: background 500ms ease; }
    .gradient-layer { position: absolute; top: 0; left: 0; width: 200%; height: 200%; opacity: 0.8; mix-blend-mode: screen; filter: blur(40px); transition: background 500ms ease; }
    .gradient-layer-1 { background: conic-gradient(from 0deg at 50% 50%, var(--c1), var(--c2), var(--c3), var(--c4), var(--c5), var(--c1)); animation: rotate-flow-1 20s linear infinite; transform-origin: center center; }
    .gradient-layer-2 { background: conic-gradient(from 180deg at 30% 70%, var(--c2), var(--c4), var(--c3), var(--c5), var(--c1), var(--c2)); animation: rotate-flow-2 25s linear infinite reverse; transform-origin: 30% 70%; opacity: 0.6; }
    .gradient-layer-3 { background: conic-gradient(from 90deg at 70% 30%, var(--c3), var(--c5), var(--c2), var(--c4), var(--c1), var(--c3)); animation: rotate-flow-3 30s linear infinite; transform-origin: 70% 30%; opacity: 0.4; }
    @keyframes rotate-flow-1 { 0%{transform:rotate(0) scale(1)}25%{transform:rotate(90deg) scale(1.1)}50%{transform:rotate(180deg) scale(1)}75%{transform:rotate(270deg) scale(1.1)}100%{transform:rotate(360deg) scale(1)} }
    @keyframes rotate-flow-2 { 0%{transform:rotate(0) scale(1.2)}33%{transform:rotate(120deg) scale(1)}66%{transform:rotate(240deg) scale(1.1)}100%{transform:rotate(360deg) scale(1.2)} }
    @keyframes rotate-flow-3 { 0%{transform:rotate(0) scale(0.9)}40%{transform:rotate(144deg) scale(1.3)}80%{transform:rotate(288deg) scale(1)}100%{transform:rotate(360deg) scale(0.9)} }
    @media (prefers-reduced-motion: reduce) { .gradient-layer-1 { animation-duration: 60s; } .gradient-layer-2 { animation-duration: 80s; } .gradient-layer-3 { animation-duration: 100s; } }
    .demo-content { position: relative; z-index: 1; display: flex; min-height: 100vh; align-items: center; justify-content: center; padding: 24px; }
    .demo-card { background: rgba(255,255,255,0.1); backdrop-filter: blur(12px); border-radius: 24px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.25); padding: 32px; color: #fff; text-align: center; max-width: 720px; width: 100%; }
    .headline { font-size: clamp(22px, 4vw, 36px); font-weight: 800; margin: 0 0 8px; color: #000; text-shadow: none; }
    .subtext { font-size: clamp(14px, 2.6vw, 18px); opacity: .95; margin: 0; color: #000; }
    .qr-container { position: relative; width: 240px; height: 240px; margin: 12px auto 4px; }
    .qr-glow { position: absolute; inset: -12px; border-radius: 24px; background: radial-gradient(50% 50% at 50% 50%, rgba(255,255,255,.35), rgba(255,255,255,0)); filter: blur(8px); }
    .qr-code { width: 100%; height: 100%; border-radius: 24px; border: 2px solid rgba(255,255,255,0.55); box-shadow: 0 20px 60px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(255,255,255,0.15); background: rgba(0,0,0,0.15); object-fit: cover; }
    .scan-text { margin-top: 12px; }
    /* ReferralProgram-only pill style per spec */
    .scan-pill {
      display: inline-block;
      border-radius: 9999px; /* fully curved edges */
      background: #FFFFFF; /* solid white */
      color: #0D0D0D; /* near-black */
      padding: 12px 20px; /* generous */
      font-family: Inter, "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 700; /* bold 600–700 */
      font-size: clamp(16px, 3.8vw, 18px); /* medium-large */
      letter-spacing: 0; /* normal kerning */
      line-height: 1; /* pill height harmony */
      /* soft drop shadow / glow with teal/blue tint */
      box-shadow:
        0 8px 20px rgba(20, 184, 166, 0.25), /* teal */
        0 0 18px rgba(30, 144, 255, 0.15),   /* blue glow */
        0 2px 6px rgba(0, 0, 0, 0.06);      /* subtle depth */
      border: 1px solid rgba(14, 165, 233, 0.10); /* faint cool border */
    }
  `;

  const dynamicVars = useMemo(() => `
    :root { --base-from: ${theme.baseFrom}; --base-to: ${theme.baseTo}; --c1: ${theme.stops[0]}; --c2: ${theme.stops[1]}; --c3: ${theme.stops[2]}; --c4: ${theme.stops[3]}; --c5: ${theme.stops[4]}; }
  `, [theme]);

  const [qrUrl, setQrUrl] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [isFading, setIsFading] = useState(false);
  const hideTimerRef = useRef(null);
  const socketRef = useRef(null);

  const resetTimer = (ms = 120000) => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setQrUrl(null);
      setExpiresAt(null);
    }, ms);
  };

  useEffect(() => {
    // Connect Socket.IO
    const base = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : API_URL;
    const socket = io(base, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_qr_display');
    });
    socket.on('new_qr', (payload) => {
      const { qr_url, expires_at, landing_url, first_name } = payload || {};
      if (landing_url) {
        console.log('[QR] Landing URL:', landing_url);
      }
      if (qr_url) {
        setIsFading(true);
        setTimeout(() => {
          setQrUrl(qr_url);
          setExpiresAt(expires_at || null);
          if (typeof first_name === 'string' && first_name.trim()) {
            const m = first_name.trim().match(/[A-Za-z][A-Za-z\-']*/);
            setFirstName(m ? m[0] : '');
          } else {
            setFirstName('');
          }
          setIsFading(false);
          // Auto-hide after 2 minutes regardless, as safety
          resetTimer(120000);
        }, FADE_MS);
      }
    });
    socket.on('qr_clear', () => {
      setIsFading(true);
      setTimeout(() => {
        setQrUrl(null);
        setExpiresAt(null);
        setFirstName('');
        setIsFading(false);
      }, FADE_MS);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    });

    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      try { socket.disconnect(); } catch {}
    };
  }, []);

  const fadingStyle = { opacity: isFading ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: staticStyles }} />
      <style dangerouslySetInnerHTML={{ __html: dynamicVars }} />

      <div className="flowing-background">
        <div className="gradient-layer gradient-layer-1" style={fadingStyle}></div>
        <div className="gradient-layer gradient-layer-2" style={fadingStyle}></div>
        <div className="gradient-layer gradient-layer-3" style={fadingStyle}></div>
      </div>

      <div className="demo-content">
        <div className="demo-card">
          {qrUrl ? (
            <div>
              {firstName ? (
                <p className="thankyou" style={{ marginBottom: 10, color: '#000', fontWeight: 800, fontSize: 'clamp(16px, 3.5vw, 24px)' }}>
                  Thank you for joining our referral program, {firstName}.
                </p>
              ) : null}
              <div className="qr-container" style={fadingStyle}>
                <div className="qr-glow" />
                <img src={qrUrl} alt="Referral QR" className="qr-code" />
              </div>
              <p className="scan-text"><span className="scan-pill">Scan this code to view your referral code.</span></p>
            </div>
          ) : (
            <div style={fadingStyle}>
              <h1 className="headline">Welcome to Duluth Dental Center</h1>
              <p className="subtext">Ask us about our referral program</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
