// src/components/tvs/Background.jsx
import React from 'react';

export const THEMES = [
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

const FADE_MS = 400;

export default function Background({ theme = THEMES[0], fade = false, zIndex = 0, reducedMotion = false }) {
  const staticCSS = `
    .flowing-background {
      position: fixed;
      top: 0; left: 0;
      width: 100vw; height: 100vh;
      z-index: ${zIndex};
      overflow: hidden;
      pointer-events: none;
      background: linear-gradient(135deg, var(--base-from) 0%, var(--base-to) 100%);
      transition: background 500ms ease;
      backface-visibility: hidden;
      perspective: 1000px;
      ${reducedMotion ? '' : 'will-change: transform;'}
    }

    .gradient-layer {
      position: absolute;
      top: 0; left: 0;
      width: 200%; height: 200%;
      opacity: ${reducedMotion ? '0.35' : '0.8'};
      ${reducedMotion ? '' : 'mix-blend-mode: screen;'}
      ${reducedMotion ? '' : 'filter: blur(40px);'}
      transition: background 500ms ease, opacity ${FADE_MS}ms ease;
      backface-visibility: hidden;
      perspective: 1000px;
      ${reducedMotion ? '' : 'will-change: transform, filter;'}
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
      opacity: ${reducedMotion ? '0.25' : '0.6'};
    }

    .gradient-layer-3 {
      background: conic-gradient(
        from 90deg at 70% 30%,
        var(--c3), var(--c5), var(--c2), var(--c4), var(--c1), var(--c3)
      );
      ${reducedMotion ? '' : 'animation: rotate-flow-3 30s linear infinite;'}
      transform-origin: 70% 30%;
      opacity: ${reducedMotion ? '0.2' : '0.4'};
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

    ${reducedMotion ? '' : `
      @media (prefers-reduced-motion: reduce) {
        .gradient-layer-1 { animation-duration: 60s; }
        .gradient-layer-2 { animation-duration: 80s; }
        .gradient-layer-3 { animation-duration: 100s; }
      }
    `}
  `;

  const vars = `
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

  const fadeStyle = { opacity: fade ? 0 : 1, transition: `opacity ${FADE_MS}ms ease` };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: staticCSS }} />
      <style dangerouslySetInnerHTML={{ __html: vars }} />
      <div className="flowing-background">
        {reducedMotion ? (
          // Static gradient only; no animated layers
          <div style={{ width: '100%', height: '100%' }} />
        ) : (
          <>
            <div className="gradient-layer gradient-layer-1" style={fadeStyle} />
            <div className="gradient-layer gradient-layer-2" style={fadeStyle} />
            <div className="gradient-layer gradient-layer-3" style={fadeStyle} />
          </>
        )}
      </div>
    </>
  );
}
