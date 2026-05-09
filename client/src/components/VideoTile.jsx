import { useEffect, useRef } from 'react';

export default function VideoTile({ stream, label, isLocal }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.srcObject = stream || null;

    if (stream) {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
  }, [stream]);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950 text-left shadow-lg shadow-slate-950/30">
      <video
        autoPlay
        muted={isLocal}
        playsInline
        ref={videoRef}
        className="aspect-video h-auto w-full object-cover"
      />
      {!stream && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-white/10 bg-white/5 text-xl font-black text-cyan-200">
            {(label || 'P').slice(0, 1).toUpperCase()}
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-950/95 to-transparent p-3 text-sm text-slate-100">
        <div className="font-semibold">{label}</div>
        {isLocal ? <div className="text-xs text-slate-400">You</div> : null}
      </div>
    </div>
  );
}
