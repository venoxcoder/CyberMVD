import React, { useEffect, useRef } from 'react';

interface MeshNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  boost: number;
}

interface DataPulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
}

interface ClickRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

interface ClickSpark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  radius: number;
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
    const motionFactor = prefersReducedMotion ? 0.45 : 1;

    let animId = 0;
    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const nodeCount = width < 768 ? 26 : 52;
    const maxDist = width < 768 ? 145 : 190;

    const nodes: MeshNode[] = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.46 * motionFactor,
      vy: (Math.random() - 0.5) * 0.46 * motionFactor,
      radius: 1.5 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
      boost: 0,
    }));

    const pulses: DataPulse[] = [];
    const ripples: ClickRipple[] = [];
    const sparks: ClickSpark[] = [];
    const pointer = { x: -9999, y: -9999, active: false };

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

    const spawnClickWave = (x: number, y: number) => {
      ripples.push({
        x,
        y,
        radius: 6,
        maxRadius: width < 768 ? 180 : 260,
        alpha: 0.72,
      });
      ripples.push({
        x,
        y,
        radius: 2,
        maxRadius: width < 768 ? 115 : 165,
        alpha: 0.48,
      });

      const sparkCount = prefersReducedMotion ? 4 : 9;
      for (let s = 0; s < sparkCount; s++) {
        const angle = (Math.PI * 2 * s) / sparkCount + (Math.random() - 0.5) * 0.45;
        const speed = 1.4 + Math.random() * 2.1;
        sparks.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          radius: 1.4 + Math.random() * 1.4,
        });
      }

      // Gently energize nearby mesh nodes so the constellation reacts to every click
      for (const n of nodes) {
        const dx = n.x - x;
        const dy = n.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist > 0 && dist < 210) {
          const force = (1 - dist / 210) * 0.65;
          n.vx = Math.max(-1.6, Math.min(1.6, n.vx + (dx / dist) * force));
          n.vy = Math.max(-1.6, Math.min(1.6, n.vy + (dy / dist) * force));
          n.boost = Math.min(1, n.boost + (1 - dist / 210) * 0.9);
        }
      }

      if (ripples.length > 14) ripples.splice(0, ripples.length - 14);
      if (sparks.length > 48) sparks.splice(0, sparks.length - 48);
    };

    const onPointerDown = (e: PointerEvent) => {
      spawnClickWave(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };

    const onPointerLeave = () => {
      pointer.active = false;
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('blur', onPointerLeave);

    let tick = 0;
    const renderFrame = () => {
      tick += 0.018 * motionFactor;
      const isLight = document.documentElement.dataset.theme === 'light';
      ctx.clearRect(0, 0, width, height);

      // Update mesh positions + damp excess click velocity back to calm cruise speed
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        const speed = Math.hypot(n.vx, n.vy);
        if (speed > 0.55) {
          n.vx *= 0.985;
          n.vy *= 0.985;
        }
        if (n.boost > 0) {
          n.boost = Math.max(0, n.boost - 0.015);
        }
        if (n.x < -24) n.x = width + 24;
        if (n.x > width + 24) n.x = -24;
        if (n.y < -24) n.y = height + 24;
        if (n.y > height + 24) n.y = -24;
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
            const energy = Math.max(a.boost, b.boost) * 0.16;
            const alpha = (1 - dist / maxDist) * (isLight ? 0.22 : 0.34) + energy;
            ctx.strokeStyle = isLight
              ? `rgba(15, 118, 110, ${Math.min(0.65, alpha).toFixed(3)})`
              : `rgba(45, 212, 191, ${Math.min(0.75, alpha).toFixed(3)})`;
            ctx.lineWidth = energy > 0.05 ? 1.25 : 0.95;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            if (pulses.length < 11 && Math.random() < 0.0022) {
              pulses.push({
                fromIdx: i,
                toIdx: j,
                progress: 0,
                speed: (0.014 + Math.random() * 0.014) * motionFactor,
              });
            }
          }
        }

        // Cursor telemetry proximity links
        if (pointer.active) {
          const pDist = Math.hypot(pointer.x - a.x, pointer.y - a.y);
          if (pDist < 170) {
            const pAlpha = (1 - pDist / 170) * (isLight ? 0.28 : 0.42);
            ctx.strokeStyle = isLight
              ? `rgba(2, 132, 199, ${pAlpha.toFixed(3)})`
              : `rgba(56, 189, 248, ${pAlpha.toFixed(3)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(pointer.x, pointer.y);
            ctx.stroke();
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
        ctx.fillStyle = isLight ? 'rgba(2, 132, 199, 0.72)' : 'rgba(56, 189, 248, 0.9)';
        ctx.beginPath();
        ctx.arc(px, py, 2.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw telemetry nodes
      for (const n of nodes) {
        const pulse = 0.65 + 0.35 * Math.sin(tick * 2 + n.phase);
        const alpha = Math.min(0.95, (isLight ? 0.34 : 0.56) * pulse + n.boost * 0.4);
        ctx.fillStyle = isLight
          ? `rgba(15, 118, 110, ${alpha.toFixed(3)})`
          : `rgba(45, 212, 191, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + n.boost * 1.1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw interactive click sonar ripples
      for (let rIdx = ripples.length - 1; rIdx >= 0; rIdx--) {
        const r = ripples[rIdx];
        r.radius += (r.maxRadius - r.radius) * 0.08 + 1.8;
        r.alpha *= 0.945;
        if (r.alpha < 0.02 || r.radius >= r.maxRadius) {
          ripples.splice(rIdx, 1);
          continue;
        }
        ctx.strokeStyle = isLight
          ? `rgba(15, 118, 110, ${r.alpha.toFixed(3)})`
          : `rgba(45, 212, 191, ${r.alpha.toFixed(3)})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Draw click telemetry sparks
      for (let sIdx = sparks.length - 1; sIdx >= 0; sIdx--) {
        const sp = sparks[sIdx];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.96;
        sp.vy *= 0.96;
        sp.life -= 0.028;
        if (sp.life <= 0) {
          sparks.splice(sIdx, 1);
          continue;
        }
        ctx.fillStyle = isLight
          ? `rgba(2, 132, 199, ${(sp.life * 0.75).toFixed(3)})`
          : `rgba(56, 189, 248, ${(sp.life * 0.9).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.radius * sp.life + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = window.requestAnimationFrame(renderFrame);
    };

    animId = window.requestAnimationFrame(renderFrame);

    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('blur', onPointerLeave);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="noprint pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* Animated tactical coordinate grid */}
      <div className="cyber-bg-grid absolute inset-0" />

      {/* Slow drifting atmospheric glows */}
      <div className="cyber-orb cyber-orb-a" />
      <div className="cyber-orb cyber-orb-b" />

      {/* Horizontal telemetry scan sweep */}
      <div className="cyber-scanline" />

      {/* Live interactive constellation & click-wave canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
};
