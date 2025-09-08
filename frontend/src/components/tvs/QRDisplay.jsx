import React from 'react';
import QRCode from 'react-qr-code';

export default function QRDisplay() {
  const current = {
    label: 'Refer a Friend. Get a $50 Gift Card!',
    url: 'https://www.bestdentistduluth.com/login'
  };

  return (
    <>
      <style>{`
        .qr-wrap {
          position: fixed; top: 40%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 13;
          display: flex; flex-direction: column; align-items: center;
          gap: 12px;
        }
        /* Nudge further upward on shorter screens to avoid bottom strip overlap */
        @media (max-height: 900px) { .qr-wrap { top: 38%; } }
        @media (max-height: 800px) { .qr-wrap { top: 36%; } }
        @media (max-height: 700px) { .qr-wrap { top: 34%; } }
        .qr-card {
          padding: 16px;
          border-radius: 24px;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(6px);
          box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 70px rgba(59,130,246,0.45) inset;
          transition: opacity 350ms ease;
        }
        .qr-label {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 8px 14px;
          border-radius: 9999px; /* pill */
          background: #ffffff;
          color: #0b1324;
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          font-weight: 800;
          letter-spacing: 0.02em;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
          font-size: clamp(10px, 1.2vw, 14px);
        }
      `}</style>
      <div className="qr-wrap">
        <div className="qr-card">
          <QRCode value={current.url} size={200} fgColor="#ffffff" bgColor="transparent" />
        </div>
        <div className="qr-label">{current.label}</div>
      </div>
    </>
  );
}
