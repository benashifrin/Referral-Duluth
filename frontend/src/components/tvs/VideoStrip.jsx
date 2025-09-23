import React, { useEffect, useRef, useState, useCallback } from 'react';
import { VIDEOS, extractYouTubeId } from '../../data/videos';

export default function VideoStrip() {
  const playerRef = useRef(null);
  const [player, setPlayer] = useState(null);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const currentIndexRef = useRef(0);
  const changeVideoRef = useRef(null);
  const progressCheckInterval = useRef(null);

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
            console.log('🎥 YouTube player ready');
            try {
              // Ensure muted to satisfy autoplay policies and always start silent
              event.target.mute();
              event.target.setVolume(0);
              // Kick playback explicitly in case browser blocks implicit autoplay
              event.target.playVideo();
            } catch (e) {
              console.error('Error in onReady:', e);
            }
            setPlayer(event.target);
            setIsPlayerReady(true);
            
            // Start progress monitoring as fallback
            if (progressCheckInterval.current) {
              clearInterval(progressCheckInterval.current);
            }
            
            progressCheckInterval.current = setInterval(() => {
              try {
                if (event.target && event.target.getCurrentTime && event.target.getDuration) {
                  const currentTime = event.target.getCurrentTime();
                  const duration = event.target.getDuration();
                  const state = event.target.getPlayerState();
                  
                  // Check if video is near the end (within 1 second) and not already ended
                  if (duration > 0 && currentTime > 0 && (duration - currentTime) < 1 && state !== window.YT.PlayerState.ENDED) {
                    console.log('🎬 Fallback: Video near end detected via progress monitoring');
                    console.log(`⏰ Current time: ${currentTime}, Duration: ${duration}, State: ${state}`);
                    
                    const currentIndex = currentIndexRef.current;
                    const next = (currentIndex + 1) % VIDEOS.length;
                    console.log(`📽️ Fallback advancing: Current ${currentIndex} -> Next ${next}`);
                    
                    if (changeVideoRef.current) {
                      changeVideoRef.current(next);
                    }
                  }
                }
              } catch (e) {
                // Silently ignore errors in progress monitoring
              }
            }, 1000); // Check every second
          },
          onStateChange: (event) => {
            console.log('🎬 Player state changed:', event.data);
            console.log('🎬 Available states:', {
              ENDED: window.YT?.PlayerState?.ENDED,
              PLAYING: window.YT?.PlayerState?.PLAYING,
              PAUSED: window.YT?.PlayerState?.PAUSED,
              BUFFERING: window.YT?.PlayerState?.BUFFERING,
              CUED: window.YT?.PlayerState?.CUED
            });
            
            if (event.data === window.YT.PlayerState.ENDED) {
              console.log('🔄 Video ended, advancing to next video...');
              const currentIndex = currentIndexRef.current;
              const next = (currentIndex + 1) % VIDEOS.length;
              console.log(`📽️ Current: ${currentIndex}, Next: ${next}, Total videos: ${VIDEOS.length}`);
              
              // Use a more reliable delay and ensure the function exists
              setTimeout(() => {
                console.log('⏰ Timeout fired, calling changeVideo...');
                if (changeVideoRef.current && typeof changeVideoRef.current === 'function') {
                  changeVideoRef.current(next);
                } else {
                  console.error('❌ changeVideoRef.current is not available!', changeVideoRef.current);
                }
              }, 500); // Longer delay to ensure everything is ready
            }
          }
        }
      });
      
      setPlayer(newPlayer);
    }
  }, []);

  const changeVideo = useCallback((index) => {
    console.log(`🎯 changeVideo called with index: ${index}`);
    console.log(`📺 Player available:`, !!player);
    console.log(`🔧 Player loadVideoById available:`, !!(player && player.loadVideoById));
    
    if (player && player.loadVideoById) {
      const videoId = extractYouTubeId(VIDEOS[index].link);
      console.log(`🆔 Loading video ID: ${videoId} (${VIDEOS[index].title})`);
      
      try {
        player.mute();
        player.setVolume(0);
        player.loadVideoById(videoId);
        console.log(`✅ Video loaded successfully`);
      } catch (e) {
        console.error('❌ Error loading video:', e);
      }
    } else {
      console.warn('⚠️ Player not ready or loadVideoById not available');
    }
    
    setCurrentVideoIndex(index);
    currentIndexRef.current = index;
    console.log(`📊 Updated currentIndexRef to: ${index}`);
  }, [player]);

  // Keep the ref updated with the latest function
  useEffect(() => {
    changeVideoRef.current = changeVideo;
  }, [changeVideo]);

  // Remove pause/resume functionality - video always plays

  // Initialize player only once when component mounts
  useEffect(() => {
    if (!player && playerRef.current) {
      console.log('🚀 Initializing player for the first time');
      initPlayer();
    }
  }, [initPlayer, player]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (progressCheckInterval.current) {
        clearInterval(progressCheckInterval.current);
      }
    };
  }, []);

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
