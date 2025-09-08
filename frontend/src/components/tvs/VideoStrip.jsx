import React, { useMemo, useRef, useCallback } from 'react';
import { VIDEOS, extractYouTubeId } from '../../data/videos';

export default function VideoStrip() {
  const viewportRef = useRef(null);

  const items = useMemo(() => VIDEOS, []);

  const open = (url) => {
    if (window?.api?.openExternal) window.api.openExternal(url);
    else window.open(url, '_blank', 'noopener,noreferrer');
  };

  const onWheel = useCallback((e) => {
    const el = viewportRef.current;
    if (!el) return;
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  return (
    <>
      <style>{`
        .video-strip-root {
          position: fixed; left: 50%; bottom: 6vh; transform: translateX(-50%);
          width: min(92vw, 1400px);
          padding: 10px 12px;
          border-radius: 16px;
          background: rgba(0,0,0,0.00);
          z-index: 12;
          text-align: center;
        }
        .heading {
          display: inline-block;
          margin-bottom: 10px;
          color: #0b1324; font-weight: 800; font-size: 18px;
          background: #ffffff;
          border-radius: 9999px;
          padding: 8px 12px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
        }
        .video-strip-viewport {
          overflow-x: auto; overflow-y: hidden;
          scroll-behavior: smooth;
          white-space: nowrap;
          scrollbar-width: thin;            /* Firefox */
          -ms-overflow-style: auto;         /* IE/Edge */
        }
        /* WebKit scrollbars */
        .video-strip-viewport::-webkit-scrollbar { height: 8px; }
        .video-strip-viewport::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.30); border-radius: 8px; }
        .video-strip-viewport::-webkit-scrollbar-track { background: rgba(255,255,255,0.35); border-radius: 8px; }
        .video-strip-track {
          display: flex; align-items: flex-start; gap: 18px;
          padding-bottom: 8px;
        }
        .card {
          width: 240px; /* slightly smaller than before */
          flex: 0 0 auto;
          cursor: pointer;
        }
        .thumb-wrap {
          position: relative;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 8px 24px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.15);
          transform: translateY(0);
          transition: transform 140ms ease, box-shadow 140ms ease;
        }
        .thumb-wrap:hover { transform: translateY(-4px); box-shadow: 0 12px 28px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.2); }
        .thumb {
          display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover;
          background: #000;
        }
        .play-badge {
          position: absolute; right: 8px; bottom: 8px;
          background: rgba(255,255,255,0.9);
          color: #0b1324; font-weight: 900; font-size: 14px;
          border-radius: 9999px; padding: 4px 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
          pointer-events: none;
        }
        .title {
          margin-top: 10px; color: #0b1324; font-weight: 800; font-size: 18px;
          text-align: center;
          text-shadow: none;
          background: #ffffff;
          border-radius: 9999px;
          padding: 8px 12px;
          border: 1px solid rgba(0,0,0,0.06);
          box-shadow: 0 6px 16px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.08);
        }
      `}</style>

      <div className="video-strip-root">
        <div className="heading">Prefer a Youtube video?</div>
        <div className="video-strip-viewport" ref={viewportRef} onWheel={onWheel}>
          <div className="video-strip-track">
            {items.map((v, i) => {
              const id = extractYouTubeId(v.link);
              const thumb = id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
              return (
                <div className="card" key={`${v.title}-${i}`} onClick={() => open(v.link)}>
                  <div className="thumb-wrap">
                    <img className="thumb" src={thumb} alt={`${v.title} video`} loading="lazy" />
                    <div className="play-badge">▶</div>
                  </div>
                  <div className="title">{v.title}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
