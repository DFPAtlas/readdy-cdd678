import { useRef, useEffect, useState, useCallback } from 'react';
import { HERO_CONFIG } from '@/config/hero';

type VideoState = 'loading' | 'playing' | 'blocked' | 'error';

export function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoState, setVideoState] = useState<VideoState>('loading');
  const [reducedMotion, setReducedMotion] = useState(false);
  const retryCount = useRef(0);

  // Detect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Robust autoplay with retry
  const attemptAutoplay = useCallback(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) return;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setVideoState('playing');
          retryCount.current = 0;
        })
        .catch((err) => {
          // If blocked, try again up to 3 times with increasing delay
          if (retryCount.current < 3) {
            retryCount.current += 1;
            setTimeout(() => attemptAutoplay(), retryCount.current * 500);
          } else {
            setVideoState('blocked');
          }
        });
    }
  }, [reducedMotion]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      if (!reducedMotion) attemptAutoplay();
    };
    const handleError = () => {
      setVideoState('error');
    };
    const handlePlaying = () => setVideoState('playing');
    const handleLoadedData = () => {
      if (!reducedMotion) attemptAutoplay();
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadeddata', handleLoadedData);

    // Try autoplay immediately if already loaded
    if (video.readyState >= 2 && !reducedMotion) {
      attemptAutoplay();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [attemptAutoplay, reducedMotion]);

  // If reduced motion, show poster/gradient only
  if (reducedMotion) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D10] via-[#141820] to-[#0B0D10]" aria-hidden="true" />
    );
  }

  const showFallback = videoState === 'error' || videoState === 'blocked';
  const isLoading = videoState === 'loading';

  return (
    <>
      {/* Video element — preload auto for reliable autoplay */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={HERO_CONFIG.posterSrc}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${showFallback ? 'opacity-0' : 'opacity-100'}`}
        aria-hidden="true"
        role="presentation"
      >
        <source src={HERO_CONFIG.videoSrc} type="video/mp4" />
      </video>

      {/* Fallback gradient when video fails or is blocked */}
      {showFallback && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D10] via-[#141820] to-[#0B0D10]" aria-hidden="true" />
      )}

      {/* Visible loading shimmer while video buffers — prevents pure black void */}
      {isLoading && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D10] via-[#141820] to-[#0B0D10]" aria-hidden="true">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-pulse" />
        </div>
      )}
    </>
  );
}