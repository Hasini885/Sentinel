"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient particle flow field rendered on a full-viewport canvas behind the
 * dashboard. Particles drift along a slowly-evolving vector field. Every time a
 * new action arrives (`pulse` changes) a cluster of particles is "charged" —
 * recoloured to that action's risk tint, brightened, and sped up — then decays
 * back to the calm cyan baseline. So the backdrop visibly reacts to how much is
 * happening and how risky it is, without ever competing with the UI on top.
 */

type RGB = [number, number, number];

const BASE: RGB = [34, 211, 238]; // accent cyan
const COUNT = 120;
const CHARGE_ON_PULSE = 22;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  charge: number; // 0 calm → 1 freshly hit by a pulse
  tint: RGB;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function ParticleField({ pulse, tint }: { pulse: number; tint: RGB }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Keep the latest pulse/tint readable inside the rAF loop without restarting it.
  const pulseRef = useRef(pulse);
  const tintRef = useRef(tint);
  tintRef.current = tint;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      size: 0.6 + Math.random() * 1.6,
      charge: 0,
      tint: BASE,
    }));

    // Cheap smooth "noise": summed sines give a flowing, non-repeating field.
    const field = (x: number, y: number, t: number): number => {
      const n =
        Math.sin(x * 0.0016 + t * 0.00022) +
        Math.cos(y * 0.0019 - t * 0.00019) +
        Math.sin((x + y) * 0.0011 + t * 0.00015);
      return n * Math.PI;
    };

    let raf = 0;
    let running = true;
    let lastPulse = pulseRef.current;

    const step = (t: number) => {
      if (!running) return;

      // Fade the previous frame rather than clearing it — leaves soft trails.
      ctx.fillStyle = "rgba(10, 12, 16, 0.16)";
      ctx.fillRect(0, 0, width, height);

      // New action? Charge a random cluster with its risk tint.
      if (pulseRef.current !== lastPulse) {
        lastPulse = pulseRef.current;
        const hit = tintRef.current;
        for (let i = 0; i < CHARGE_ON_PULSE; i++) {
          const p = particles[Math.floor(Math.random() * particles.length)];
          p.charge = 1;
          p.tint = hit;
        }
      }

      ctx.globalCompositeOperation = "lighter";
      for (const p of particles) {
        const angle = field(p.x, p.y, t);
        const speed = 0.35 + p.charge * 1.7;
        // Ease toward the field direction for momentum instead of snapping.
        p.vx = lerp(p.vx, Math.cos(angle) * speed, 0.06);
        p.vy = lerp(p.vy, Math.sin(angle) * speed, 0.06);
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around the edges.
        if (p.x < 0) p.x += width;
        else if (p.x > width) p.x -= width;
        if (p.y < 0) p.y += height;
        else if (p.y > height) p.y -= height;

        const r = Math.round(lerp(BASE[0], p.tint[0], p.charge));
        const g = Math.round(lerp(BASE[1], p.tint[1], p.charge));
        const b = Math.round(lerp(BASE[2], p.tint[2], p.charge));
        const alpha = 0.14 + p.charge * 0.5;
        const size = p.size * (1 + p.charge * 1.4);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fill();

        if (p.charge > 0) p.charge = Math.max(0, p.charge - 0.012);
      }
      ctx.globalCompositeOperation = "source-over";

      raf = requestAnimationFrame(step);
    };

    if (reduce) {
      // Respect reduced-motion: paint one calm static frame, no animation.
      ctx.fillStyle = "rgba(10, 12, 16, 1)";
      ctx.fillRect(0, 0, width, height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(${BASE[0]}, ${BASE[1]}, ${BASE[2]}, 0.12)`;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      raf = requestAnimationFrame(step);
    }

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduce) raf = requestAnimationFrame(step);
    };
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-70"
    />
  );
}
