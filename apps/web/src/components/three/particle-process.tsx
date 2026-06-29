"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LinkButton } from "@/components/common";
import { loadBakedGeometry } from "@/lib/baked-edges";
// Type-only import: erased at build time, so `three` never enters the server
// bundle, while THREE.* type annotations below still resolve.
import type * as THREE from "three";

/**
 * Scroll-driven 3D particle process animation — a clean React port of the
 * theme's `process-animation-section.php` shortcode.
 *
 * The section is several viewports tall; an inner `position: sticky` stage pins
 * the canvas while you scroll past it. Scroll progress through the tall section
 * becomes a single 0→1 value that is sliced into phases — intro text dissolve,
 * particle formation into the car, a hold, then dispersion — and a rAF loop
 * lerp-smooths that value and interpolates ~50k particles between scatter → car
 * → explosion targets.
 *
 * three is loaded dynamically inside the effect so it never lands in the server
 * bundle and the canvas only initialises in the browser.
 */

const MODEL_URL = "/models/sedan.glb";

/** Below this width the scene + overlays switch to the mobile layout. */
const MOBILE_MAX_WIDTH = 991;

/**
 * Reactive `isMobile` via useSyncExternalStore — SSR-safe (no hydration mismatch)
 * and re-renders only when the breakpoint boolean actually flips. The resize
 * listener is debounced so a drag-resize coalesces into one update.
 */
function subscribeIsMobile(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 200);
  };
  window.addEventListener("resize", onResize, { passive: true });
  return () => {
    clearTimeout(timer);
    window.removeEventListener("resize", onResize);
  };
}
const getIsMobileSnapshot = () => window.innerWidth <= MOBILE_MAX_WIDTH;
const getIsMobileServerSnapshot = () => false;

type Step = {
  num: string;
  title: string;
  desc: string;
  rail: string;
};

const STEPS: Step[] = [
  {
    num: "Стъпка 01 / 05",
    title: "Подбор",
    desc: "Слушаме нуждите. Анализираме бюджета и целта. Предлагаме точните възможности.",
    rail: "Подбор",
  },
  {
    num: "Стъпка 02 / 05",
    title: "Търг",
    desc: "Участваме директно — на корейски, японски и германски аукциони. Стратегия, не късмет.",
    rail: "Търг",
  },
  {
    num: "Стъпка 03 / 05",
    title: "Оформяне",
    desc: "Прозрачно плащане през регулирани канали. Изрядна документация без скрити такси.",
    rail: "Оформяне",
  },
  {
    num: "Стъпка 04 / 05",
    title: "Логистика",
    desc: "Транспорт, митница, регистрация — поемаме всичко. Колата ви пътува, вие следите.",
    rail: "Логистика",
  },
  {
    num: "Стъпка 05 / 05",
    title: "Ключът",
    desc: "Колата ви очаква. Подготвена, прегледана, изрядна. Готова за път от деня на предаването.",
    rail: "Ключът",
  },
];

