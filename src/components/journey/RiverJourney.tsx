'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RIVER_SCENES, RiverVisualScene } from '@/data/riverJourneyData';
import {
  ArrowRight,
  Droplets,
  Sparkles,
  ShieldAlert,
  Megaphone,
  Users,
  ChevronDown,
} from 'lucide-react';

interface RiverJourneyProps {
  onNavigate?: (viewId: string) => void;
  onOpenReportModal?: () => void;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

export const RiverJourney: React.FC<RiverJourneyProps> = ({
  onNavigate,
  onOpenReportModal,
}) => {
  const [activeSceneIndex, setActiveSceneIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [nafasImpact, setNafasImpact] = useState(true);
  const [visitorDrops, setVisitorDrops] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const trailRef = useRef<{ x: number; y: number; alpha: number }[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const stateRef = useRef({
    sceneIndex: 0,
    progress: 0,
    impact: true,
    reducedMotion: false,
  });

  const activeScene: RiverVisualScene = RIVER_SCENES[activeSceneIndex] || RIVER_SCENES[0];

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    stateRef.current = {
      sceneIndex: activeSceneIndex,
      progress: scrollProgress,
      impact: nafasImpact,
      reducedMotion: Boolean(reduced),
    };
  }, [activeSceneIndex, scrollProgress, nafasImpact]);

  const goToView = (viewId: string) => {
    if (onNavigate) {
      onNavigate(viewId);
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.hash = `#${viewId}`;
    }
  };

  const spawnRipple = useCallback((x: number, y: number, color = 'rgba(56, 189, 248, 0.85)', maxRadius = 90) => {
    ripplesRef.current.push({
      x,
      y,
      radius: 6,
      maxRadius,
      alpha: 0.9,
      color,
    });
    if (ripplesRef.current.length > 24) {
      ripplesRef.current.shift();
    }
  }, []);

  // Scroll listener -> updates progress (0..1) and activeSceneIndex (0..5)
  useEffect(() => {
    let rafScroll = 0;

    const handleScroll = () => {
      if (rafScroll) return;
      rafScroll = window.requestAnimationFrame(() => {
        rafScroll = 0;
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const vh = window.innerHeight || 800;
        const maxScroll = Math.max(el.offsetHeight - vh, 1);
        const current = Math.min(Math.max(-rect.top, 0), maxScroll);
        const p = current / maxScroll;
        setScrollProgress(p);

        const nextIdx = Math.min(
          RIVER_SCENES.length - 1,
          Math.max(0, Math.floor(p * RIVER_SCENES.length))
        );
        setActiveSceneIndex((prev) => {
          if (prev !== nextIdx) {
            const canvas = canvasRef.current;
            if (canvas) {
              spawnRipple(canvas.clientWidth * 0.5, canvas.clientHeight * 0.48, 'rgba(94, 234, 212, 0.9)', 110);
            }
          }
          return nextIdx;
        });
      });
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafScroll) window.cancelAnimationFrame(rafScroll);
    };
  }, [spawnRipple]);

  // Initialize Canvas particles
  useEffect(() => {
    const pts: Particle[] = [];
    for (let i = 0; i < 42; i++) {
      pts.push({
        x: Math.random(),
        y: Math.random(),
        vx: (Math.random() - 0.5) * 0.0012,
        vy: 0.001 + Math.random() * 0.0025,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.25 + Math.random() * 0.55,
      });
    }
    particlesRef.current = pts;
  }, []);

  // HTML5 Canvas 2D Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let time = 0;

