import { useEffect, useRef, useState } from 'react';
import { createSky } from '../../lib/sky/engine';

// Fixed sky behind the whole page. The renderer lives in lib/sky/engine.ts.
// It tells the page which section is on screen with a `sky:section` event.
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
        onSection: (index, name) => dispatchEvent(new CustomEvent('sky:section', { detail: { index, name } })),
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
          ? { background: 'radial-gradient(ellipse at 50% 40%, #1a1d4a 0%, #0a0c1e 45%, #03040a 80%)' }
          : undefined
      }
    >
      <canvas ref={ref} className="block" style={{ imageRendering: 'pixelated' }} />
    </div>
  );
}
