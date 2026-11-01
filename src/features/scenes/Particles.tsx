import { useEffect, useRef } from 'react';

export type ParticleKind = 'rain' | 'glass' | 'snow' | 'embers' | 'fireflies' | 'dust' | 'petals';

interface P {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  a: number;
  phase: number;
}

const COUNTS: Record<ParticleKind, number> = { rain: 220, glass: 70, snow: 160, embers: 40, fireflies: 28, dust: 45, petals: 18 };

/**
 * Lightweight canvas particle layer. Pauses while the tab is hidden, renders a single still frame
 * when the user prefers reduced motion, and scales particle count with screen area.
 */
export function Particles({ kind, density = 1, className, color }: { kind: ParticleKind; density?: number; className?: string; color?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, raf = 0, last = performance.now();
    let ps: P[] = [];

    const spawn = (initial: boolean): P => {
      const r = Math.random;
      switch (kind) {
        case 'rain':
          return { x: r() * (w + 200) - 100, y: initial ? r() * h : -20 - r() * 100, vx: -60, vy: 900 + r() * 500, r: 10 + r() * 14, a: 0.12 + r() * 0.22, phase: 0 };
        case 'glass':
          return { x: r() * w, y: r() * h, vx: 0, vy: 0, r: 1 + r() * 3.2, a: 0.25 + r() * 0.35, phase: r() };
        case 'snow':
          return { x: r() * w, y: initial ? r() * h : -10, vx: 0, vy: 25 + r() * 45, r: 0.8 + r() * 2.6, a: 0.4 + r() * 0.5, phase: r() * 10 };
        case 'embers':
          return { x: w * (0.35 + r() * 0.3), y: initial ? h * (0.4 + r() * 0.5) : h * 0.9, vx: (r() - 0.5) * 20, vy: -(30 + r() * 60), r: 0.8 + r() * 1.8, a: 1, phase: r() * 10 };
        case 'fireflies':
          return { x: r() * w, y: h * (0.4 + r() * 0.6), vx: 0, vy: 0, r: 1.2 + r() * 1.6, a: 0, phase: r() * 10 };
        case 'dust':
          return { x: r() * w, y: r() * h, vx: (r() - 0.5) * 6, vy: (r() - 0.5) * 6, r: 0.6 + r() * 1.4, a: 0.1 + r() * 0.25, phase: r() * 10 };
        case 'petals':
          return { x: r() * w, y: initial ? r() * h : -20, vx: 10 + r() * 20, vy: 20 + r() * 25, r: 3 + r() * 3, a: 0.5 + r() * 0.4, phase: r() * 10 };
      }
    };

    const resize = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(COUNTS[kind] * density * Math.min(1.5, Math.max(0.35, (w * h) / (1440 * 900))));
      ps = Array.from({ length: n }, () => spawn(true));
    };

    const step = (dt: number, t: number) => {
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        switch (kind) {
          case 'rain': {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            ctx.strokeStyle = `rgba(200,215,235,${p.a})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.vx * 0.012, p.y + p.r);
            ctx.stroke();
            if (p.y > h) ps[i] = spawn(false);
            break;
          }
          case 'glass': {
            // Drops cling, then occasionally slide down.
            if (p.vy === 0 && Math.random() < 0.0015 * (p.r / 2)) p.vy = 20 + Math.random() * 60;
            if (p.vy > 0) {
              p.y += p.vy * dt;
              p.vy *= 0.995;
              if (p.vy < 6) p.vy = 0;
            }
            const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0, p.x, p.y, p.r);
            g.addColorStop(0, `rgba(235,240,250,${p.a})`);
            g.addColorStop(1, `rgba(150,170,200,${p.a * 0.25})`);
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, p.r * 0.8, p.r, 0, 0, Math.PI * 2);
            ctx.fill();
            if (p.y > h + 5) ps[i] = { ...spawn(true), y: Math.random() * h * 0.3 };
            break;
          }
          case 'snow': {
            p.x += Math.sin(t / 1600 + p.phase) * 18 * dt;
            p.y += p.vy * dt;
            ctx.fillStyle = `rgba(240,245,255,${p.a})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            if (p.y > h + 5) ps[i] = spawn(false);
            break;
          }
          case 'embers': {
            p.x += (p.vx + Math.sin(t / 400 + p.phase) * 15) * dt;
            p.y += p.vy * dt;
            p.a -= dt * 0.28;
            ctx.fillStyle = `rgba(255,${150 + Math.floor(p.a * 60)},70,${Math.max(0, p.a)})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            if (p.a <= 0) ps[i] = spawn(false);
            break;
          }
          case 'fireflies': {
            p.x += Math.sin(t / 2100 + p.phase * 3) * 12 * dt;
            p.y += Math.cos(t / 2700 + p.phase) * 8 * dt;
            const a = Math.max(0, Math.sin(t / 1300 + p.phase * 4)) * 0.85;
            const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
            g.addColorStop(0, `rgba(230,240,150,${a})`);
            g.addColorStop(1, 'rgba(230,240,150,0)');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'dust': {
            p.x += (p.vx + Math.sin(t / 3000 + p.phase) * 3) * dt;
            p.y += p.vy * dt;
            if (p.x < 0) p.x = w;
            if (p.x > w) p.x = 0;
            if (p.y < 0) p.y = h;
            if (p.y > h) p.y = 0;
            ctx.fillStyle = color ?? `rgba(255,220,170,${p.a * (0.6 + 0.4 * Math.sin(t / 900 + p.phase))})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fill();
            break;
          }
          case 'petals': {
            p.x += (p.vx + Math.sin(t / 900 + p.phase) * 20) * dt;
            p.y += p.vy * dt;
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(Math.sin(t / 700 + p.phase) * 1.2);
            ctx.fillStyle = `rgba(240,170,180,${p.a})`;
            ctx.beginPath();
            ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            if (p.y > h + 10 || p.x > w + 10) ps[i] = spawn(false);
            break;
          }
        }
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      step(dt, now);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !reduced) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };

    resize();
    if (reduced) step(0, 0);
    else raf = requestAnimationFrame(loop);
    const ro = new ResizeObserver(() => {
      resize();
      if (reduced) step(0, 0);
    });
    ro.observe(canvas);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [kind, density, color]);

  return <canvas ref={ref} className={`particles ${className ?? ''}`} aria-hidden />;
}
