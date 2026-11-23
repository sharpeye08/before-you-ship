import { useEffect, useRef, useState } from 'react';
import { createSky } from '../../lib/sky/engine';

// Fixed sky behind the whole page. The renderer lives in lib/sky/engine.ts.
export default function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let sky: ReturnType<typeof createSky> = null;
    try {
      sky = createSky(canvas, {
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      });
    } catch (err) {
      console.warn(err);
    }
    if (!sky) setFallback(true);
    (window as unknown as { __sky?: unknown }).__sky = sky;
    return () => sky?.destroy();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={
        fallback
          ? { background: 'radial-gradient(ellipse at 50% 40%, #2a2c30 0%, #121214 45%, #050506 80%)' }
          : undefined
      }
    >
      <canvas ref={ref} className="block" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
