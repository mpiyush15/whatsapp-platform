'use client';

import { useRef, useState } from 'react';
import { Play } from 'lucide-react';
type MarketingVideoPlayerProps = {
  /** MP4/WebM URL — leave empty until your video is uploaded */
  src?: string;
  poster?: string;
  title: string;
  durationLabel?: string;
  placeholderHint?: string;
};

export function MarketingVideoPlayer({
  src = '',
  poster,
  title,
  durationLabel = '~3 min',
  placeholderHint = 'Video coming soon',
}: MarketingVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasVideo = Boolean(src.trim());

  const handlePlay = async () => {
    if (!hasVideo) return;
    const el = videoRef.current;
    if (!el) return;
    try {
      await el.play();
      setIsPlaying(true);
    } catch {
      /* autoplay policies — user can use native controls */
    }
  };

  return (
    <div className="marketing-video-player group relative w-full overflow-hidden rounded-2xl border border-black/[0.08] bg-[#0f0f0f] shadow-[0_20px_60px_rgba(17,17,17,0.18)]">
      <div className="relative aspect-video w-full">
        {hasVideo ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            src={src}
            poster={poster || undefined}
            controls={isPlaying}
            playsInline
            preload="metadata"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            aria-label={title}
          />
        ) : (
          <div
            className="marketing-video-player__placeholder flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#1a1a1a] via-[#252525] to-[#111111] px-6"
            aria-hidden={false}
          >
            <div className="marketing-video-player__grid absolute inset-0 opacity-30" aria-hidden />
            <WhatsAppPlayGlyph />
            <p className="relative mt-4 text-center text-sm font-medium text-white/90">{title}</p>
            <p className="relative mt-1 text-center text-xs text-white/45">{placeholderHint}</p>
          </div>
        )}

        {hasVideo && !isPlaying ? (
          <button
            type="button"
            onClick={() => void handlePlay()}
            className="marketing-video-player__play absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/35 transition hover:bg-black/45"
            aria-label={`Play video: ${title}`}
          >
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/95 text-[#111111] shadow-lg transition group-hover:scale-105 sm:h-[4.5rem] sm:w-[4.5rem]">
              <Play className="ml-1 h-7 w-7 fill-current" aria-hidden />
            </span>
            <span className="text-sm font-medium text-white">Watch explainer</span>
          </button>
        ) : null}

        {!isPlaying ? (
          <span className="absolute bottom-3 right-3 z-20 rounded-md bg-black/60 px-2 py-1 font-mono text-[10px] font-medium uppercase tracking-wider text-white/80 backdrop-blur-sm">
            {durationLabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function WhatsAppPlayGlyph() {
  return (
    <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#25D366] shadow-[0_8px_32px_rgba(37,211,102,0.35)] sm:h-[4.5rem] sm:w-[4.5rem]">
      <Play className="ml-1 h-7 w-7 fill-white text-white" aria-hidden />
    </span>
  );
}
