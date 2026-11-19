"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { LinkButton } from "@/components/common";
import { ArrowRightIcon, ChevronDownIcon } from "@/components/icons";
import { loadBakedGeometry } from "@/lib/baked-edges";
import { isSoftwareRenderer } from "@/lib/webgl";
// Type-only import: erased at build time, so `three` never enters the server
// bundle, while THREE.* type annotations below still resolve.
import type * as THREE from "three";

/**
 * Scroll-driven 3D particle process animation.
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
 *
 * Look (boards `in-proces`, `in-proces-flow`): the overlays — the scroll hint, the step panel, the watermark number,
 * the rail (dots below 992 px), the progress line and the outro — take the kit's type and colours; the layout switches
 * at the scene's own 991 px breakpoint. When WebGL can't run (the renderer can't be created, the context is lost, or
 * the baked geometry fails to load) the section gives way to the static band of board `in-proces-nogl`.
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
    desc: "Участваме директно — на аукциони в Корея, САЩ и Канада. Стратегия, не късмет.",
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
  // WebGL couldn't run: the static band replaces the scroll section.
  const [webglFailed, setWebglFailed] = useState(false);

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
      const THREE = await import("@/lib/three");
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

      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: !isMobile,
          alpha: true,
          powerPreference: "high-performance",
        });
      } catch (error) {
        // No WebGL (blocked, unsupported, or the GPU process gave up): show the static band instead of a black page.
        console.error("PARTICLE WEBGL ERROR:", error);
        setWebglFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2));

      // Without a GPU every frame of this scene is rasterised on the CPU, in
      // main-thread time: measured, the page sat at ~13fps with the main thread
      // 100% busy while nothing was moving. So there a frame is drawn only when
      // scrolling has actually changed it (see animate()) — the scroll-driven
      // story still plays, the idle sway and shimmer do not.
      const drawOnDemand = isSoftwareRenderer(renderer.getContext());
      // Set by anything OTHER than scrolling that changes what a frame shows.
      let needsDraw = true;
      let lastDrawnT = -1;
      // False once the section has scrolled out of view entirely.
      let onScreen = true;

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
      // Not drawn until it has an opacity to show — see updateParticles().
      particles.visible = false;
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
      outlineParticles.visible = false;
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
      // Dissolve progress the intro canvas was last painted at (-1 = repaint).
      let introDrawnAt = -1;
      // When the dissolve last reached 1 (see updateIntroParticles).
      let introDoneAt = 0;
      // The intro overlay's opacity transition (duration-300) plus a margin.
      const INTRO_FADE_MS = 400;

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
        // The kit's display face (Unbounded, exposed as the --font-unbounded CSS var on <html>), so the particle
        // glyphs match the site's titles. It is wide: the size shrinks until the longer line fits.
        const titleFont =
          getComputedStyle(document.documentElement)
            .getPropertyValue("--font-unbounded")
            .trim() || "Arial";
        const fontAt = (px: number) => `700 ${px}px ${titleFont}, Arial, sans-serif`;
        let fontPx = titleSize * dpr;
        ctx.font = fontAt(fontPx);
        const widest = Math.max(ctx.measureText("Пет стъпки.").width, ctx.measureText("Един резултат.").width);
        const maxWidth = w * (isMobile ? 0.86 : 0.8);
        if (widest > maxWidth) {
          fontPx *= maxWidth / widest;
          ctx.font = fontAt(fontPx);
        }
        ctx.textAlign = "center";

        // Two centered lines, one sentence each:
        //   line 1: "Пет стъпки."        (white)
        //   line 2: "Един резултат."     ("Един" in brand orange)
        const lineGap = fontPx * (isMobile ? 0.45 : 0.6);
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
        // gap is in canvas (device) pixels; the canvas is dpr-scaled, so on-screen
        // dot pitch = gap / dpr. Mobile (dpr 1.5) uses gap 4 to land at ~2.7px
        // pitch, matching desktop's 5/2 = 2.5px — otherwise the mobile grid is far
        // coarser and the glyphs read as a loose, washed-out dot matrix.
        const gap = isMobile ? 4 : 5;
        introParticles = [];
        introDrawnAt = -1;
        needsDraw = true;
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
                // Keep visibly separated dots (the dot-matrix look), not solid
                // glyphs: ~65% cell fill. Desktop 2.25/2.5px, mobile 2.6/2.7px.
                size: isMobile ? 2.6 * dpr : 2.25 * dpr,
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

        // At rest the canvas already shows what a repaint would draw, and a
        // repaint is thousands of fillRects — every frame, at the top of the page
        // where every visit starts. Fully formed (0), every particle sits still
        // on its glyph pixel. Fully dissolved (1), a few late particles are still
        // faintly visible and wobbling, so painting continues until the overlay
        // has faded out (setIntroHidden below), and only then stops.
        if (p === 0 && introDrawnAt === 0) return;
        if (p === 1) {
          if (introDrawnAt !== 1) introDoneAt = performance.now();
          else if (performance.now() - introDoneAt > INTRO_FADE_MS) return;
        }
        introDrawnAt = p;

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
          needsDraw = true;
        })
        .catch((error) => {
          console.error("PARTICLE BAKE LOAD ERROR:", error);
          if (!disposed) setWebglFailed(true);
        });

      // ---- per-frame scroll → progress ------------------------------------
      function computeProgress() {
        const rect = root!.getBoundingClientRect();
        const totalSticky = rect.height - window.innerHeight;
        if (totalSticky <= 0) return { t: 0, formation: 0, dispersion: 0, reveal: 0 };
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
        return { t, formation, dispersion, reveal };
      }

      /**
       * Below this a point cloud contributes nothing to any pixel (additive
       * blending sums overlapping sprites, so "nothing" has to be far below 1/255
       * per sprite). Such a cloud is hidden and its per-particle update skipped —
       * at the top of the page that is all 50,000 particles, recomputed and
       * re-uploaded every frame while invisible.
       */
      const INVISIBLE = 1e-5;

      function updateParticles() {
        if (!modelLoaded) return;
        const now = performance.now();
        const fP = displayFormation;
        const dP = displayDispersion;

        const baseOpacity = isMobile ? 0.55 : 1.0;
        const fadeStart = 0.55;
        let formationOpacity = baseOpacity;
        if (fP >= fadeStart) {
          const fadeT = Math.min(1, (fP - fadeStart) / (1 - fadeStart));
          formationOpacity = isMobile ? baseOpacity - fadeT * 0.4 : baseOpacity - fadeT * 0.85;
        }
        particleMaterial.opacity = Math.max(0, formationOpacity * (1 - Math.pow(dP, 1.4)) * displayReveal);
        particles.visible = particleMaterial.opacity > INVISIBLE;
        if (!particles.visible) return;

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
      }

      function updateOutlineParticles() {
        if (!modelLoaded) return;
        const fP = displayFormation;
        const dP = displayDispersion;

        const formationOpacity = isMobile
          ? Math.min(0.5, 0.18 + fP * 0.55)
          : Math.min(1.0, 0.4 + fP * 1.4);
        outlineMaterial.opacity = Math.max(0, formationOpacity * (1 - Math.pow(dP, 1.3)) * displayReveal);
        outlineParticles.visible = outlineMaterial.opacity > INVISIBLE;
        if (!outlineParticles.visible) return;

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
          line.visible = material.opacity > INVISIBLE;
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

      // The eased values chase their scroll targets forever in theory; this close
      // counts as arrived.
      const SETTLED = 0.0005;

      function animate() {
        rafId = requestAnimationFrame(animate);
        if (!onScreen) return;

        const phases = computeProgress();
        if (drawOnDemand) {
          const easing =
            Math.abs(phases.formation - displayFormation) > SETTLED ||
            Math.abs(phases.dispersion - displayDispersion) > SETTLED ||
            Math.abs(phases.reveal - displayReveal) > SETTLED;
          if (!easing && !needsDraw && phases.t === lastDrawnT) return;
          needsDraw = false;
          lastDrawnT = phases.t;
        }
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
        // Resizing clears the canvas.
        needsDraw = true;

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
      // ran before the display font loaded (otherwise the particles take Arial's shape).
      document.fonts?.ready.then(() => {
        if (!disposed) buildIntroTextParticles();
      });

      const onResize = () => resize();
      window.addEventListener("resize", onResize, { passive: true });

      // The GPU dropped the context: a driver reset, too many contexts, but also a laptop's sleep or a phone switching
      // apps. three.js asks for it back (preventDefault) and rebuilds when it returns, so only a context that stays
      // lost means nothing will draw again. Then the static band replaces the scene, and the scene stops here: the loop
      // and the GPU objects with it, which kept running behind the band (production review, 18.11.2026).
      let restoreTimer: ReturnType<typeof setTimeout> | undefined;
      const onContextLost = () => {
        if (disposed) return;
        clearTimeout(restoreTimer);
        restoreTimer = setTimeout(() => {
          if (disposed) return;
          disposed = true;
          cancelAnimationFrame(rafId);
          // Once: the effect's own cleanup runs it again when the page unmounts.
          const cleanup = cleanupListeners;
          cleanupListeners = () => {};
          cleanup();
          setWebglFailed(true);
        }, 3000);
      };
      const onContextRestored = () => {
        clearTimeout(restoreTimer);
        needsDraw = true;
      };
      canvas.addEventListener("webglcontextlost", onContextLost);
      canvas.addEventListener("webglcontextrestored", onContextRestored);

      // Past the section (the written steps and the footer below it) the pinned
      // canvas is off screen, but the loop kept simulating and drawing all of it.
      const observer = new IntersectionObserver((entries) => {
        onScreen = entries[0]?.isIntersecting ?? true;
        if (onScreen) needsDraw = true;
      });
      observer.observe(root);

      cleanupListeners = () => {
        observer.disconnect();
        window.removeEventListener("resize", onResize);
        canvas.removeEventListener("webglcontextlost", onContextLost);
        canvas.removeEventListener("webglcontextrestored", onContextRestored);
        clearTimeout(restoreTimer);
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

  if (webglFailed) {
    // Board `in-proces-nogl`: the formed car as a picture, the title as real text, and the outro.
    return (
      // The page has no top padding (the 3D intro starts under the fixed header), so the band makes room for it. Night
      // in both themes, as the 3D band it stands in for.
      <section className="in-ng pt-(--header-h)" aria-label="Процесът" data-theme="dark">
        <div className="sa-wrap in-ng__in">
          <div className="in-ng__copy">
            <h2 className="in-ng__t">
              Пет стъпки.
              <br />
              <em className="sa-em">Един</em> резултат.
            </h2>
            <div className="in-ng__out">
              <span className="sa-eyebrow">Резултат</span>
              <h3>Колата ви очаква.</h3>
              <p className="sa-lead">Не каталог. Не обещание. Готов автомобил с изрядна история и документи.</p>
              <LinkButton href="/kontakti" variant="pri" size="xl">
                Започнете процеса
                <ArrowRightIcon />
              </LinkButton>
            </div>
          </div>
          <div className="in-ng__img">
            {/* The formed car, a still of this scene (formation complete, 1440 px). */}
            {/* A cut-out: the scene's dark ground is transparent, so the car sits in the band's glow as on the board. */}
            {/* eslint-disable-next-line @next/next/no-img-element -- a local, decorative still: no responsive set needed. */}
            <img src="/images/proces-car.webp" alt="" width={660} height={400} />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={rootRef}
      aria-label="Процесът в 3D"
      // Night in both themes: a dark band whose particles glow additively on its dark ground (styles/tokens.css).
      data-theme="dark"
      className="in-ps relative h-[580vh] overflow-visible text-tx max-[991px]:h-[500vh]"
    >
      {/* Intro — the title is rendered entirely as dissolving canvas particles.
          The DOM heading is screen-reader-only so the page still exposes a real
          <h2> for a11y/SEO. The scroll hint sits in normal flow, flex-centered at
          the bottom of this overlay. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-5 flex h-screen flex-col items-center overflow-hidden transition-opacity duration-300"
        style={{ opacity: introHidden ? 0 : 1 }}
      >
        <canvas ref={introCanvasRef} className="absolute inset-0 z-1 size-full" />
        <h2 className="sr-only">Пет стъпки. Един резултат.</h2>

        {/* Scroll hint — flex-centered at the bottom of the intro overlay */}
        <p
          className="in-hint relative z-2 mt-auto mb-8.5 max-[991px]:mb-23"
          style={{
            opacity: hintOpacity,
            animation: "sa-scroll-hint-float 1.8s ease-in-out infinite",
          }}
        >
          Скролнете надолу, за да започне процесът
          <ChevronDownIcon />
        </p>
      </div>

      {/* Sticky stage — pinned canvas + step overlays */}
      <div className="sticky top-0 z-2 h-screen w-full overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 z-1 block size-full" />

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 z-2 bg-[radial-gradient(ellipse_at_70%_50%,transparent_30%,rgba(0,0,0,0.4)_75%),linear-gradient(180deg,rgba(8,9,11,0.6)_0%,transparent_15%,transparent_85%,rgba(8,9,11,0.7)_100%)] max-[991px]:bg-[radial-gradient(ellipse_at_50%_35%,transparent_30%,rgba(0,0,0,0.45)_80%),linear-gradient(180deg,rgba(8,9,11,0.4)_0%,transparent_12%,transparent_70%,rgba(8,9,11,0.85)_100%)]" />

        {/* Giant step number watermark — fades in with the stage. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-[calc(var(--spacing-gutter)*-0.6)] z-3 -translate-y-1/2 font-display text-[clamp(260px,38vw,760px)] leading-[0.8] font-bold tracking-tighter text-transparent transition-opacity duration-200 select-none [-webkit-text-stroke:2px_rgba(255,255,255,0.055)] max-[991px]:top-auto max-[991px]:bottom-[22%] max-[991px]:translate-y-0 max-[991px]:text-[clamp(200px,40vw,420px)]"
          style={{ opacity: stageOpacity }}
        >
          {`0${activeStep + 1}`}
        </div>

        {/* Mobile rail (top dots) */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(var(--header-h)+16px)] z-5 hidden justify-center gap-2 transition-opacity duration-200 max-[991px]:flex"
          style={{ opacity: stageOpacity }}
        >
          {STEPS.map((step, i) => (
            <i
              key={step.rail}
              className={`h-0.75 rounded-xs transition-all duration-300 ${
                i === activeStep ? "w-9 bg-or" : i < activeStep ? "w-6 bg-[rgba(255,122,26,0.45)]" : "w-6 bg-s3"
              }`}
            />
          ))}
        </div>

        {/* Step content — the panels stacked, only the active one shown, at the left of the page column.
            Fades in with the rest of the stage as the intro dissolves. */}
        <div
          className="sa-wrap pointer-events-none absolute inset-x-0 top-1/2 z-4 -translate-y-1/2 transition-opacity duration-200 max-[991px]:top-auto max-[991px]:bottom-25 max-[991px]:translate-y-0"
          style={{ opacity: stageOpacity }}
        >
          <div className="relative h-90 w-110 max-w-110 max-[991px]:h-65 max-[991px]:w-auto max-[991px]:max-w-none">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="absolute inset-0 flex flex-col gap-4.5 transition-[opacity,transform] duration-600 ease-[cubic-bezier(.22,.61,.36,1)] max-[991px]:gap-3"
                style={{
                  opacity: i === activeStep ? 1 : 0,
                  transform: i === activeStep ? "translateY(0)" : "translateY(15px)",
                  visibility: i === activeStep ? "visible" : "hidden",
                }}
              >
                <p className="flex items-center gap-3.5 font-sans text-sm leading-none font-extrabold tracking-[.06em] text-ortx after:h-px after:w-18 after:bg-or after:content-['']">
                  {step.num}
                </p>
                {/* Capped to the left lane so the heading can't grow into the car's column on the right. */}
                <h3 className="max-w-110 font-display text-[clamp(44px,4.4vw,76px)] leading-none font-bold tracking-[-0.03em] max-[991px]:max-w-none max-[991px]:text-[44px]">
                  {step.title}
                </h3>
                <p className="max-w-[34ch] text-[clamp(16px,.4vw+14px,20px)] leading-[1.6] text-tx2">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop rail — at the right edge of the page column. Fades in with the stage. */}
        <ol
          aria-label="Стъпки"
          className="sa-wrap pointer-events-none absolute inset-x-0 top-1/2 z-5 flex -translate-y-1/2 flex-col items-end gap-5.5 transition-opacity duration-200 max-[991px]:hidden"
          style={{ opacity: stageOpacity }}
        >
          {STEPS.map((step, i) => (
            <li
              key={step.rail}
              aria-current={i === activeStep ? "step" : undefined}
              className={`flex items-center gap-3.5 text-sm font-bold whitespace-nowrap transition-colors duration-300 ${
                i === activeStep ? "text-tx" : i < activeStep ? "text-tx2" : "text-tx3"
              }`}
            >
              {step.rail}
              <span
                className={`transition-all duration-300 ${i === activeStep ? "h-0.5 w-10 bg-or" : "h-px w-6 bg-hair2"}`}
              />
              <b
                className={`w-6 text-right font-mono text-[13px] leading-none font-semibold ${
                  i === activeStep ? "text-ortx" : ""
                }`}
              >
                {`0${i + 1}`}
              </b>
            </li>
          ))}
        </ol>

        {/* Progress — the label and the line across the page column. Fades in with the stage. */}
        <div
          className="sa-wrap absolute inset-x-0 bottom-11 z-5 transition-opacity duration-200 max-[991px]:bottom-8"
          style={{ opacity: stageOpacity }}
        >
          <p className="font-sans text-[12.5px] leading-none font-bold tracking-[.06em] text-tx3">
            <b className="font-extrabold text-ortx">{formationPct}%</b> · от заявка до ключ
          </p>
          <div className="mt-3.5 h-0.5 bg-hair">
            <i className="block h-full bg-or" style={{ width: `${formationPct}%` }} />
          </div>
        </div>
      </div>

      {/* Outro — fades in during dispersion. Centered on all sizes so there's no
          large empty gap below the CTA. */}
      <div
        className="absolute inset-x-0 bottom-0 z-5 flex h-screen flex-col items-center justify-center gap-4.5 px-6 pb-8 text-center transition-opacity duration-300"
        style={{ opacity: outroOpacity, pointerEvents: outroOpacity > 0.9 ? "auto" : "none" }}
      >
        <span className="sa-eyebrow before:hidden">Резултат</span>
        <h3 className="font-display text-[clamp(36px,4.4vw,72px)] leading-[1.02] font-bold tracking-[-0.03em]">
          Колата ви очаква.
        </h3>
        <p className="sa-lead mx-auto">Не каталог. Не обещание. Готов автомобил с изрядна история и документи.</p>
        <LinkButton href="/kontakti" variant="pri" size="xl" className="max-sm:w-full">
          Започнете процеса
          <ArrowRightIcon />
        </LinkButton>
      </div>
    </section>
  );
}
