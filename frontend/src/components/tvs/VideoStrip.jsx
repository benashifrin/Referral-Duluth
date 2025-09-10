import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VIDEOS, extractYouTubeId } from '../../data/videos';

export default function VideoStrip() {
  const playerRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  // Initialize YouTube player with faster loading
  useEffect(() => {
    const setupPlayer = () => {
      if (window.YT && window.YT.Player) {
        initPlayer();
      } else {
        // Retry after short delay if API not ready
        setTimeout(setupPlayer, 100);
      }
    };

    if (!window.YT || !window.YT.Player) {
      window.onYouTubeIframeAPIReady = setupPlayer;
    } else {
      setupPlayer();
    }
  }, []);

  const initPlayer = useCallback(() => {
    if (playerRef.current && VIDEOS[currentVideoIndex]) {
      const videoId = extractYouTubeId(VIDEOS[currentVideoIndex].link);
      
      const newPlayer = new window.YT.Player(playerRef.current, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          playsinline: 1,
          enablejsapi: 1,
          vq: 'hd720',
          preload: 'auto'
        },
        events: {
          onReady: (event) => {
            setPlayer(event.target);
            setIsPlayerReady(true);
          }
        }
      });
      
      setPlayer(newPlayer);
    }
  }, [currentVideoIndex]);

  const changeVideo = (index) => {
    if (player && player.loadVideoById) {
      const videoId = extractYouTubeId(VIDEOS[index].link);
      player.loadVideoById(videoId);
    }
    setCurrentVideoIndex(index);
  };

  // Remove pause/resume functionality - video always plays

  // Initialize player only once
  useEffect(() => {
    if (isPlayerReady && player && currentVideoIndex === 0) {
      // Player is ready and this is the initial load
      return;
    }
  }, [currentVideoIndex, isPlayerReady, player]);

  return (
    <>
      <style>{`
        .youtube-player-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 1;
        }
        .video-selector {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 25;
          background: rgba(0,0,0,0.7);
          border-radius: 12px;
          padding: 12px;
        }
        .video-selector select {
          background: rgba(255,255,255,0.9);
          border: none;
          border-radius: 8px;
          padding: 8px 12px;
          color: #0b1324;
          font-weight: 600;
          cursor: pointer;
        }
        .video-selector select:focus {
          outline: 2px solid #ffffff;
        }
      `}</style>

      <div className="youtube-player-container">
        <div ref={playerRef}></div>
      </div>

      <div className="video-selector">
        <select 
          value={currentVideoIndex} 
          onChange={(e) => changeVideo(parseInt(e.target.value))}
        >
          {VIDEOS.map((video, index) => (
            <option key={index} value={index}>
              {video.title}
            </option>
          ))}
        </select>
      </div>
    </>
  );
}
