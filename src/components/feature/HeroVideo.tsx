import { useRef, useEffect, useState, useCallback } from 'react';
import { HERO_CONFIG } from '@/config/hero';

type VideoState = 'loading' | 'playing' | 'blocked' | 'error';

/**
 * Hero background layer.
 *
 * Order of paint (bottom to top):
 *   1. Poster still — painted immediately, so the hero is never a black void.
 *   2. Video — fades in only once it is actually playing.
 *   3. Soft amber glow — warms the frame so it never reads as flat black.
 */
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
        .catch(() => {
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
    if (!video || reducedMotion) return;

    const handleCanPlay = () => attemptAutoplay();
    const handleError = () => setVideoState('error');
    const handlePlaying = () => setVideoState('playing');
    const handleLoadedData = () => attemptAutoplay();

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('loadeddata', handleLoadedData);

    // Try autoplay immediately if already loaded
    if (video.readyState >= 2) {
      attemptAutoplay();
    }

    return () => {
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [attemptAutoplay, reducedMotion]);

  const videoVisible = !reducedMotion && videoState === 'playing';

  return (
    <>
      {/* 1. Poster still — always painted underneath, never a black void */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src={HERO_CONFIG.posterSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Warm charcoal wash so the still blends into the dark theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B0D10]/70 via-[#141820]/25 to-[#0B0D10]/70" />
      </div>

      {/* 2. Video — fades in only once it is genuinely playing */}
      {!reducedMotion && (
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={HERO_CONFIG.posterSrc}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
            videoVisible ? 'opacity-100' : 'opacity-0'
          }`}
          aria-hidden="true"
          role="presentation"
        >
          <source src={HERO_CONFIG.videoSrc} type="video/mp4" />
        </video>
      )}

      {/* 3. Soft amber glow low in the frame — keeps the hero from reading flat black */}
      <div
        className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[760px] h-[460px] rounded-full bg-forge-amber/8 blur-[130px] pointer-events-none"
        aria-hidden="true"
      />
    </>
  );
}