    const resizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resizeCanvas) : null;
    if (ro) ro.observe(canvas);
    window.addEventListener('resize', resizeCanvas);

    const render = () => {
      const { sceneIndex, progress, impact, reducedMotion } = stateRef.current;
      const scene = RIVER_SCENES[sceneIndex] || RIVER_SCENES[0];
      const w = canvas.clientWidth || window.innerWidth;
      const h = canvas.clientHeight || window.innerHeight;

      if (!reducedMotion) {
        time += 0.016 * scene.flowSpeed;
      }

      ctx.clearRect(0, 0, w, h);

      // 1. Flowing River Artery across the stage
      const riverWidth = impact ? scene.protectedWidth : scene.unprotectedWidth;
      const riverColor = impact ? scene.protectedRiverColor : scene.unprotectedRiverColor;
      const centerX = w * 0.5;

      ctx.save();
      ctx.beginPath();
      for (let y = 0; y <= h; y += 16) {
        const wave = Math.sin(y * 0.012 - time * 2.2) * (impact ? 26 : 14);
        const x = centerX + wave;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineCap = 'round';
      ctx.lineWidth = riverWidth;
      ctx.strokeStyle = riverColor;
      ctx.shadowColor = impact ? 'rgba(56, 189, 248, 0.55)' : 'rgba(120, 100, 80, 0.25)';
      ctx.shadowBlur = impact ? 28 : 8;
      ctx.stroke();

      // Inner bright water current lines
      ctx.beginPath();
      for (let y = 0; y <= h; y += 16) {
        const wave = Math.sin(y * 0.012 - time * 2.2 + 0.6) * (impact ? 20 : 10);
        const x = centerX + wave;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineWidth = Math.max(4, riverWidth * 0.18);
      ctx.strokeStyle = impact ? 'rgba(224, 242, 254, 0.45)' : 'rgba(214, 200, 180, 0.2)';
      ctx.shadowBlur = 0;
      ctx.stroke();
      ctx.restore();

      // 2. Scene-specific Canvas Particles (waterfall spray, dust, sea shimmer)
      particlesRef.current.forEach((p) => {
        if (!reducedMotion) {
          p.y += p.vy * scene.flowSpeed;
          p.x += p.vx + Math.sin(time + p.y * 6) * 0.0005;
          if (p.y > 1) {
            p.y = 0;
            p.x = Math.random();
          }
          if (p.x < 0) p.x = 1;
          if (p.x > 1) p.x = 0;
        }

        // Dust disappears when NAFAS impact is ON in middle scenes
        const isDustScene = scene.particleMode === 'dust' || scene.particleMode === 'sunset' || scene.particleMode === 'noria';
        if (isDustScene && impact) {
          // Draw soft clean mist instead of dust
          ctx.fillStyle = `rgba(186, 230, 253, ${p.alpha * 0.35})`;
        } else if (isDustScene && !impact) {
          ctx.fillStyle = `rgba(217, 179, 130, ${p.alpha * 0.65})`;
        } else if (scene.particleMode === 'waterfall' || scene.particleMode === 'sea') {
          ctx.fillStyle = `rgba(165, 243, 252, ${p.alpha * 0.65})`;
        } else {
          ctx.fillStyle = `rgba(110, 231, 183, ${p.alpha * 0.45})`;
        }

        ctx.beginPath();
        ctx.arc(p.x * w, p.y * h, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Hero Water Drop + Animated Trail
      const dropY = h * (0.24 + progress * 0.48);
      const dropX = centerX + Math.sin(dropY * 0.012 - time * 2.2) * (impact ? 26 : 14);

      if (!reducedMotion) {
        trailRef.current.push({ x: dropX, y: dropY, alpha: 0.7 });
        if (trailRef.current.length > 16) trailRef.current.shift();
      }

      trailRef.current.forEach((t, i) => {
        t.alpha *= 0.91;
        const r = Math.max(2, (i / 16) * 11);
        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${t.alpha * 0.45})`;
        ctx.fill();
      });

      // Hero Drop Body (teardrop silhouette + specular highlight)
      ctx.save();
      ctx.translate(dropX, dropY);
      ctx.beginPath();
      ctx.moveTo(0, -18);
      ctx.bezierCurveTo(13, -4, 15, 14, 0, 16);
      ctx.bezierCurveTo(-15, 14, -13, -4, 0, -18);
      ctx.closePath();
      const dropGrad = ctx.createRadialGradient(-4, -3, 2, 0, 2, 18);
      dropGrad.addColorStop(0, '#FFFFFF');
      dropGrad.addColorStop(0.35, impact ? '#7DD3FC' : '#CBD5E1');
      dropGrad.addColorStop(1, impact ? '#0284C7' : '#64748B');
      ctx.fillStyle = dropGrad;
      ctx.shadowColor = impact ? 'rgba(56, 189, 248, 0.9)' : 'rgba(148, 163, 184, 0.5)';
      ctx.shadowBlur = 18;
      ctx.fill();

      // Specular glint
      ctx.beginPath();
      ctx.arc(-4, 2, 2.8, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.shadowBlur = 0;
      ctx.fill();
      ctx.restore();

      // 4. Expanding Ripples
      ripplesRef.current = ripplesRef.current.filter((rp) => rp.alpha > 0.03);
      ripplesRef.current.forEach((rp) => {
        if (!reducedMotion) {
          rp.radius += 2.2;
          rp.alpha *= 0.95;
        } else {
          rp.alpha = 0;
        }
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.radius, 0, Math.PI * 2);
        ctx.strokeStyle = rp.color.replace(/[\d.]+\)$/, `${rp.alpha.toFixed(2)})`);
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      animId = window.requestAnimationFrame(render);
    };

    animId = window.requestAnimationFrame(render);
    return () => {
      window.cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
      if (ro) ro.disconnect();
    };
  }, []);

  const handleStagePointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    spawnRipple(e.clientX - rect.left, e.clientY - rect.top, 'rgba(56, 189, 248, 0.75)', 70);
  };

  const scrollToScene = (idx: number) => {
    const el = containerRef.current;
    if (!el) return;
    const vh = window.innerHeight || 800;
    const maxScroll = Math.max(el.offsetHeight - vh, 1);
    const targetTop = el.offsetTop + (idx / Math.max(RIVER_SCENES.length - 1, 1)) * maxScroll;
    window.scrollTo({ top: targetTop, behavior: 'smooth' });
  };

  const handleDropVisitorDroplet = () => {
    setVisitorDrops((c) => c + 1);
    const canvas = canvasRef.current;
    if (canvas) {
      const cx = (canvas.clientWidth || 360) * (0.35 + Math.random() * 0.3);
      const cy = (canvas.clientHeight || 640) * (0.45 + Math.random() * 0.25);
      spawnRipple(cx, cy, 'rgba(45, 212, 191, 0.95)', 130);
    }
  };

  // Extra palm trees bloomed at Al-Faw (capped visually at 10 icons so layout stays clean)
  const bloomedPalmsCount = Math.min(visitorDrops, 10);

  return (
    <div
      ref={containerRef}
      style={{
        background: `linear-gradient(170deg, ${activeScene.bgFrom} 0%, ${activeScene.bgTo} 100%)`,
        transition: 'background 900ms ease',
      }}
      className="relative w-full min-h-[540vh] rounded-3xl font-arabic text-white select-none border border-white/10 shadow-2xl"
    >
      {/* Sticky Full-Viewport Visual Stage */}
      <div
        onPointerMove={handleStagePointer}
        className="sticky top-0 h-[100dvh] w-full overflow-hidden rounded-3xl flex flex-col justify-between"
      >
        {/* HTML5 Canvas 2D Layer */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          aria-hidden="true"
        />

        {/* Parallax SVG Landscapes Layer */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Scene 1: Zakho Mountains & Waterfall */}
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMax slice"
            className={`absolute inset-0 w-full h-full transition-all duration-700 ${
              activeSceneIndex === 0 ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            aria-hidden="true"
          >
            <polygon points="0,700 220,260 480,700" fill="rgba(15, 23, 42, 0.65)" />
            <polygon points="280,700 580,180 880,700" fill="rgba(19, 78, 74, 0.55)" />
            <polygon points="720,700 1000,240 1200,700" fill="rgba(15, 23, 42, 0.7)" />
            <path d="M565 215 L595 215 L615 700 L545 700 Z" fill="rgba(94, 234, 212, 0.35)" />
          </svg>

          {/* Scene 2: Nineveh Jarwana Arches & Samarra Malwiya */}
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMax slice"
            className={`absolute inset-0 w-full h-full transition-all duration-700 ${
              activeSceneIndex === 1 ? 'opacity-85 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            aria-hidden="true"
          >
            {/* Jarwana Aqueduct Arches */}
            <path
              d="M40 520 L420 520 L420 700 L350 700 L350 590 A35 35 0 0 0 280 590 L280 700 L210 700 L210 590 A35 35 0 0 0 140 590 L140 700 L40 700 Z"
              fill="rgba(15, 23, 42, 0.55)"
            />
            {/* Malwiya Spiral Silhouette */}
            <path
              d="M930 700 L965 360 L1025 360 L1060 700 Z"
              fill="rgba(15, 23, 42, 0.6)"
            />
            <line x1="942" y1="620" x2="1048" y2="600" stroke="rgba(125, 211, 252, 0.35)" strokeWidth="4" />
            <line x1="950" y1="540" x2="1040" y2="520" stroke="rgba(125, 211, 252, 0.35)" strokeWidth="4" />
            <line x1="958" y1="460" x2="1032" y2="440" stroke="rgba(125, 211, 252, 0.35)" strokeWidth="4" />
          </svg>

          {/* Scene 3: Baghdad Bridges & Domes at Sunset */}
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMax slice"
            className={`absolute inset-0 w-full h-full transition-all duration-700 ${
              activeSceneIndex === 2 ? 'opacity-85 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            aria-hidden="true"
          >
            <circle cx="600" cy="340" r="110" fill="rgba(251, 146, 60, 0.22)" />
            {/* Bridge Arches */}
            <path
              d="M0 540 L1200 540 L1200 565 L0 565 Z"
              fill="rgba(15, 23, 42, 0.65)"
            />
            <path d="M120 540 Q260 440 400 540" fill="none" stroke="rgba(253, 186, 116, 0.45)" strokeWidth="5" />
            <path d="M800 540 Q940 440 1080 540" fill="none" stroke="rgba(253, 186, 116, 0.45)" strokeWidth="5" />
            {/* Domes & Minarets */}
            <path d="M160 540 C160 470 240 470 240 540 Z" fill="rgba(15, 23, 42, 0.7)" />
            <rect x="920" y="420" width="16" height="120" fill="rgba(15, 23, 42, 0.7)" />
          </svg>

          {/* Scene 4: Rotating Noria & Babylon Ishtar Gate */}
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMax slice"
            className={`absolute inset-0 w-full h-full transition-all duration-700 ${
              activeSceneIndex === 3 ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            aria-hidden="true"
          >
            {/* Rotating Wooden Noria */}
            <g transform="translate(260, 480)">
              <g>
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 0 0"
                  to="360 0 0"
                  dur="14s"
                  repeatCount="indefinite"
                />
                <circle cx="0" cy="0" r="105" fill="none" stroke="rgba(252, 211, 77, 0.65)" strokeWidth="7" />
                <circle cx="0" cy="0" r="78" fill="none" stroke="rgba(217, 119, 6, 0.45)" strokeWidth="3" />
                <line x1="-105" y1="0" x2="105" y2="0" stroke="rgba(252, 211, 77, 0.5)" strokeWidth="3" />
                <line x1="0" y1="-105" x2="0" y2="105" stroke="rgba(252, 211, 77, 0.5)" strokeWidth="3" />
                <line x1="-74" y1="-74" x2="74" y2="74" stroke="rgba(252, 211, 77, 0.4)" strokeWidth="2.5" />
                <line x1="-74" y1="74" x2="74" y2="-74" stroke="rgba(252, 211, 77, 0.4)" strokeWidth="2.5" />
              </g>
            </g>
            {/* Ishtar Gate Silhouette */}
            <path
              d="M880 700 L880 430 L1060 430 L1060 700 L1000 700 L1000 560 A30 30 0 0 0 940 560 L940 700 Z"
              fill="rgba(30, 58, 138, 0.45)"
              stroke="rgba(252, 211, 77, 0.45)"
              strokeWidth="2"
            />
          </svg>

          {/* Scene 5: Marshes (Reeds, Mashoof, Birds, Cracked Earth vs Lush Water) */}
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMax slice"
            className={`absolute inset-0 w-full h-full transition-all duration-700 ${
              activeSceneIndex === 4 ? 'opacity-90 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            aria-hidden="true"
          >
            {/* Cracked dry earth when unprotected */}
            {!nafasImpact && (
              <g stroke="rgba(217, 119, 6, 0.35)" strokeWidth="2">
                <path d="M80 620 L150 650 L120 690" fill="none" />
                <path d="M980 610 L1050 645 L1010 690" fill="none" />
              </g>
            )}
            {/* Swaying Reeds */}
            <g stroke={nafasImpact ? 'rgba(52, 211, 153, 0.6)' : 'rgba(180, 140, 90, 0.45)'} strokeWidth="4" strokeLinecap="round">
              <path d="M140 700 Q155 560 175 490" fill="none" />
              <path d="M170 700 Q180 570 198 510" fill="none" />
              <path d="M1020 700 Q1005 560 985 485" fill="none" />
              <path d="M1050 700 Q1035 575 1015 515" fill="none" />
            </g>
            {/* Floating Mashoof Boat */}
            <path
              d="M520 575 Q600 610 680 575 L655 595 L545 595 Z"
              fill="rgba(15, 23, 42, 0.78)"
              stroke="rgba(52, 211, 153, 0.45)"
              strokeWidth="2"
            />
            {/* Migrating Birds */}
            <g
              stroke="rgba(255,255,255,0.7)"
              strokeWidth="2.5"
              fill="none"
              className={`transition-opacity duration-700 ${nafasImpact ? 'opacity-90' : 'opacity-20'}`}
            >
              <path d="M350 220 Q365 205 380 220 Q395 205 410 220" />
              <path d="M430 190 Q442 178 454 190 Q466 178 478 190" />
              <path d="M760 210 Q774 196 788 210 Q802 196 816 210" />
            </g>
          </svg>

          {/* Scene 6: Al-Faw Confluence & Palm Forest */}
          <svg
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMax slice"
            className={`absolute inset-0 w-full h-full transition-all duration-700 ${
              activeSceneIndex === 5 ? 'opacity-95 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
            aria-hidden="true"
          >
            {/* Glowing Confluence Streams */}
            <path d="M360 0 Q480 240 600 380" fill="none" stroke="rgba(56, 189, 248, 0.35)" strokeWidth="26" />
            <path d="M840 0 Q720 240 600 380" fill="none" stroke="rgba(45, 212, 191, 0.35)" strokeWidth="26" />
            {/* Sea Horizon */}
            <rect x="0" y="590" width="1200" height="110" fill="rgba(2, 132, 199, 0.28)" />
          </svg>

          {/* Living Green Sidr & Palm Trees on Both Banks (Grow smoothly when NAFAS impact is ON) */}
          <div
            className={`absolute bottom-20 inset-x-4 sm:inset-x-10 flex items-end justify-between transition-all duration-700 origin-bottom ${
              nafasImpact ? 'scale-100 opacity-95' : 'scale-50 opacity-15'
            }`}
          >
            {/* Left Bank Trees */}
            <div className="flex items-end gap-2">
              <svg viewBox="0 0 80 120" className="w-14 h-20 sm:w-20 sm:h-28" aria-hidden="true">
                <rect x="36" y="55" width="8" height="65" fill="#5C4033" />
                <path d="M40 55 Q12 35 8 52 M40 55 Q18 22 30 18 M40 55 Q62 22 50 18 M40 55 Q68 35 72 52" stroke="#10B981" strokeWidth="6" strokeLinecap="round" fill="none" />
              </svg>
              <svg viewBox="0 0 70 100" className="w-10 h-16 hidden sm:block" aria-hidden="true">
                <rect x="31" y="50" width="7" height="50" fill="#5C4033" />
                <circle cx="35" cy="40" r="22" fill="#059669" />
              </svg>
            </div>

            {/* Right Bank Trees + Extra Bloomed Palms from Visitor Drops */}
            <div className="flex items-end gap-1.5">
              {Array.from({ length: bloomedPalmsCount }).map((_, idx) => (
                <svg
                  key={idx}
                  viewBox="0 0 60 100"
                  className="w-8 h-14 sm:w-10 sm:h-16 transition-transform duration-500 scale-100"
                  aria-hidden="true"
                >
                  <rect x="27" y="45" width="6" height="55" fill="#78350F" />
                  <path d="M30 45 Q10 28 6 42 M30 45 Q15 18 25 14 M30 45 Q45 18 35 14 M30 45 Q50 28 54 42" stroke="#34D399" strokeWidth="5" strokeLinecap="round" fill="none" />
                </svg>
              ))}
              <svg viewBox="0 0 80 120" className="w-14 h-20 sm:w-20 sm:h-28" aria-hidden="true">
                <rect x="36" y="55" width="8" height="65" fill="#5C4033" />
                <path d="M40 55 Q12 35 8 52 M40 55 Q18 22 30 18 M40 55 Q62 22 50 18 M40 55 Q68 35 72 52" stroke="#10B981" strokeWidth="6" strokeLinecap="round" fill="none" />
              </svg>
            </div>
          </div>
        </div>

        {/* Top Floating Controls: Back/Close + Distance Pill */}
        <div className="relative z-20 flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-6">
          <button
            onClick={() => goToView('home')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/45 hover:bg-black/65 backdrop-blur-md text-white text-xs font-bold border border-white/20 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>إغلاق / عودة</span>
          </button>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-xs font-bold">
            <Droplets className="w-3.5 h-3.5 text-sky-300" />
            <span className="text-amber-200">{activeScene.distanceLabel}</span>
          </div>
        </div>

        {/* Side 6-Dot Station Quick Jump Rail */}
        <div
          className="fixed left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center gap-2.5 bg-black/35 backdrop-blur-md px-2 py-3 rounded-full border border-white/15"
          aria-label="الانتقال السريع بين المشاهد"
        >
          {RIVER_SCENES.map((sc, idx) => {
            const isActive = idx === activeSceneIndex;
            return (
              <button
                key={sc.id}
                onClick={() => scrollToScene(idx)}
                title={sc.poeticLine}
                aria-label={sc.poeticLine}
                className={`rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-sky-300 ${
                  isActive
                    ? 'w-3.5 h-3.5 bg-sky-300 shadow-md scale-110'
                    : 'w-2.5 h-2.5 bg-white/35 hover:bg-white/75'
                }`}
              />
            );
          })}
        </div>

        {/* Center Minimal Poetic Title Overlay */}
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
          <div className="max-w-2xl space-y-3 bg-black/25 backdrop-blur-sm px-6 py-5 rounded-3xl border border-white/15">
            <span className="inline-block text-[11px] font-bold text-sky-200 tracking-wide">
              المشهد {activeScene.order} / {RIVER_SCENES.length} • {activeScene.distanceLabel}
            </span>
            <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white leading-tight drop-shadow-md">
              {activeScene.poeticLine}
            </h2>
            {activeSceneIndex === 0 && (
              <div className="pt-1 flex items-center justify-center gap-1 text-xs text-sky-200/90">
                <span>مرّر للأسفل</span>
                <ChevronDown className="w-4 h-4 animate-bounce motion-reduce:animate-none" />
              </div>
            )}
          </div>
        </div>

        {/* Bottom Interactive Controls: Visual Impact Switch + Al-Faw Drop Action */}
        <div className="relative z-20 px-4 sm:px-8 pb-5 sm:pb-7 flex flex-col items-center gap-3">
          {/* Scene 6 (Al-Faw) Finale Interactive Drop Button */}
          {activeSceneIndex === RIVER_SCENES.length - 1 && (
            <div className="flex flex-wrap items-center justify-center gap-2.5 bg-black/55 backdrop-blur-md p-2.5 rounded-2xl border border-sky-400/35 shadow-xl">
              <button
                onClick={handleDropVisitorDroplet}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs sm:text-sm font-black flex items-center gap-1.5 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-sky-300"
              >
                <Droplets className="w-4 h-4" />
                <span>أسقِط قطرتك في النهر</span>
                {visitorDrops > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-slate-950/20 text-xs font-black">
                    {visitorDrops}
                  </span>
                )}
              </button>

              <button
                onClick={() => (onOpenReportModal ? onOpenReportModal() : goToView('map'))}
                className="px-3 py-2 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-300"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>بلّغ عن مشكلة</span>
              </button>

              <button
                onClick={() => goToView('campaigns')}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-300"
              >
                <Users className="w-3.5 h-3.5" />
                <span>انضم لحملة</span>
              </button>
            </div>
          )}

          {/* Visual Impact Switch: الواقع بلا حماية ⇄ أثر نَفَس */}
          <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 shadow-xl">
            <button
              onClick={() => setNafasImpact(false)}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                !nafasImpact
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>الواقع بلا حماية</span>
            </button>

            <button
              onClick={() => setNafasImpact(true)}
              className={`px-3.5 sm:px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-300 ${
                nafasImpact
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>أثر نَفَس</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
