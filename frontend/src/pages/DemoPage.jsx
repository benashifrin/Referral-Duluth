import React, { useEffect, useRef, useState } from 'react';
import { API_URL } from '../services/api';

const DemoPage = () => {
  const styles = `
        .flowing-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 0; /* above body background */
          overflow: hidden;
          pointer-events: none; /* don't block interactions */
          /* Blue background gradient */
          background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
        }

        .gradient-layer {
          position: absolute;
          top: 0;
          left: 0;
          width: 200%;
          height: 200%;
          opacity: 0.8;
          mix-blend-mode: screen;
          filter: blur(40px);
        }

        .gradient-layer-1 {
          background: conic-gradient(
            from 0deg at 50% 50%, 
            #ff6b6b, 
            #4ecdc4, 
            #45b7d1, 
            #96ceb4, 
            #ffeaa7, 
            #ff6b6b
          );
          animation: rotate-flow-1 20s linear infinite;
          transform-origin: center center;
        }

        .gradient-layer-2 {
          background: conic-gradient(
            from 180deg at 30% 70%, 
            #a8e6cf, 
            #ff8a80, 
            #b39ddb, 
            #90caf9, 
            #fff59d, 
            #a8e6cf
          );
          animation: rotate-flow-2 25s linear infinite reverse;
          transform-origin: 30% 70%;
          opacity: 0.6;
        }

        .gradient-layer-3 {
          background: conic-gradient(
            from 90deg at 70% 30%, 
            #ffcc02, 
            #ff6b9d, 
            #c44569, 
            #778beb, 
            #52c41a, 
            #ffcc02
          );
          animation: rotate-flow-3 30s linear infinite;
          transform-origin: 70% 30%;
          opacity: 0.4;
        }

        @keyframes rotate-flow-1 {
          0% {
            transform: rotate(0deg) scale(1) translate(0%, 0%);
            filter: blur(40px) hue-rotate(0deg);
          }
          25% {
            transform: rotate(90deg) scale(1.1) translate(-5%, 5%);
            filter: blur(45px) hue-rotate(90deg);
          }
          50% {
            transform: rotate(180deg) scale(1) translate(0%, 0%);
            filter: blur(40px) hue-rotate(180deg);
          }
          75% {
            transform: rotate(270deg) scale(1.1) translate(5%, -5%);
            filter: blur(45px) hue-rotate(270deg);
          }
          100% {
            transform: rotate(360deg) scale(1) translate(0%, 0%);
            filter: blur(40px) hue-rotate(360deg);
          }
        }

        @keyframes rotate-flow-2 {
          0% {
            transform: rotate(0deg) scale(1.2) translate(-10%, 10%);
            filter: blur(50px) hue-rotate(0deg);
          }
          33% {
            transform: rotate(120deg) scale(1) translate(5%, -5%);
            filter: blur(35px) hue-rotate(120deg);
          }
          66% {
            transform: rotate(240deg) scale(1.1) translate(-5%, 5%);
            filter: blur(45px) hue-rotate(240deg);
          }
          100% {
            transform: rotate(360deg) scale(1.2) translate(-10%, 10%);
            filter: blur(50px) hue-rotate(360deg);
          }
        }

        @keyframes rotate-flow-3 {
          0% {
            transform: rotate(0deg) scale(0.9) translate(15%, -15%);
            filter: blur(30px) hue-rotate(0deg);
          }
          40% {
            transform: rotate(144deg) scale(1.3) translate(-10%, 10%);
            filter: blur(55px) hue-rotate(144deg);
          }
          80% {
            transform: rotate(288deg) scale(1) translate(5%, -5%);
            filter: blur(40px) hue-rotate(288deg);
          }
          100% {
            transform: rotate(360deg) scale(0.9) translate(15%, -15%);
            filter: blur(30px) hue-rotate(360deg);
          }
        }

        .flowing-background,
        .gradient-layer {
          backface-visibility: hidden;
          perspective: 1000px;
          will-change: transform;
        }

        @media (prefers-reduced-motion: reduce) {
          .gradient-layer-1 {
            animation-duration: 60s;
          }
          
          .gradient-layer-2 {
            animation-duration: 80s;
          }
          
          .gradient-layer-3 {
            animation-duration: 100s;
          }
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

        /* Panels for single-QR display with fade */
        .qr-panel {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 900ms ease-in-out;
        }
        .qr-panel.show {
          opacity: 1;
        }

        .demo-card {
          background: transparent; /* Let the gradient show through */
          border: none;
          border-radius: 24px;
          padding: 1.5rem;
          max-width: 100%;
          margin: 0;
          box-shadow: none;
          animation: none;
          position: relative;
          min-height: 100vh; /* full viewport stage for centered layout */
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }

        .qr-container {
          position: relative;
          display: inline-block;
        }

        .qr-code {
          width: 300px; /* larger QR to balance caption */
          height: 300px;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25);
          transition: all 0.3s ease;
          background: white; /* keep small white margin for scanner contrast */
          padding: 10px; /* small white box behind the QR */
        }

        .qr-code:hover {
          transform: scale(1.05);
          box-shadow: 
            0 25px 60px rgba(0,0,0,0.5),
            0 10px 30px rgba(0,0,0,0.3),
            inset 0 2px 10px rgba(255,255,255,0.2);
        }

        .qr-glow {
          position: absolute;
          top: -20px;
          left: -20px;
          right: -20px;
          bottom: -20px;
          background: conic-gradient(
            from 0deg,
            #ff6b6b,
            #4ecdc4,
            #45b7d1,
            #96ceb4,
            #ffeaa7,
            #ff6b6b
          );
          border-radius: 35px;
          opacity: 0.3;
          filter: blur(15px);
          animation: rotate 8s linear infinite;
          z-index: -1;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .scan-text {
          color: #111111; /* black text as requested */
          font-size: 1.6rem; /* readable on iPad without excessive wrapping */
          font-weight: 700;
          margin-top: 0.75rem; /* closer to QR */
          letter-spacing: 0.3px;
          display: block; /* ensure always under the QR */
          text-shadow: 0 2px 6px rgba(255,255,255,0.6); /* subtle pop without large white pill */
        }

        /* Make the enable-sound button text larger on this page only */
        .demo-content .btn-primary {
          font-size: 2rem;
          padding: 20px 28px;
        }

        .demo-title {
          font-size: 3rem;
          margin-bottom: 1rem;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .demo-description {
          font-size: 1.2rem;
          line-height: 1.6;
          margin-bottom: 1rem;
        }
      `;

  // Option A: One-time sound enable, then auto-ding on visit
  const [unlocked, setUnlocked] = useState(false);
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const KEY = 'qrSoundUnlocked';
  const [showReview, setShowReview] = useState(true);

  useEffect(() => {
    try { setUnlocked(localStorage.getItem(KEY) === '1'); } catch {}
  }, []);

  // Alternate the visible QR every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setShowReview(s => !s), 30000);
    return () => clearInterval(id);
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
    // Fallback beep if media is blocked or missing
    beepFallback();
    return true;
  };

  const enableSound = async () => {
    await ding();
    try { localStorage.setItem(KEY, '1'); } catch {}
    setUnlocked(true);
  };

  // Subscribe to immediate QR events via Server-Sent Events; fallback to polling on error
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

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: styles}} />
      
      <div className="flowing-background" style={{
        background: 'linear-gradient(135deg, #0ea5e9 0%, #7c3aed 100%)'
      }} />

      <div className="demo-content">
        <div className="demo-card" style={{maxWidth: 'unset'}}>
          <div style={{
            display: 'flex',
            gap: '96px',
            flexWrap: 'nowrap',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            {/* Refer-a-Friend QR */}
            <div style={{textAlign: 'center'}}>
              <div className="qr-container">
                <div className="qr-glow"></div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${API_URL}/qr/login`)}`}
                  alt="QR Code for BestDentistDuluth.com Login"
                  className="qr-code"
                />
              </div>
              <p className="scan-text" style={{maxWidth:'32rem', margin:'0.75rem auto 0'}}>
                <strong>Refer a Friend!</strong> When they join as a patient, you'll get a $50 gift card.
              </p>
            </div>

            {/* Google Review QR */}
            <div style={{textAlign: 'center'}}>
              <div className="qr-container">
                <div className="qr-glow"></div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`${API_URL}/qr/review`)}`}
                  alt="QR Code to leave a Google review"
                  className="qr-code"
                />
              </div>
              <p className="scan-text" style={{maxWidth:'32rem', margin:'0.75rem auto 0'}}>
                <strong>Leave a Review Today!</strong> Instantly receive a $25 credit to use at your next appointment.
              </p>
            </div>
          </div>

          {/* Hidden audio element and enable button */}
          <audio ref={audioRef} src="/ding.wav" preload="auto" playsInline style={{display:'none'}} />
          {!unlocked && (
            <div style={{position:'fixed', left:0, right:0, bottom:'32px', textAlign:'center'}}>
              <button onClick={enableSound} className="btn-primary" style={{fontSize:'1.5rem', padding:'16px 24px'}}>
                Enable Sound
              </button>
              <div style={{marginTop:'8px', fontSize:'18px', color:'#e5e7eb'}}>Tap once to allow sound on this device.</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default DemoPage;