export function ParticleProcess() {
  const rootRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const introCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Overlay state driven by the animation loop (React, not imperative DOM).
  const [activeStep, setActiveStep] = useState(0);
  const [introHidden, setIntroHidden] = useState(false);
  const [formationPct, setFormationPct] = useState(0);
  const [outroOpacity, setOutroOpacity] = useState(0);
  // 0 while the intro title is shown, ramps to 1 as it dissolves — gates the
  // whole step stage (cards + rail + spine + watermark) so they don't overlap
  // the intro at the top of the section.
  const [stageOpacity, setStageOpacity] = useState(0);
  // The "scroll down" hint fades out as soon as the user scrolls a little.
  const [hintOpacity, setHintOpacity] = useState(1);

  // Mobile/desktop breakpoint as reactive state. The WebGL scene reads this once
  // at build time, so when it flips (crossing 991px) the scene effect re-runs and
  // rebuilds for the new layout — no manual refresh needed.
  const isMobile = useSyncExternalStore(
    subscribeIsMobile,
    getIsMobileSnapshot,
    getIsMobileServerSnapshot,
  );

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const introCanvas = introCanvasRef.current;
    if (!root || !canvas) return;

    let disposed = false;
    let rafId = 0;
    let cleanupListeners = () => {};

    (async () => {
      // Kick off the baked-geometry fetch in parallel with the three import. The
      // particle targets / outline / edge lines for this model + breakpoint are
      // fully precomputed (no GLB, no MeshSurfaceSampler, no EdgesGeometry at
      // runtime — those cost ~2.5s of main-thread work). See
      // scripts/bake-particle-edges.mjs.
      const bakedPromise = loadBakedGeometry(MODEL_URL, isMobile);
      const THREE = await import("three");
      if (disposed) return;

      // `isMobile` here is the component-scope state (matches the CSS
      // max-[991px]: variants). The effect re-runs when it flips, rebuilding the
      // whole scene for the new layout.

      // ---- particle buffers ------------------------------------------------
      const particleCount = isMobile ? 4000 : 18000;
      const positions = new Float32Array(particleCount * 3);
      const initialPositions = new Float32Array(particleCount * 3);
      const targets = new Float32Array(particleCount * 3);
      const dispersionTargets = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const outlineCount = isMobile ? 8000 : 32000;
      const outlinePositions = new Float32Array(outlineCount * 3);
      const outlineTargets = new Float32Array(outlineCount * 3);
      const outlineDispersionTargets = new Float32Array(outlineCount * 3);
      const outlineInitialPositions = new Float32Array(outlineCount * 3);

      type Seed = {
        delay: number;
        speed: number;
        noise: THREE.Vector3;
        dispersionDelay: number;
        dispersionSpeed: number;
        dispersionDir: THREE.Vector3;
        dispersionDist: number;
      };
      const seeds: Seed[] = [];
      const outlineSeeds: Seed[] = [];

      let modelLoaded = false;

      // Smoothed scroll-driven progress (0→1 each).
      let displayFormation = 0;
      let displayDispersion = 0;
      // Gates the car particles' opacity so they stay hidden behind the intro
      // title and fade in as it dissolves (see computeProgress().reveal).
      let displayReveal = 0;
      let lastStep = -1;

      const ease = (t: number) => t * (2 - t);

      // ---- scene -----------------------------------------------------------
      const scene = new THREE.Scene();

      const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
      // Initial placement; updateCarGroup() drives it per-frame thereafter. Both
      // mobile and desktop use a level, front-on view (eye y≈0.8, looking at y=0).
      camera.position.set(0, 0.8, isMobile ? 8 : 9);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

      // Car/scatter starts at world origin (centred in the level camera view) on
      // both layouts; updateCarGroup() drives Y per-frame (mobile lifts it as it
      // forms). Camera looks straight ahead (CAR_LOOK_X = 0).
      const CAR_X = 0;
      const CAR_LOOK_X = 0;
      const carGroup = new THREE.Group();
      carGroup.position.set(CAR_X, 0, 0);
      scene.add(carGroup);

      const edgeLineGroup = new THREE.Group();
      carGroup.add(edgeLineGroup);
      let edgeLines: THREE.LineSegments[] = [];

      // ---- lights ----------------------------------------------------------
      scene.add(new THREE.AmbientLight(0xffffff, 1.15));
      const keyLight = new THREE.DirectionalLight(0xff8a3d, 2.3);
      keyLight.position.set(5, 5, 6);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.8);
      fillLight.position.set(-4, 2, -4);
      scene.add(fillLight);

      // ---- ambient background dust ----------------------------------------
      let backgroundParticles: THREE.Points | null = null;
      {
        const count = isMobile ? 120 : 300;
        const geometry = new THREE.BufferGeometry();
        const bgPositions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          bgPositions[i * 3] = (Math.random() - 0.5) * 40;
          bgPositions[i * 3 + 1] = (Math.random() - 0.5) * 20;
          bgPositions[i * 3 + 2] = (Math.random() - 0.5) * 15 - 5;
        }
        geometry.setAttribute("position", new THREE.BufferAttribute(bgPositions, 3));
        const material = new THREE.PointsMaterial({
          color: 0xff8a3d,
          size: isMobile ? 0.018 : 0.012,
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          sizeAttenuation: true,
        });
        backgroundParticles = new THREE.Points(geometry, material);
        scene.add(backgroundParticles);
      }

      // ---- surface particles ----------------------------------------------
      const makeSeed = (overrides: Partial<Seed>): Seed => ({
        delay: Math.random() * 0.18,
        speed: 0.85 + Math.random() * 0.7,
        noise: new THREE.Vector3(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5,
        ),
        dispersionDelay: Math.random() * 0.35,
        dispersionSpeed: 0.7 + Math.random() * 0.9,
        dispersionDir: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          0.6 + Math.random() * 1.6,
          (Math.random() - 0.5) * 2,
        ).normalize(),
        dispersionDist: 3.5 + Math.random() * 4.5,
        ...overrides,
      });

      {
        const spreadX = isMobile ? 4.5 : 5.8;
        const spreadY = isMobile ? 2.2 : 2.8;
        const spreadZ = isMobile ? 2.8 : 3.4;
        for (let i = 0; i < particleCount; i++) {
          const x = (Math.random() - 0.5) * spreadX;
          const y = (Math.random() - 0.5) * spreadY;
          const z = (Math.random() - 0.5) * spreadZ;
          positions[i * 3] = x;
          positions[i * 3 + 1] = y;
          positions[i * 3 + 2] = z;
          initialPositions[i * 3] = x;
          initialPositions[i * 3 + 1] = y;
          initialPositions[i * 3 + 2] = z;
          colors[i * 3] = 1;
          colors[i * 3 + 1] = 0.35;
          colors[i * 3 + 2] = 0.1;
          seeds.push(makeSeed({}));
        }
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const particleMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.024 : 0.018,
        color: 0xffb36b,
        transparent: true,
        // Start invisible: until the baked targets arrive (~100-200ms) the
        // particles sit in their raw scatter positions, which would otherwise
        // flash as a dense cloud. updateParticles() sets opacity each frame once
        // modelLoaded flips true.
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      carGroup.add(particles);

      // ---- outline (edge-biased) particles --------------------------------
      {
        const spreadX = isMobile ? 4.2 : 5.4;
        const spreadY = isMobile ? 1.8 : 2.4;
        const spreadZ = isMobile ? 2.4 : 3.0;
        for (let i = 0; i < outlineCount; i++) {
          const x = (Math.random() - 0.5) * spreadX;
          const y = (Math.random() - 0.5) * spreadY;
          const z = (Math.random() - 0.5) * spreadZ;
          outlinePositions[i * 3] = x;
          outlinePositions[i * 3 + 1] = y;
          outlinePositions[i * 3 + 2] = z;
          outlineInitialPositions[i * 3] = x;
          outlineInitialPositions[i * 3 + 1] = y;
          outlineInitialPositions[i * 3 + 2] = z;
          outlineSeeds.push(
            makeSeed({
              delay: Math.random() * 0.12,
              speed: 1.0 + Math.random() * 0.6,
              dispersionDelay: Math.random() * 0.25,
              dispersionSpeed: 0.85 + Math.random() * 0.9,
              dispersionDir: new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                0.7 + Math.random() * 1.8,
                (Math.random() - 0.5) * 2,
              ).normalize(),
              dispersionDist: 4.5 + Math.random() * 5.0,
            }),
          );
        }
      }

      const outlineGeometry = new THREE.BufferGeometry();
      outlineGeometry.setAttribute("position", new THREE.BufferAttribute(outlinePositions, 3));
      const outlineMaterial = new THREE.PointsMaterial({
        size: isMobile ? 0.035 : 0.028,
        color: 0xffb36b,
        transparent: true,
        // Start invisible (like particleMaterial): until baked targets arrive and
        // the reveal gate ramps up, the outline particles sit in raw scatter
        // positions and would otherwise flash as a dense cloud for one frame.
        // updateOutlineParticles() drives opacity each frame once modelLoaded.
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      });
      const outlineParticles = new THREE.Points(outlineGeometry, outlineMaterial);
      carGroup.add(outlineParticles);

      // ---- intro text → particle dissolve (2D canvas) ----------------------
      const introCtx = introCanvas?.getContext("2d") ?? null;
      let introParticles: {
        ox: number;
        oy: number;
        tx: number;
        ty: number;
        r: number;
        g: number;
        b: number;
        a: number;
        size: number;
        delay: number;
        speed: number;
        wobble: number;
      }[] = [];
      let introDpr = 1;

      function buildIntroTextParticles() {
        if (!introCanvas || !introCtx) return;
        const w = introCanvas.width;
        const h = introCanvas.height;
        const dpr = introDpr;
        if (!w || !h) return;

        const off = document.createElement("canvas");
        off.width = w;
        off.height = h;
        const ctx = off.getContext("2d");
        if (!ctx) return;

        ctx.clearRect(0, 0, w, h);
        ctx.textBaseline = "middle";

        const titleSize = isMobile
          ? Math.min(52, (w / dpr) * 0.11)
          : Math.max(40, Math.min(80, (w / dpr) * 0.052));
        const cx = w / 2;
        const cy = h / 2;
        // Reuse the app font (exposed as the --font-montserrat CSS var on <html>)
        // so the particle glyphs match the rest of the site.
        const titleFont =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--font-montserrat")
            .trim() || "Arial";
        ctx.font = `900 ${titleSize * dpr}px ${titleFont}, Arial, sans-serif`;
        ctx.textAlign = "center";

        // Two centered lines, one sentence each:
        //   line 1: "Пет стъпки."        (white)
        //   line 2: "Един резултат."     ("Един" in brand orange)
        const lineGap = titleSize * dpr * (isMobile ? 0.45 : 0.6);
        ctx.fillStyle = "#ffffff";
        ctx.fillText("Пет стъпки.", cx, cy - lineGap);
        const textA = "Един";
        const textB = " резултат.";
        const widthA = ctx.measureText(textA).width;
        const widthB = ctx.measureText(textB).width;
        const startX = cx - (widthA + widthB) / 2;
        ctx.fillStyle = "#ff8a3d";
        ctx.fillText(textA, startX + widthA / 2, cy + lineGap);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(textB, startX + widthA + widthB / 2, cy + lineGap);

        const img = ctx.getImageData(0, 0, w, h).data;
        const gap = isMobile ? 6 : 5;
        introParticles = [];
        for (let y = 0; y < h; y += gap) {
          for (let x = 0; x < w; x += gap) {
            const index = (y * w + x) * 4;
            const alpha = img[index + 3];
            if (alpha > 60) {
              const angle = Math.random() * Math.PI * 2;
              const dist = (isMobile ? 80 : 120) * dpr + Math.random() * (isMobile ? 220 : 360) * dpr;
              const upward = Math.random() * (isMobile ? 180 : 260) * dpr;
              introParticles.push({
                ox: x,
                oy: y,
                tx: x + Math.cos(angle) * dist,
                ty: y - Math.abs(Math.sin(angle)) * dist - upward,
                r: img[index],
                g: img[index + 1],
                b: img[index + 2],
                a: alpha / 255,
                size: isMobile ? 2.1 * dpr : 2.25 * dpr,
                delay: Math.random() * 0.24,
                speed: 0.85 + Math.random() * 0.75,
                wobble: Math.random() * Math.PI * 2,
              });
            }
          }
        }
      }

      function updateIntroParticles() {
        if (!introCtx || !introCanvas || !introParticles.length) return;
        const rect = root!.getBoundingClientRect();
        const totalSticky = rect.height - window.innerHeight;
        const t = totalSticky > 0 ? Math.max(0, Math.min(1, -rect.top / totalSticky)) : 0;

        // Finish dissolving (and hide) just before the car formation begins
        // (introEnd = 0.18 in computeProgress) so intro particles never co-exist
        // with the car's particles on the right.
        const start = 0.015;
        const end = 0.16;
        let p = Math.max(0, Math.min(1, (t - start) / (end - start)));
        p = p * (2 - p);

        introCtx.clearRect(0, 0, introCanvas.width, introCanvas.height);
        const now = performance.now() * 0.002;

        for (const particle of introParticles) {
          const local = Math.max(0, Math.min(1, (p - particle.delay) * particle.speed));
          const e = local * (2 - local);
          const wave = Math.sin(now + particle.wobble) * 10 * introDpr * local;
          const x = particle.ox + (particle.tx - particle.ox) * e + wave;
          const y = particle.oy + (particle.ty - particle.oy) * e;
          const alpha = particle.a * (1 - Math.pow(local, 1.35));
          if (alpha <= 0.01) continue;
          introCtx.fillStyle = `rgba(${particle.r},${particle.g},${particle.b},${alpha})`;
          introCtx.fillRect(x, y, particle.size, particle.size);
        }

        setIntroHidden(p >= 0.99);
      }

      // ---- model loading: consume precomputed targets ---------------------
      // Everything geometry-derived (surface targets, outline targets, edge
      // lines) is baked ahead of time; the runtime only fetches it and computes
      // the cheap per-load bits (dispersion targets from the random seeds).
      bakedPromise
        .then((baked) => {
          if (disposed) return;

          // Surface + outline targets copy straight into the scene buffers (sized
          // to particleCount / outlineCount, matching the bake variant).
          targets.set(baked.targets.subarray(0, targets.length));
          outlineTargets.set(baked.outline.subarray(0, outlineTargets.length));

          // Dispersion targets depend on this load's random seeds, so they stay
          // at runtime (cheap — a single pass over the buffers).
          for (let i = 0; i < particleCount; i++) {
            const seed = seeds[i];
            dispersionTargets[i * 3] = targets[i * 3] + seed.dispersionDir.x * seed.dispersionDist;
            dispersionTargets[i * 3 + 1] = targets[i * 3 + 1] + seed.dispersionDir.y * seed.dispersionDist;
            dispersionTargets[i * 3 + 2] = targets[i * 3 + 2] + seed.dispersionDir.z * seed.dispersionDist;
          }
          for (let i = 0; i < outlineCount; i++) {
            const seed = outlineSeeds[i];
            outlineDispersionTargets[i * 3] = outlineTargets[i * 3] + seed.dispersionDir.x * seed.dispersionDist;
            outlineDispersionTargets[i * 3 + 1] = outlineTargets[i * 3 + 1] + seed.dispersionDir.y * seed.dispersionDist;
            outlineDispersionTargets[i * 3 + 2] = outlineTargets[i * 3 + 2] + seed.dispersionDir.z * seed.dispersionDist;
          }

          // Edge lines: one LineSegments per precomputed position buffer.
          // (Disposed in cleanup via the edgeLines list.)
          edgeLineGroup.clear();
          edgeLines = [];
          for (const positions of baked.edgeLines) {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            const material = new THREE.LineBasicMaterial({
              color: 0xffd7a0,
              transparent: true,
              opacity: 0,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
              depthTest: false,
            });
            const lines = new THREE.LineSegments(geometry, material);
            edgeLines.push(lines);
            edgeLineGroup.add(lines);
          }

          modelLoaded = true;
        })
        .catch((error) => {
          console.error("PARTICLE BAKE LOAD ERROR:", error);
        });

      // ---- per-frame scroll → progress ------------------------------------
      function computeProgress() {
        const rect = root!.getBoundingClientRect();
        const totalSticky = rect.height - window.innerHeight;
        if (totalSticky <= 0) return { formation: 0, dispersion: 0, reveal: 0 };
        const t = Math.max(0, Math.min(1, -rect.top / totalSticky));
        const introEnd = 0.18;
        const formationEnd = 0.62;
        const holdEnd = 0.78;
        const formation = Math.max(0, Math.min(1, (t - introEnd) / (formationEnd - introEnd)));
        const dispersion = Math.max(0, Math.min(1, (t - holdEnd) / (1 - holdEnd)));
        // Reveal gate for the car particles: hidden while the intro title is up,
        // ramping in as it dissolves so they don't sit as a dense scatter cloud
        // behind the intro at the top of the section. Mirrors the stage reveal.
        const reveal = Math.max(0, Math.min(1, (t - 0.09) / (0.18 - 0.09)));
        return { formation, dispersion, reveal };
      }

      function updateParticles() {
        if (!modelLoaded) return;
        const now = performance.now();
        const fP = displayFormation;
        const dP = displayDispersion;
        const fT = ease(fP);
        const dT = dP * (2 - dP);
        const dispersing = dP > 0.001;
        const formationLocked = fP >= 0.94 && !dispersing;

        for (let i = 0; i < particleCount; i++) {
          const seed = seeds[i];
          const tx = targets[i * 3];
          const ty = targets[i * 3 + 1];
          const tz = targets[i * 3 + 2];

          if (dispersing) {
            const localT = Math.max(0, Math.min(1, (dT - seed.dispersionDelay) * seed.dispersionSpeed));
            positions[i * 3] = tx + (dispersionTargets[i * 3] - tx) * localT;
            positions[i * 3 + 1] = ty + (dispersionTargets[i * 3 + 1] - ty) * localT;
            positions[i * 3 + 2] = tz + (dispersionTargets[i * 3 + 2] - tz) * localT;
          } else if (formationLocked) {
            positions[i * 3] = tx;
            positions[i * 3 + 1] = ty;
            positions[i * 3 + 2] = tz;
          } else {
            const localT = Math.max(0, Math.min(1, (fT - seed.delay) * seed.speed));
            const ix = initialPositions[i * 3];
            const iy = initialPositions[i * 3 + 1];
            const iz = initialPositions[i * 3 + 2];
            const swirl = Math.sin(localT * Math.PI) * 0.07 * (1 - localT);
            const time = now * 0.0006;
            const fade = 1 - localT;
            positions[i * 3] = ix + (tx - ix) * localT + seed.noise.x * swirl + Math.sin(time + i * 0.2) * fade * 0.03;
            positions[i * 3 + 1] = iy + (ty - iy) * localT + seed.noise.y * swirl + Math.sin(time * 1.2 + i * 0.17) * fade * 0.03;
            positions[i * 3 + 2] = iz + (tz - iz) * localT + seed.noise.z * swirl;
          }

          const heat = dP * 0.25;
          if (isMobile) {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = 0.23 + Math.min(1, fT * 0.08 + heat);
            colors[i * 3 + 2] = 0.035 + heat * 0.15;
          } else {
            colors[i * 3] = 1.0;
            colors[i * 3 + 1] = Math.min(1, 0.42 + fT * 0.3 + heat);
            colors[i * 3 + 2] = Math.min(1, 0.14 + fT * 0.18 + heat * 0.5);
          }
        }

        particleGeometry.attributes.position.needsUpdate = true;
        particleGeometry.attributes.color.needsUpdate = true;

        const baseSize = isMobile ? 0.018 : 0.021;
        particleMaterial.size = baseSize * (1 - dP * 0.45) - fP * 0.002;

        const baseOpacity = isMobile ? 0.55 : 1.0;
        const fadeStart = 0.55;
        let formationOpacity = baseOpacity;
        if (fP >= fadeStart) {
          const fadeT = Math.min(1, (fP - fadeStart) / (1 - fadeStart));
          formationOpacity = isMobile ? baseOpacity - fadeT * 0.4 : baseOpacity - fadeT * 0.85;
        }
        particleMaterial.opacity = Math.max(0, formationOpacity * (1 - Math.pow(dP, 1.4)) * displayReveal);
      }

      function updateOutlineParticles() {
        if (!modelLoaded) return;
        const fP = displayFormation;
        const dP = displayDispersion;
        const fT = ease(fP);
        const dT = dP * (2 - dP);
        const dispersing = dP > 0.001;
        const formationLocked = fP >= 0.995 && !dispersing;

        for (let i = 0; i < outlineCount; i++) {
          const seed = outlineSeeds[i];
          const tx = outlineTargets[i * 3];
          const ty = outlineTargets[i * 3 + 1];
          const tz = outlineTargets[i * 3 + 2];

          if (dispersing) {
            const localT = Math.max(0, Math.min(1, (dT - seed.dispersionDelay) * seed.dispersionSpeed));
            outlinePositions[i * 3] = tx + (outlineDispersionTargets[i * 3] - tx) * localT;
            outlinePositions[i * 3 + 1] = ty + (outlineDispersionTargets[i * 3 + 1] - ty) * localT;
            outlinePositions[i * 3 + 2] = tz + (outlineDispersionTargets[i * 3 + 2] - tz) * localT;
            continue;
          }
          if (formationLocked) {
            outlinePositions[i * 3] = tx;
            outlinePositions[i * 3 + 1] = ty;
            outlinePositions[i * 3 + 2] = tz;
            continue;
          }

          const localT = Math.max(0, Math.min(1, (fT - seed.delay) * seed.speed));
          const ix = outlineInitialPositions[i * 3];
          const iy = outlineInitialPositions[i * 3 + 1];
          const iz = outlineInitialPositions[i * 3 + 2];
          const swirl = Math.sin(localT * Math.PI) * 0.08 * (1 - localT);
          const hold = Math.max(0, localT - 0.78) / 0.22;
          if (hold > 0) {
            outlinePositions[i * 3] = tx;
            outlinePositions[i * 3 + 1] = ty;
            outlinePositions[i * 3 + 2] = tz;
          } else {
            outlinePositions[i * 3] = ix + (tx - ix) * localT + seed.noise.x * swirl;
            outlinePositions[i * 3 + 1] = iy + (ty - iy) * localT + seed.noise.y * swirl;
            outlinePositions[i * 3 + 2] = iz + (tz - iz) * localT + seed.noise.z * swirl;
          }
        }

        outlineGeometry.attributes.position.needsUpdate = true;

        const formationOpacity = isMobile
          ? Math.min(0.5, 0.18 + fP * 0.55)
          : Math.min(1.0, 0.4 + fP * 1.4);
        outlineMaterial.opacity = Math.max(0, formationOpacity * (1 - Math.pow(dP, 1.3)) * displayReveal);

        const baseOutlineSize = isMobile ? 0.022 : 0.024;
        outlineMaterial.size = baseOutlineSize * (1 - dP * 0.4) - fP * 0.001;

        if (isMobile) {
          outlineMaterial.color.setRGB(1.0, 0.42 + dP * 0.15, 0.14 + dP * 0.1);
        } else if (fP > 0.92) {
          const boost = (fP - 0.92) / 0.08;
          outlineMaterial.color.setRGB(1.0, 0.74 + boost * 0.04 + dP * 0.1, 0.42 + boost * 0.04 + dP * 0.08);
        } else {
          outlineMaterial.color.setRGB(1.0, 0.74 + dP * 0.1, 0.42 + dP * 0.08);
        }
      }

      function updateEdgeLines() {
        if (!edgeLines.length || !modelLoaded) return;
        const fP = displayFormation;
        const dP = displayDispersion;
        const formationFade = Math.min(1, Math.max(0, (fP - 0.15) / 0.35));
        const lineOpacity = formationFade * (1 - dP);
        edgeLines.forEach((line) => {
          const material = line.material as THREE.LineBasicMaterial;
          material.opacity = lineOpacity * (isMobile ? 0.28 : 1.2);
          if (isMobile) {
            material.color.setRGB(1.0, 0.46, 0.16);
          } else if (fP > 0.9) {
            material.color.setRGB(1.0, 0.62, 0.3);
          } else {
            material.color.setRGB(1.0, 0.5, 0.22);
          }
        });
      }

      function updateCarGroup() {
        const fP = displayFormation;
        const dP = displayDispersion;
        const now = performance.now();
        if (backgroundParticles) backgroundParticles.rotation.y += 0.0004;

        if (isMobile) {
          // Mobile uses the same level, front-on camera as desktop (looking at
          // y=0) — not angled up from below. The scatter cloud starts centered
          // (y=0 at fP=0) and migrates up as it forms, so the finished car sits
          // top-centre, fully in frame above the bottom-pinned step text.
          carGroup.rotation.y = -0.15 + fP * 0.45 + Math.sin(now * 0.0003) * 0.04 + dP * 0.18;
          carGroup.rotation.x = -0.04 - fP * 0.04;
          carGroup.position.y = fP * 1.2;
          camera.position.set(0, 0.8, 8);
          camera.lookAt(0, 0, 0);
        } else {
          carGroup.rotation.y = -0.15 + fP * 0.45 + Math.sin(now * 0.0003) * 0.04 + dP * 0.18;
          carGroup.rotation.x = -0.04 - fP * 0.04;
          // Desktop keeps the car centered in the viewport.
          carGroup.position.y = 0 - fP * 0.1;
          camera.position.y = 0.8 + Math.sin(now * 0.0004) * 0.08 - fP * 0.15;
          camera.lookAt(CAR_LOOK_X, 0, 0);
        }
      }

      function syncOverlays() {
        const step = Math.max(0, Math.min(4, Math.floor(displayFormation * 5 + 0.001)));
        if (step !== lastStep) {
          lastStep = step;
          setActiveStep(step);
        }
        setFormationPct(Math.round(displayFormation * 100));
        setOutroOpacity(Math.min(1, Math.max(0, (displayDispersion - 0.15) / 0.55)));

        // The step stage (cards + rail + spine + watermark) is only visible in
        // the middle of the section: it fades IN as the intro title dissolves and
        // back OUT as the car disperses, so neither the intro nor the outro ever
        // shares the screen with it.
        const rect = root!.getBoundingClientRect();
        const totalSticky = rect.height - window.innerHeight;
        const t = totalSticky > 0 ? Math.max(0, Math.min(1, -rect.top / totalSticky)) : 0;
        const reveal = Math.max(0, Math.min(1, (t - 0.09) / (0.18 - 0.09)));
        // Fade out over the dispersion window (mirrors the outro fade-in), fully
        // gone before the outro is solid.
        const exit = 1 - Math.max(0, Math.min(1, (displayDispersion - 0.05) / 0.35));
        setStageOpacity(Math.min(reveal, exit));

        // The scroll hint fades out as soon as the user scrolls a little.
        setHintOpacity(1 - Math.max(0, Math.min(1, t / 0.04)));
      }

      function animate() {
        rafId = requestAnimationFrame(animate);
        const phases = computeProgress();
        const k = isMobile ? 0.28 : 0.22;
        displayFormation += (phases.formation - displayFormation) * k;
        displayDispersion += (phases.dispersion - displayDispersion) * k;
        displayReveal += ((phases.reveal ?? 0) - displayReveal) * k;

        updateIntroParticles();
        updateParticles();
        updateOutlineParticles();
        updateEdgeLines();
        updateCarGroup();
        syncOverlays();

        renderer.render(scene, camera);
      }

      // ---- sizing ----------------------------------------------------------
      function resize() {
        const width = root!.offsetWidth || window.innerWidth;
        const height = window.innerHeight;
        camera.fov = isMobile ? 46 : 38;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);

        if (introCanvas) {
          const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
          introDpr = dpr;
          introCanvas.width = Math.floor(width * dpr);
          introCanvas.height = Math.floor(height * dpr);
          introCanvas.style.width = width + "px";
          introCanvas.style.height = height + "px";
          buildIntroTextParticles();
        }
      }

      resize();
      animate();

      // Re-sample the title once the web font is ready, in case the first build
      // ran before Montserrat loaded (otherwise the particles take Arial's shape).
      document.fonts?.ready.then(() => {
        if (!disposed) buildIntroTextParticles();
      });

      const onResize = () => resize();
      window.addEventListener("resize", onResize, { passive: true });

      cleanupListeners = () => {
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        outlineGeometry.dispose();
        outlineMaterial.dispose();
        edgeLines.forEach((l) => {
          l.geometry.dispose();
          (l.material as THREE.Material).dispose();
        });
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cleanupListeners();
    };
    // Rebuild the whole scene when the breakpoint flips (mobile/desktop differ in
    // particle counts, sizing, camera and car placement).
  }, [isMobile]);

  return (
    <section
      ref={rootRef}
      className="relative h-[580vh] overflow-visible bg-[#050302] text-white max-[991px]:h-[500vh]"
    >
      {/* Intro — the title is rendered entirely as dissolving canvas particles
          (left-aligned to the step column). The DOM heading is screen-reader-only
          so the page still exposes a real <h2> for a11y/SEO. The scroll hint sits
          in normal flow, flex-centered at the bottom of this overlay. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex h-screen flex-col items-center overflow-hidden transition-opacity duration-300"
        style={{ opacity: introHidden ? 0 : 1 }}
      >
        <canvas
          ref={introCanvasRef}
          className="absolute inset-0 z-[1] h-full w-full"
        />
        <h2 className="sr-only">Пет стъпки. Един резултат.</h2>

        {/* Scroll hint — flex-centered at the bottom of the intro overlay */}
        <div
          className="relative z-[2] mt-auto mb-[34px] inline-flex items-center gap-3 rounded-full border border-brand-glow/20 bg-[#050302]/[0.72] px-[18px] py-3 text-xs font-bold uppercase tracking-[1.4px] text-white/80 backdrop-blur-md shadow-[0_14px_34px_rgba(0,0,0,0.35)] max-[991px]:mb-[92px] max-[991px]:max-w-[calc(100vw-32px)] max-[991px]:px-3.5 max-[991px]:py-[11px] max-[991px]:text-[10px]"
          style={{
            opacity: hintOpacity,
            animation: "sa-scroll-hint-float 1.8s ease-in-out infinite",
          }}
        >
          Скролни надолу, за да започне процесът
          <span className="h-2 w-2 rotate-45 border-b-2 border-r-2 border-brand-glow" />
        </div>
      </div>

      {/* Sticky stage — pinned canvas + step overlays */}
      <div className="sticky top-0 z-[2] h-screen w-full overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-[1] block h-full w-full"
        />

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 z-[2] bg-[radial-gradient(ellipse_at_70%_50%,transparent_30%,rgba(0,0,0,0.4)_75%),linear-gradient(180deg,rgba(5,3,2,0.6)_0%,transparent_15%,transparent_85%,rgba(5,3,2,0.7)_100%)] max-[991px]:bg-[radial-gradient(ellipse_at_50%_35%,transparent_30%,rgba(0,0,0,0.45)_80%),linear-gradient(180deg,rgba(5,3,2,0.4)_0%,transparent_12%,transparent_70%,rgba(5,3,2,0.85)_100%)]" />

        {/* Giant step number watermark — fades in with the stage. */}
        <div
          className="pointer-events-none absolute left-[-2vw] top-1/2 z-[3] -translate-y-1/2 select-none text-[52vw] font-black leading-[0.8] tracking-[-8px] text-transparent transition-opacity duration-200 [-webkit-text-stroke:1px_rgba(255,138,61,0.06)] max-[991px]:bottom-[28%] max-[991px]:left-[-4vw] max-[991px]:top-auto max-[991px]:translate-y-0 max-[991px]:text-[40vw] max-[991px]:tracking-[-3px]"
          style={{ opacity: stageOpacity }}
        >
          {`0${activeStep + 1}`}
        </div>

        {/* Mobile rail (top dots) */}
        <div
          className="absolute left-1/2 top-6 z-[5] hidden -translate-x-1/2 gap-2 transition-opacity duration-200 max-[991px]:flex"
          style={{ opacity: stageOpacity }}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-[3px] rounded-sm transition-all duration-300 ${
                i === activeStep
                  ? "w-9 bg-gradient-to-r from-brand-glow to-[#ffb37a] shadow-[0_0_8px_rgba(255,138,61,0.6)]"
                  : i < activeStep
                    ? "w-6 bg-brand-glow/40"
                    : "w-6 bg-white/15"
              }`}
            />
          ))}
        </div>

        {/* Step content — cards stacked on top of each other, only active shown.
            The outer track centers on the shared 1280px page column (matches the
            header/nav and every Container section); the card sits at its left edge.
            Fades in with the rest of the stage as the intro dissolves. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[4] mx-auto w-[min(100%-28px,1280px)] -translate-y-1/2 transition-opacity duration-200 max-[991px]:inset-x-5 max-[991px]:bottom-[100px] max-[991px]:top-auto max-[991px]:mx-0 max-[991px]:w-auto max-[991px]:translate-y-0"
          style={{ opacity: stageOpacity }}
        >
          <div className="relative h-[360px] w-[440px] max-w-[440px] max-[991px]:h-[260px] max-[991px]:w-auto max-[991px]:max-w-none">
          {STEPS.map((step, i) => (
            <div
              key={step.title}
              className="absolute inset-0 transition-[opacity,transform] duration-[600ms] ease-[cubic-bezier(.22,.61,.36,1)]"
              style={{
                opacity: i === activeStep ? 1 : 0,
                transform: i === activeStep ? "translateY(0)" : "translateY(15px)",
                visibility: i === activeStep ? "visible" : "hidden",
              }}
            >
              <div className="mb-[18px] flex items-center gap-3.5 text-sm font-bold uppercase tracking-[4px] text-brand-glow max-[991px]:mb-3 max-[991px]:text-[11px] max-[991px]:tracking-[3px]">
                {step.num}
                <span className="h-px max-w-20 flex-1 bg-gradient-to-r from-brand-glow to-transparent" />
              </div>
              {/* Heading width is capped to the left lane so it can't grow into
                  the car's column on the right. */}
              <h3 className="mb-6 max-w-[440px] text-[clamp(36px,4.6vw,68px)] font-black leading-[0.98] tracking-[-2px] max-[991px]:mb-3 max-[991px]:max-w-none max-[991px]:text-[clamp(36px,11vw,64px)] max-[991px]:tracking-[-1.5px]">
                {step.title}
              </h3>
              <p className="max-w-[420px] text-lg leading-relaxed text-white/70 max-[991px]:max-w-full max-[991px]:text-sm">
                {step.desc}
              </p>
            </div>
          ))}
          </div>
        </div>

        {/* Desktop rail — pinned to the right edge of the shared page column.
            Fades in with the stage as the intro dissolves. */}
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[5] mx-auto flex w-[min(100%-28px,1280px)] -translate-y-1/2 flex-col items-end gap-7 transition-opacity duration-200 max-[991px]:hidden"
          style={{ opacity: stageOpacity }}
        >
          {STEPS.map((step, i) => (
            <div
              key={step.rail}
              className="flex items-center gap-4 transition-opacity duration-300"
              style={{ opacity: i === activeStep ? 1 : i < activeStep ? 0.7 : 0.35 }}
            >
              <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[2px] text-white/85">
                {step.rail}
              </span>
              <span
                className="h-px transition-all duration-300"
                style={
                  i === activeStep
                    ? {
                        width: "40px",
                        height: "2px",
                        background: "linear-gradient(90deg, transparent, #ff8a3d)",
                        boxShadow: "0 0 12px rgba(255,138,61,0.6)",
                      }
                    : { width: "24px", background: "rgba(255,255,255,0.3)" }
                }
              />
              <span className="w-8 text-right text-xs font-bold tracking-[2px] text-white/70">
                {`0${i + 1}`}
              </span>
            </div>
          ))}
        </div>

        {/* Progress spine — label + bar span the shared page column. Fades in
            with the stage as the intro dissolves. */}
        <div
          className="absolute inset-x-0 bottom-[70px] z-[5] mx-auto w-[min(100%-28px,1280px)] text-[11px] font-bold uppercase tracking-[3px] text-white/40 transition-opacity duration-200 max-[991px]:bottom-[38px] max-[991px]:w-auto max-[991px]:px-5 max-[991px]:text-[9px] max-[991px]:tracking-[2px]"
          style={{ opacity: stageOpacity }}
        >
          <span className="text-brand-glow">{formationPct}%</span> · от заявка до ключ
        </div>
        <div
          className="absolute inset-x-0 bottom-[60px] z-[5] mx-auto h-px w-[min(100%-28px,1280px)] overflow-hidden bg-white/[0.08] transition-opacity duration-200 max-[991px]:bottom-[30px] max-[991px]:w-[calc(100%-40px)]"
          style={{ opacity: stageOpacity }}
        >
          <div
            className="h-full bg-gradient-to-r from-brand-glow to-[#ffb37a] shadow-[0_0_8px_rgba(255,138,61,0.7)]"
            style={{ width: `${formationPct}%` }}
          />
        </div>
      </div>

      {/* Outro — fades in during dispersion. Centered on all sizes so there's no
          large empty gap below the CTA. */}
      <div
        className="absolute inset-x-0 bottom-0 z-[5] flex h-screen flex-col items-center justify-center px-6 pb-8 text-center transition-opacity duration-300"
        style={{ opacity: outroOpacity, pointerEvents: outroOpacity > 0.9 ? "auto" : "none" }}
      >
        <div className="mb-5 text-xs font-bold uppercase tracking-[4px] text-brand-glow/90 max-[991px]:mb-4 max-[991px]:text-[10px] max-[991px]:tracking-[3px]">
          Резултат
        </div>
        <h3 className="mb-7 bg-gradient-to-br from-white to-[#ffb37a] bg-clip-text text-[clamp(34px,8vw,72px)] font-black leading-none tracking-[-1.5px] text-transparent max-[991px]:mb-5">
          Колата ви очаква.
        </h3>
        <p className="mb-9 max-w-[460px] text-[17px] leading-relaxed text-white/65 max-[991px]:mb-7 max-[991px]:text-[15px]">
          Не каталог. Не обещание. Готов автомобил с изрядна история и документи.
        </p>
        <LinkButton
          href="/kontakti/"
          rippleTheme="light"
          className="inline-flex min-h-12 items-center justify-center gap-2.5 rounded-full bg-gradient-to-br from-brand-glow to-[#e86c20] px-9 py-[18px] text-[15px] font-bold text-white shadow-[0_12px_30px_rgba(232,108,32,0.4)] transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.97] max-[991px]:px-[30px] max-[991px]:py-4 max-[991px]:text-sm"
        >
          Започнете процеса →
        </LinkButton>
      </div>
    </section>
  );
}
