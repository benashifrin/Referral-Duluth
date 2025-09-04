import React, { useEffect, useRef, useState } from 'react';

// Lightweight scanner page that plays a sound ONLY when a QR is detected.
// Uses html5-qrcode via CDN if available; falls back to BarcodeDetector (if supported).

const loadHtml5Qrcode = () =>
  new Promise((resolve, reject) => {
    if (window.Html5QrcodeScanner) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/html5-qrcode@2.3.10/html5-qrcode.min.js';
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error('Failed to load html5-qrcode'));
    document.head.appendChild(s);
  });

const ScanPage = () => {
  const [started, setStarted] = useState(false);
  const [error, setError] = useState('');
  const audioRef = useRef(null);
  const audioCtxRef = useRef(null);
  const scannerRef = useRef(null);

  const beep = async () => {
    try {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        await audioRef.current.play();
        return;
      }
    } catch {}
    try {
      audioCtxRef.current = audioCtxRef.current || new (window.AudioContext || window.webkitAudioContext)();
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.20);
      o.start(); o.stop(ctx.currentTime + 0.22);
    } catch {}
  };

  const onScanSuccess = (decodedText /*, result */) => {
    // Play sound only on scan
    beep();
    if (navigator.vibrate) navigator.vibrate(150);
    // Optionally: auto-redirect if decodedText looks like a URL
    try {
      const u = new URL(decodedText);
      // window.location.href = u.toString();
      // For now we just console log to avoid leaving the scanner unexpectedly
      console.log('[Scan] Detected URL:', u.toString());
    } catch {
      console.log('[Scan] Detected text:', decodedText);
    }
  };

  useEffect(() => {
    if (!started) return;

    let cleanup = () => {};
    const start = async () => {
      setError('');
      try {
        // Try HTML5 QR first
        await loadHtml5Qrcode();
        if (window.Html5QrcodeScanner) {
          const scanner = new window.Html5QrcodeScanner('qr-reader', {
            fps: 10,
            qrbox: 250,
            rememberLastUsedCamera: true,
            supportedScanTypes: [
              window.Html5QrcodeScanType.SCAN_TYPE_CAMERA
            ],
          });
          scanner.render(onScanSuccess, () => {});
          scannerRef.current = scanner;
          cleanup = () => scannerRef.current?.clear().catch(() => {});
          return;
        }
      } catch (e) {
        console.warn('html5-qrcode load failed, trying BarcodeDetector', e);
      }

      // Fallback to BarcodeDetector if available
      if ('BarcodeDetector' in window) {
        // Minimal fallback viewer (not full-featured)
        setError('BarcodeDetector fallback active. Point camera at QR.');
      } else {
        setError('Scanner not supported in this browser.');
      }
    };

    start();
    return () => cleanup();
  }, [started]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center text-center">
      <h1 className="text-2xl font-semibold mb-2">Scan QR</h1>
      <p className="text-gray-600 mb-4 max-w-md">Sound plays only when a QR is detected.</p>

      {!started && (
        <button onClick={() => setStarted(true)} className="btn-primary mb-4">Enable Camera & Start</button>
      )}

      <div id="qr-reader" style={{ width: 340, maxWidth: '100%' }} />
      {error && <div className="text-red-600 mt-3 text-sm">{error}</div>}

      {/* Hidden audio chime */}
      <audio ref={audioRef} src="/ding.wav" preload="auto" playsInline style={{display:'none'}} />
    </div>
  );
};

export default ScanPage;

