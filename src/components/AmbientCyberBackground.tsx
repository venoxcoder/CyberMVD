import React, { useEffect, useRef } from 'react';

interface MeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
}

interface DataPulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
}

export const AmbientCyberBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const nodeCount = width < 768 ? 22 : 42;
    const maxDist = width < 768 ? 135 : 175;

    const nodes: MeshNode[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.34,
      vy: (Math.random() - 0.5) * 0.34,
      radius: 1.3 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    }));

    const pulses: DataPulse[] = [];

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener('resize', resize);

    let tick = 0;
    const renderFrame = () => {
      tick += 0.016;
      const isLight = document.documentElement.dataset.theme === 'light';
      ctx.clearRect(0, 0, width, height);

      // Update positions unless reduced motion is enabled
      if (!prefersReducedMotion) {
        for (const n of nodes) {
          n.x += n.vx;
          n.y += n.vy;
          if (n.x < -20) n.x = width + 20;
          if (n.x > width + 20) n.x = -20;
          if (n.y < -20) n.y = height + 20;
          if (n.y > height + 20) n.y = -20;
        }
      }

      // Draw constellation connections
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dist = Math.hypot(dx, dy);
          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * (isLight ? 0.14 : 0.22);
            ctx.strokeStyle = isLight
              ? `rgba(15, 118, 110, ${alpha.toFixed(3)})`
              : `rgba(45, 212, 191, ${alpha.toFixed(3)})`;
            ctx.lineWidth = 0.85;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            // Occasionally spawn a travelling telemetry packet along close edges
            if (!prefersReducedMotion && pulses.length < 7 && Math.random() < 0.0012) {
              pulses.push({
                fromIdx: i,
                toIdx: j,
                progress: 0,
                speed: 0.012 + Math.random() * 0.012,
              });
            }
          }
        }
      }

      // Draw travelling data pulses
      for (let pIdx = pulses.length - 1; pIdx >= 0; pIdx--) {
        const p = pulses[pIdx];
        p.progress += p.speed;
        const a = nodes[p.fromIdx];
        const b = nodes[p.toIdx];
        if (!a || !b || p.progress >= 1 || Math.hypot(b.x - a.x, b.y - a.y) > maxDist * 1.15) {
          pulses.splice(pIdx, 1);
          continue;
        }
        const px = a.x + (b.x - a.x) * p.progress;
        const py = a.y + (b.y - a.y) * p.progress;
        ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.55)' : 'rgba(56, 189, 248, 0.78)';
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw telemetry nodes
      for (const n of nodes) {
        const pulse = 0.65 + 0.35 * Math.sin(tick * 1.8 + n.phase);
        const alpha = (isLight ? 0.22 : 0.42) * pulse;
        ctx.fillStyle = isLight
          ? `rgba(15, 118, 110, ${alpha.toFixed(3)})`
          : `rgba(45, 212, 191, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!prefersReducedMotion) {
        animId = window.requestAnimationFrame(renderFrame);
      }
    };

    renderFrame();

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="noprint pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Subtle tactical coordinate grid */}
      <div className="cyber-bg-grid absolute inset-0" />

      {/* Slow drifting atmospheric glows */}
      <div className="cyber-orb cyber-orb-a" />
      <div className="cyber-orb cyber-orb-b" />

      {/* Horizontal subtle telemetry scan sweep */}
      <div className="cyber-scanline" />

      {/* Live interactive constellation mesh */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
