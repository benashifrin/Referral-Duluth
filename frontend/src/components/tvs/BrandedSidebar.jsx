import React from 'react';

export default function BrandedSidebar({ name, reducedMotion = false }) {
  const welcomeText = name === 'Duluth Dental Center' 
    ? 'Welcome to Duluth Dental Center' 
    : `Welcome ${name}`;

  return (
    <>
      <style>{`
        /* CSS Variables for gradient colors */
        :root {
          --c1: #0e7490;
          --c2: #06b6d4;
          --c3: #99f6e4;
          --c4: #a7f3d0;
          --c5: #b5c7f2;
          --base-from: #b5c7f2;
          --base-to: #14b8a6;
        }

        .branded-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: rgba(0, 0, 0, ${reducedMotion ? '0.5' : '0.6'});
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: flex-start;
          padding-left: 8%;
          pointer-events: none;
        }
        
        .gradient-container {
          position: relative;
          width: 500px;
          height: 700px;
          border-radius: 24px;
          overflow: hidden;
          pointer-events: auto;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
          background: linear-gradient(135deg, var(--base-from) 0%, var(--base-to) 100%);
        }
        
        .gradient-layer {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          opacity: ${reducedMotion ? '0.2' : '0.8'};
          ${reducedMotion ? '' : 'mix-blend-mode: screen;'}
          ${reducedMotion ? '' : 'filter: blur(25px);'}
          backface-visibility: hidden;
          perspective: 1000px;
          ${reducedMotion ? '' : 'will-change: transform;'}
          contain: layout style paint;
          transform: translate3d(0, 0, 0);
        }
        
        .gradient-layer-1 {
          background: conic-gradient(
            from 0deg at 50% 50%,
            var(--c1), var(--c2), var(--c3), var(--c4), var(--c5), var(--c1)
          );
          ${reducedMotion ? '' : 'animation: rotate-flow-1 20s linear infinite;'}
          transform-origin: center center;
        }
        
        .gradient-layer-2 {
          background: conic-gradient(
            from 180deg at 30% 70%,
            var(--c2), var(--c4), var(--c3), var(--c5), var(--c1), var(--c2)
          );
          ${reducedMotion ? '' : 'animation: rotate-flow-2 25s linear infinite reverse;'}
          transform-origin: 30% 70%;
          opacity: ${reducedMotion ? '0.15' : '0.6'};
        }
        
        .gradient-layer-3 {
          background: conic-gradient(
            from 90deg at 70% 30%,
            var(--c3), var(--c5), var(--c2), var(--c4), var(--c1), var(--c3)
          );
          ${reducedMotion ? '' : 'animation: rotate-flow-3 30s linear infinite;'}
          transform-origin: 70% 30%;
          opacity: ${reducedMotion ? '0.1' : '0.4'};
        }
        
        ${reducedMotion ? '' : `@keyframes rotate-flow-1 {
          0%   { transform: rotate(0deg)   scale(1)   translate(0%, 0%);   filter: blur(25px); }
          25%  { transform: rotate(90deg)  scale(1.1) translate(-5%, 5%);  filter: blur(28px); }
          50%  { transform: rotate(180deg) scale(1)   translate(0%, 0%);   filter: blur(25px); }
          75%  { transform: rotate(270deg) scale(1.1) translate(5%, -5%);  filter: blur(28px); }
          100% { transform: rotate(360deg) scale(1)   translate(0%, 0%);   filter: blur(25px); }
        }`}
        
        ${reducedMotion ? '' : `@keyframes rotate-flow-2 {
          0%   { transform: rotate(0deg)   scale(1.2) translate(-10%, 10%); filter: blur(30px); }
          33%  { transform: rotate(120deg) scale(1)   translate(5%, -5%);   filter: blur(20px); }
          66%  { transform: rotate(240deg) scale(1.1) translate(-5%, 5%);   filter: blur(25px); }
          100% { transform: rotate(360deg) scale(1.2) translate(-10%, 10%); filter: blur(30px); }
        }`}
        
        ${reducedMotion ? '' : `@keyframes rotate-flow-3 {
          0%   { transform: rotate(0deg)   scale(0.9) translate(15%, -15%); filter: blur(20px); }
          40%  { transform: rotate(144deg) scale(1.3) translate(-10%, 10%); filter: blur(32px); }
          80%  { transform: rotate(288deg) scale(1)   translate(5%, -5%);   filter: blur(25px); }
          100% { transform: rotate(360deg) scale(0.9) translate(15%, -15%); filter: blur(20px); }
        }`}
        
        ${reducedMotion ? '' : `@media (prefers-reduced-motion: reduce) {
          .gradient-layer-1 { animation-duration: 60s; }
          .gradient-layer-2 { animation-duration: 80s; }
          .gradient-layer-3 { animation-duration: 100s; }
        }`}
        
        /* Performance fallback for low-end devices */
        @media (max-resolution: 1dppx) {
          .gradient-layer {
            filter: blur(15px);
            opacity: 0.6;
          }
          .gradient-layer-1 { animation-duration: 40s; }
          .gradient-layer-2 { animation-duration: 60s; }
          .gradient-layer-3 { animation-duration: 80s; }
        }
        
        .branded-content {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 50px;
          padding: 60px 40px;
          text-align: center;
        }
        
        .welcome-text {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 32px;
          line-height: 1.2;
          letter-spacing: -0.5px;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.2);
        }
        
        .qr-section {
          background: rgba(255, 255, 255, 0.95);
          padding: 30px;
          border-radius: 20px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        
        .cta-text {
          font-family: 'Inter', sans-serif;
          font-weight: 800;
          font-size: 26px;
          line-height: 1.3;
          letter-spacing: -0.3px;
          color: white;
          text-shadow: 0 2px 8px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.2);
        }
      `}</style>

      <div className="branded-overlay">
        <div className="gradient-container">
          {reducedMotion ? null : (
            <>
              <div className="gradient-layer gradient-layer-1"></div>
              <div className="gradient-layer gradient-layer-2"></div>
              <div className="gradient-layer gradient-layer-3"></div>
            </>
          )}

          <div className="branded-content">
            <div className="welcome-text">
              {welcomeText}
            </div>
            
            <div className="qr-section">
              <img 
                src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://www.bestdentistduluth.com/login"
                alt="QR Code for Duluth Dental Center"
                style={{
                  width: '180px',
                  height: '180px',
                  border: '2px solid #0b1324',
                  borderRadius: '12px',
                  display: 'block'
                }}
              />
            </div>
            
            <div className="cta-text">
              Refer a Friend.<br/>
              Get a $50 Gift Card!
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
