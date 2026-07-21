"use client";

import { useEffect, useRef } from "react";

import { useMotionPreference } from "@/components/ui/MotionProvider";

/**
 * Ambient particle flow field on a full-viewport canvas behind the content.
 *
 * Particles drift along a slowly-evolving vector field. Two things perturb them:
 *
 *  - `pulse`/`tint` (app pages): each new action charges a cluster with its risk
 *    tint, brightening it, then it decays back to the calm accent baseline.
 *  - the cursor (any page, fine pointers only): nearby particles get a swirl and
 *    a pull toward the pointer and brighten, and a soft accent glow is drawn at
 *    the pointer each frame — the trail-fade turns that into a flowing trail
 *    that follows the mouse.
 *
 * Performance: one pointermove listener that only stores x/y; all work is in the
 * single rAF loop; DPR capped at 2; pauses when the tab is hidden. Guards: the
 * pointer code is attached only for `(pointer: fine) and (hover: hover)`; under
 * reduced motion it paints one static frame and never animates.
 */

type RGB = [number, number, number];

const BASE: RGB = [58, 231, 255]; // electric-cyan accent
const COUNT = 120;
const CHARGE_ON_PULSE = 22;

/** Cursor influence radius, px, and how hard it pulls/swirls within it. */
const POINTER_RADIUS = 260;
const POINTER_PULL = 0.55;
const POINTER_SWIRL = 1.5;
const MAX_SPEED = 3.6;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  charge: number; // 0 calm → 1 freshly hit by a pulse or the cursor
  tint: RGB;
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function ParticleField({
  pulse = 0,
  tint = BASE,
}: {
  /** Bumped when a new action arrives; charges a cluster. Optional (landing). */
  pulse?: number;
  /** Colour for the next pulse charge. Defaults to the accent. */
  tint?: RGB;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // The canvas is imperative, so neither MotionConfig nor CSS reaches it —
  // it reads the shared preference directly and restarts when that flips.
  const { reduced } = useMotionPreference();
  // Keep the latest pulse/tint readable inside the rAF loop without restarting it.
  const pulseRef = useRef(pulse);
  const tintRef = useRef(tint);
  pulseRef.current = pulse;
  tintRef.current = tint;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = reduced;

    // Cursor effects only where there's a real hovering pointer. Touch/coarse
    // devices skip every pointer listener and get the ambient drift instead.
    const finePointer =
      !reduce &&
      window.matchMedia("(pointer: fine)").matches &&
      window.matchMedia("(hover: hover)").matches;

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

    // The pointer handler does nothing but store coordinates — the rAF loop
    // reads them — so it stays cheap no matter how fast the mouse moves.
    const pointer = { x: width / 2, y: height / 2, active: false };
    const onMove = (e: PointerEvent) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.active = true;
    };
    const onLeave = () => {
      pointer.active = false;
    };
    if (finePointer) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerout", onLeave, { passive: true });
      window.addEventListener("blur", onLeave);
    }

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
      // Matches --color-deep (#060708) so trails dissolve into the page base.
      ctx.fillStyle = "rgba(6, 7, 8, 0.16)";
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

        // Cursor influence: a pull toward the pointer plus a perpendicular
        // swirl, so particles flow around it like a current bending past a
        // stone. Falls off to nothing at POINTER_RADIUS.
        if (pointer.active) {
          const dx = pointer.x - p.x;
          const dy = pointer.y - p.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < POINTER_RADIUS * POINTER_RADIUS) {
            const d = Math.sqrt(d2) || 1;
            const falloff = 1 - d / POINTER_RADIUS;
            const nx = dx / d;
            const ny = dy / d;
            p.vx += (nx * POINTER_PULL + -ny * POINTER_SWIRL) * falloff * 0.4;
            p.vy += (ny * POINTER_PULL + nx * POINTER_SWIRL) * falloff * 0.4;
            if (falloff * 0.9 > p.charge) {
              p.charge = falloff * 0.9;
              p.tint = BASE; // near the cursor, glow the accent
            }
          }
        }

        // Clamp so the cursor can't fling a particle off to infinity.
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > MAX_SPEED) {
          p.vx = (p.vx / sp) * MAX_SPEED;
          p.vy = (p.vy / sp) * MAX_SPEED;
        }

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

      // Soft glow at the pointer. Drawn under "lighter" so it accumulates with
      // the particles, and the per-frame trail-fade above stretches it into a
      // flowing trail as the cursor moves.
      if (pointer.active) {
        const glow = ctx.createRadialGradient(
          pointer.x, pointer.y, 0,
          pointer.x, pointer.y, 130,
        );
        glow.addColorStop(0, "rgba(58, 231, 255, 0.16)");
        glow.addColorStop(1, "rgba(58, 231, 255, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(pointer.x, pointer.y, 130, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(step);
    };

    if (reduce) {
      // Respect reduced-motion: paint one calm static frame, no animation.
      ctx.fillStyle = "rgba(6, 7, 8, 1)";
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
      if (finePointer) {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerout", onLeave);
        window.removeEventListener("blur", onLeave);
      }
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 opacity-70"
    />
  );
}
