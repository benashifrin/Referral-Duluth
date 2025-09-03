import React from 'react';

const DemoPage = () => {
  const styles = `
        .flowing-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: -1;
          overflow: hidden;
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

        .demo-card {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px);
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 30px;
          padding: 3rem;
          max-width: 400px;
          margin: 2rem 0;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          animation: float 6s ease-in-out infinite;
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
          width: 280px;
          height: 280px;
          border-radius: 25px;
          box-shadow: 
            0 15px 40px rgba(0,0,0,0.4),
            0 5px 20px rgba(0,0,0,0.2),
            inset 0 2px 10px rgba(255,255,255,0.1);
          transition: all 0.3s ease;
          background: white;
          padding: 15px;
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
          color: rgba(255, 255, 255, 0.9);
          font-size: 1.1rem;
          font-weight: 500;
          margin-top: 1.5rem;
          text-shadow: 0 2px 8px rgba(0,0,0,0.3);
          letter-spacing: 0.5px;
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

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: styles}} />
      
      <div className="flowing-background">
        <div className="gradient-layer gradient-layer-1"></div>
        <div className="gradient-layer gradient-layer-2"></div>
        <div className="gradient-layer gradient-layer-3"></div>
      </div>

      <div className="demo-content">
        <div className="demo-card">
          <div className="qr-container">
            <div className="qr-glow"></div>
            <img 
              src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=https%3A%2F%2Fwww.bestdentistduluth.com%2Flogin&color=2c3e50&bgcolor=ffffff" 
              alt="QR Code for BestDentistDuluth.com Login"
              className="qr-code" 
            />
          </div>
          <p className="scan-text">Scan to enter rewards program</p>
        </div>
      </div>
    </>
  );
};

export default DemoPage;
