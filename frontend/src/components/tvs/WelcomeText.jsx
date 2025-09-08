import React from 'react';

export default function WelcomeText({ name }) {
  return (
    <>
      <style>{`
        .welcome {
          position: fixed; top: 10vh; left: 50%;
          transform: translateX(-50%);
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px; /* small gap between pills */
        }
        .pill {
          display: inline-flex; align-items: center; justify-content: center;
          padding: 12px 24px;
          border-radius: 9999px; /* pill/oval */
          background: #ffffff; /* white background */
          color: #0b1324; /* dark navy/black */
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji";
          font-weight: 800; /* bold */
          letter-spacing: 0.02em;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 8px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
          margin: 0 auto;
        }
        .pill-lg {
          font-size: clamp(24px, 4.8vw, 48px);
          padding: 14px 28px;
          min-height: 56px;
        }
        .pill-sm {
          font-size: clamp(12px, 2.2vw, 16px);
          padding: 8px 16px;
          min-height: 40px;
          margin-top: 10px;
        }
      `}</style>
      <div className="welcome">
        <h1 className="pill pill-lg">Welcome to {name || 'Duluth Dental Center'}</h1>
      </div>
    </>
  );
}
