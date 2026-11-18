"use client";

import { useEffect, useRef, useState } from "react";
import { Button, LinkButton } from "@/components/common";
import { HERO_MODELS } from "@/data/home";
import { useInquiry } from "@/contexts/inquiry-context";
import { afterFirstPaint } from "@/lib/after-first-paint";
import { loadHeroPoints, type HeroTier } from "@/lib/baked-hero";
import { isSoftwareRenderer } from "@/lib/webgl";

/**
 * 3D particle hero — a Three.js scene where each GLB car model is sampled into a
 * point cloud; particles morph from one model to the next on a loop. The page's
 * only glow (decision 8; boards `hm-home`, `hm-flow-hero`, `hm-home-states`).
 *
 * Layout: from 1024 px the scene spans the hero behind the copy, the camera
 * offset putting the car in the right half, and the model's name sits at the
 * hero's bottom right with the eyebrow and the dots. Below 1024 px the copy comes
 * first and the scene follows as a full-width block, the name overlapping its
 * foot.
 *
 * three is loaded dynamically inside the effect so it never lands in the server
 * bundle and the canvas only initialises in the browser.
 */
export function ParticleHero() {
  const { open: openInquiry } = useInquiry();
  const heroRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [modelName, setModelName] = useState(HERO_MODELS[0].name);
  const [modelMeta, setModelMeta] = useState(HERO_MODELS[0].meta);
  const [activeDot, setActiveDot] = useState(0);
  const [infoVisible, setInfoVisible] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hero = heroRef.current;
    if (!canvas || !hero) return;

    let disposed = false;
    let rafId = 0;
    let cleanupListeners = () => {};

    // The scene is decoration — the hero's copy, the page's LCP element, is already
    // in the server HTML — so three (~190KB) and the WebGL context wait for that
    // copy to paint rather than starting straight from this effect.
    const cancelStart = afterFirstPaint(async () => {
      const THREE = await import("@/lib/three");
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      if (disposed) return;

      // Up to 1023 px the scene is a block under the copy (see the layout note above); from 1024 px it spans the hero.
      const isMobile = () => window.innerWidth <= 768;
      const isTablet = () => window.innerWidth > 768 && window.innerWidth <= 1023;

      // Which pre-baked point-cloud variant to fetch. Must line up with
      // PARTICLE_COUNT below and the TIERS in scripts/bake-hero-points.mjs.
      const tier: HeroTier = isMobile()
        ? "mobile"
        : isTablet()
          ? "tablet"
          : "desktop";
      const PARTICLE_COUNT = isMobile() ? 2500 : isTablet() ? 5000 : 8000;
      const STATIC_DURATION = 4.2;
      const MORPH_DURATION = 2.2;

      let isVisible = true;
      const models: Float32Array[] = [];
      let currentIndex = 0;
      let nextIndex = 1;
      let phase: "static" | "morphing" = "static";
      let phaseT = 0;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile(),
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;

      // When true the hero shows ONE rendered frame of the first model instead of
      // running the loop. Without a GPU every frame of this scene (thousands of
      // blended sprites over a full-viewport canvas) is rasterised on the CPU and
      // takes longer than a frame: measured on such a machine it was one 50-150ms
      // main-thread task per frame, back to back, for as long as the page was open
      // — the page never became responsive. Set up front for a known software
      // renderer, and later by the watchdog in animate() for anything else too slow.
      let still = isSoftwareRenderer(renderer.getContext());

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        isMobile() ? 44 : 36,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100,
      );

      // From 1024 px the canvas spans the hero and the view offset puts the car in its right half. Below, the canvas
      // is a wide block under the copy (boards `hm-home-p`, `-t`; aspect 1170:640): the view is centred and the field
      // of view narrowed so the car's side, 4,9 units long in the baked clouds, spans about 85% of the block's width
      // as drawn. At the cameras' distances (8,9 and 7,6 units) that takes 20° and 22°, against 44° and 36° before.
      // The particles are world-sized, so they zoom with the car and the cloud looks as dense as before.
      function applyResponsiveCamera() {
        const width = canvas!.clientWidth || hero!.clientWidth;
        const height = canvas!.clientHeight || hero!.clientHeight;
        camera.aspect = width / height;
        if (isMobile()) {
          camera.fov = 20;
          camera.position.set(4.2, 1.8, 8.8);
          camera.clearViewOffset();
        } else if (isTablet()) {
          camera.fov = 22;
          camera.position.set(4.4, 2.1, 7.4);
          camera.clearViewOffset();
        } else {
          camera.fov = 36;
          camera.position.set(4.6, 2.2, 7.2);
          camera.setViewOffset(width, height, -width * 0.2, 0, width, height);
        }
        camera.updateProjectionMatrix();
      }
      applyResponsiveCamera();

      // Touch devices scroll the page with a one-finger drag. OrbitControls
      // treats that same gesture as rotate and — critically — its connect()
      // hard-sets `domElement.style.touchAction = 'none'`, overriding the CSS
      // `pan-y` and telling the browser never to scroll from a swipe that
      // begins over the canvas. Since the hero canvas covers the lower half of
      // a full-height mobile hero, that swallows the swipe users make to scroll
      // down. So on touch devices we drop finger-rotate (autoRotate still spins
      // the model) and restore vertical page scrolling.
      const isTouch =
        window.matchMedia?.("(pointer: coarse)")?.matches ??
        "ontouchstart" in window;

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableRotate = !isTouch;
      controls.autoRotate = true;
      controls.autoRotateSpeed = isMobile() ? 0.35 : 0.65;
      controls.target.set(4.25, 0.25, 0);

      if (isTouch) {
        // Undo the `touchAction = 'none'` OrbitControls set in its constructor
        // so a one-finger drag over the canvas scrolls the page (pan-y) again.
        renderer.domElement.style.touchAction = "pan-y";
      }

      const root = new THREE.Group();
      root.position.set(4.25, isMobile() ? -1.0 : -0.72, 0);
      scene.add(root);

      scene.add(new THREE.AmbientLight(0xffffff, isMobile() ? 2.2 : 1.25));
      const keyLight = new THREE.DirectionalLight(0xffd7b5, isMobile() ? 3.8 : 2.6);
      keyLight.position.set(5, 6, 5);
      scene.add(keyLight);
      const orangeLight = new THREE.PointLight(
        0xff7a22,
        isMobile() ? 4.5 : 2.8,
        isMobile() ? 16 : 12,
      );
      orangeLight.position.set(2.5, 1.6, 3.5);
      scene.add(orangeLight);
      const rimLight = new THREE.DirectionalLight(0xff8a3d, isMobile() ? 3.2 : 2.0);
      rimLight.position.set(-5, 3, -4);
      scene.add(rimLight);

      function makeParticleTexture() {
        const size = 64;
        const c = document.createElement("canvas");
        c.width = size;
        c.height = size;
        const ctx = c.getContext("2d")!;
        const g = ctx.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2,
        );
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.22, "rgba(255,210,150,0.95)");
        g.addColorStop(0.5, "rgba(255,138,61,0.55)");
        g.addColorStop(1, "rgba(255,138,61,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        const tex = new THREE.CanvasTexture(c);
        // The sprite is a radially-symmetric gradient, so a vertical flip is a
        // visual no-op. Keeping flipY/premultiplyAlpha off means this 2D upload
        // never leaves UNPACK_FLIP_Y_WEBGL enabled on the (browser-pooled) WebGL
        // context — which otherwise trips "texImage3D: FLIP_Y or PREMULTIPLY_ALPHA
        // isn't allowed" when a *later* WebGLRenderer inits its empty 3D/array
        // placeholder textures on the reused context. Repro: home → other page →
        // home soft-nav remount (three assumes a fresh context has flipY off and
        // doesn't reset it before those init uploads).
        tex.flipY = false;
        tex.premultiplyAlpha = false;
        tex.needsUpdate = true;
        return tex;
      }
      const particleTexture = makeParticleTexture();

      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const fromPositions = new Float32Array(PARTICLE_COUNT * 3);
      const toPositions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      const noise = new Float32Array(PARTICLE_COUNT * 3);

      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const ix = i * 3;
        noise[ix] = (Math.random() - 0.5) * 2;
        noise[ix + 1] = (Math.random() - 0.5) * 2;
        noise[ix + 2] = (Math.random() - 0.5) * 2;
        const v = 0.75 + Math.random() * 0.25;
        colors[ix] = 1.0 * v;
        colors[ix + 1] = 0.42 * v;
        colors[ix + 2] = 0.12 * v;
      }

      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      particleGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const BASE_SIZE = isMobile() ? 0.14 : isTablet() ? 0.055 : 0.038;
      const particleMaterial = new THREE.PointsMaterial({
        size: BASE_SIZE,
        map: particleTexture,
        vertexColors: true,
        transparent: true,
        opacity: isMobile() ? 1.0 : 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });
      root.add(new THREE.Points(particleGeometry, particleMaterial));

      function showModelInfo(i: number) {
        setModelName(HERO_MODELS[i].name);
        setModelMeta(HERO_MODELS[i].meta);
        setActiveDot(i);
        setInfoVisible(true);
      }

      const easeInOut = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      // Timer replaces the deprecated THREE.Clock (deprecated r183). Unlike
      // Clock, getDelta()/getElapsed() don't advance time — update() does, once
      // per frame. connect(document) wires the Page Visibility API so the delta
      // is forced to 0 while the tab is hidden, which is what our manual
      // clock.getDelta() "flush" calls used to do by hand.
      const timer = new THREE.Timer();
      timer.connect(document);

      /** Draws the current model once, at rest — the `still` hero. */
      function renderStill() {
        // Nothing redraws after this except a resize, so neither a drag nor the
        // auto-rotation may move the camera in between.
        controls.enabled = false;
        controls.autoRotate = false;
        positions.set(models[currentIndex]);
        particleGeometry.attributes.position.needsUpdate = true;
        particleMaterial.size = BASE_SIZE;
        controls.update();
        renderer.render(scene, camera);
      }

      // Frame-rate watchdog, judged once. The first WARMUP_MS of animation are
      // skipped (shader compilation and the first buffer uploads always hitch);
      // frames are then judged until JUDGE_MS more have passed AND at least
      // MIN_JUDGED_FRAMES have run — the frame floor keeps one long stall from
      // deciding it alone, the time floor keeps a fast device from deciding it on a
      // handful of frames. If most of the judged frames arrived more than
      // SLOW_FRAME_MS apart, the device is spending a long task on every frame: it
      // cannot hold the animation without freezing input, so settle on the still.
      const SLOW_FRAME_MS = 50;
      const WARMUP_MS = 1000;
      const JUDGE_MS = 2000;
      const MIN_JUDGED_FRAMES = 10;
      let watching = true;
      let lastFrameAt = 0;
      let animatedMs = 0;
      let judgedFrames = 0;
      let slowFrames = 0;

      function animate(timestamp?: number) {
        rafId = requestAnimationFrame(animate);
        if (!isVisible || !models.length) {
          // Scrolled away: the next frame's gap is a pause, not a slow frame.
          lastFrameAt = 0;
          return;
        }

        if (watching && timestamp !== undefined) {
          const gap = lastFrameAt ? timestamp - lastFrameAt : 0;
          lastFrameAt = timestamp;
          animatedMs += gap;
          if (animatedMs > WARMUP_MS) {
            judgedFrames += 1;
            if (gap > SLOW_FRAME_MS) slowFrames += 1;
            if (animatedMs > WARMUP_MS + JUDGE_MS && judgedFrames >= MIN_JUDGED_FRAMES) {
              watching = false;
              if (slowFrames > judgedFrames / 2) {
                still = true;
                cancelAnimationFrame(rafId);
                renderStill();
                showModelInfo(currentIndex);
                return;
              }
            }
          }
        }

        timer.update(timestamp);
        const dt = Math.min(timer.getDelta(), 0.05);
        const t = timer.getElapsed();
        phaseT += dt;

        if (phase === "static" && phaseT >= STATIC_DURATION) {
          if (models.length < 3 || !models[1] || !models[2]) {
            phaseT = 0;
            return;
          }
          phase = "morphing";
          phaseT = 0;
          nextIndex = (currentIndex + 1) % models.length;
          toPositions.set(models[nextIndex]);
          fromPositions.set(models[currentIndex]);
          setInfoVisible(false);
        }

        if (phase === "morphing") {
          const p = Math.min(phaseT / MORPH_DURATION, 1);
          const e = easeInOut(p);
          const swell = Math.sin(p * Math.PI) * (isMobile() ? 0.42 : 0.65);
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3;
            positions[ix] =
              fromPositions[ix] +
              (toPositions[ix] - fromPositions[ix]) * e +
              noise[ix] * swell;
            positions[ix + 1] =
              fromPositions[ix + 1] +
              (toPositions[ix + 1] - fromPositions[ix + 1]) * e +
              noise[ix + 1] * swell;
            positions[ix + 2] =
              fromPositions[ix + 2] +
              (toPositions[ix + 2] - fromPositions[ix + 2]) * e +
              noise[ix + 2] * swell;
          }
          particleMaterial.size = BASE_SIZE + swell * (isMobile() ? 0.04 : 0.02);
          if (p >= 1) {
            currentIndex = nextIndex;
            phase = "static";
            phaseT = 0;
            positions.set(models[currentIndex]);
            showModelInfo(currentIndex);
            particleMaterial.size = BASE_SIZE;
          }
        } else {
          const current = models[currentIndex];
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const ix = i * 3;
            const shimmer = Math.sin(t * 3 + i * 0.13) * 0.006;
            positions[ix] = current[ix] + noise[ix] * shimmer;
            positions[ix + 1] = current[ix + 1] + noise[ix + 1] * shimmer;
            positions[ix + 2] = current[ix + 2] + noise[ix + 2] * shimmer;
          }
        }

        particleGeometry.attributes.position.needsUpdate = true;
        controls.update();
        renderer.render(scene, camera);
      }

      async function init() {
        try {
          // Fetch the first model's baked point cloud, paint it, and start the
          // loop immediately; the other two are tiny (<100KB) and fetched right
          // after so the morph has its targets ready.
          models[0] = await loadHeroPoints(HERO_MODELS[0].src, tier);
          if (disposed) return;
          positions.set(models[0]);
          fromPositions.set(models[0]);
          particleGeometry.attributes.position.needsUpdate = true;
          showModelInfo(0);
          if (still) {
            // No loop and no morph, so the other two models are never needed.
            renderStill();
            return;
          }
          animate();
          try {
            const [m1, m2] = await Promise.all([
              loadHeroPoints(HERO_MODELS[1].src, tier),
              loadHeroPoints(HERO_MODELS[2].src, tier),
            ]);
            if (disposed) return;
            models[1] = m1;
            models[2] = m2;
            toPositions.set(models[1]);
          } catch {
            /* secondary models failed — hero keeps showing the first model */
          }
        } catch {
          setModelName("3D ERROR");
          setModelMeta("Моделът не успя да се зареди");
        }
      }

      const observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
          // Reset so the frame after re-entering the viewport doesn't see a
          // large accumulated delta (IntersectionObserver isn't covered by
          // Timer's Page Visibility handling — that only tracks tab visibility).
          if (isVisible) timer.reset();
        },
        { threshold: 0.05 },
      );
      observer.observe(hero);

      const onVisibility = () => {
        // Timer.connect() already zeroes the delta while hidden and resets on
        // becoming visible; this handler only needs to toggle our render gate.
        isVisible = !document.hidden;
        // No frames run while the tab is hidden, so the gap across it is a pause
        // too — keep it out of the watchdog's count.
        lastFrameAt = 0;
      };
      const onResize = () => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.setSize(canvas!.clientWidth, canvas!.clientHeight, false);
        applyResponsiveCamera();
        // Resizing clears the canvas; with no loop running, nothing would redraw it.
        if (still && models.length) renderStill();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("resize", onResize);

      cleanupListeners = () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("resize", onResize);
        timer.dispose();
        controls.dispose();
        renderer.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        particleTexture.dispose();
      };

      init();
    });

    return () => {
      disposed = true;
      cancelStart();
      cancelAnimationFrame(rafId);
      cleanupListeners();
    };
  }, []);

  // The glow behind the car, in the brand orange: centred on the car's half from 1024 px, under the copy below.
  const glow =
    "bg-[radial-gradient(80%_42%_at_56%_78%,color-mix(in_srgb,var(--color-or)_16%,transparent),transparent_72%)] lg:bg-[radial-gradient(46%_64%_at_76%_54%,color-mix(in_srgb,var(--color-or)_17%,transparent),transparent_72%)]";

  return (
    <section ref={heroRef} className={`relative isolate overflow-hidden border-b border-hair ${glow}`}>
      {/* The copy. It overlays the scene from 1024 px, so only its own column takes the pointer: a drag on the rest
          rotates the car. */}
      <div className="sa-wrap pointer-events-none relative z-2 flex flex-col pt-7 sm:pt-[clamp(36px,6vw,64px)] lg:min-h-[clamp(620px,52vw,940px)] lg:justify-center lg:pt-[clamp(64px,6vw,120px)] lg:pb-[clamp(120px,9vw,170px)]">
        <div className="pointer-events-auto flex w-full flex-col items-start gap-4 sm:gap-[clamp(20px,1.8vw,32px)] lg:w-[min(50%,820px)]">
          {/* Visible hero slogan — deliberately a <p>, NOT a heading: the page's
              single <h1> is the keyword-bearing sr-only heading in app/page.tsx
              (this used to be a second <h1>, giving the homepage duplicate H1s). */}
          <p className="font-display text-[40px] leading-[0.98] font-bold tracking-[-0.035em] text-balance sm:text-[clamp(44px,4.4vw+12px,108px)]">
            Намираме <em className="sa-em">точните</em> автомобили за <em className="sa-em">точните</em> хора
          </p>

          <p className="sa-lead max-w-[50ch] max-sm:text-base max-sm:leading-[1.55]">
            SelectAuto не е просто каталог. Това е процес, опит и реално съдействие — от подбора и участието в търг до
            логистиката и предаването на ключ.
          </p>

          <div className="mt-1 flex flex-col gap-3 self-stretch sm:mt-2 sm:flex-row sm:flex-wrap sm:self-auto">
            <LinkButton
              href="/vsichki-avtomobili"
              variant="pri"
              size="xl"
              className="max-sm:h-control-lg max-sm:text-[15px]"
            >
              Разгледайте автомобилите
            </LinkButton>
            <Button
              variant="sec"
              size="xl"
              onClick={() => openInquiry()}
              className="max-sm:h-control-lg max-sm:text-[15px]"
            >
              Направете запитване
            </Button>
          </div>
        </div>
      </div>

      {/* The scene: a full-width block under the copy up to 1023 px, behind the whole hero from 1024 px. */}
      <div className="relative aspect-1170/640 sm:mt-[clamp(8px,2vw,24px)] lg:absolute lg:inset-0 lg:z-1 lg:mt-0 lg:aspect-auto">
        <canvas ref={canvasRef} className="absolute inset-0 size-full touch-pan-y" />
      </div>

      {/* The model's name: at the hero's bottom right from 1024 px, over the scene's foot below. */}
      <div className="sa-wrap pointer-events-none relative z-2 -mt-15 flex flex-col items-end pb-[clamp(24px,4vw,40px)] text-right sm:-mt-[clamp(40px,8vw,72px)] lg:absolute lg:inset-x-0 lg:bottom-[clamp(32px,3.2vw,60px)] lg:mt-0 lg:pb-0">
        <span className="mb-2 hidden text-[13px] leading-[1.2] font-bold tracking-[0.04em] text-tx3 lg:block">
          Подбор · Внос · Доставка
        </span>
        <b
          className="font-display text-4xl leading-none font-bold tracking-[-0.01em] transition-opacity duration-300 ease-out motion-reduce:transition-none lg:text-[clamp(36px,3.4vw,64px)]"
          style={{ opacity: infoVisible ? 1 : 0 }}
        >
          {modelName}
        </b>
        <span
          className="mt-1.5 text-[13px] leading-[1.4] font-semibold text-tx2 transition-opacity duration-300 ease-out motion-reduce:transition-none sm:text-sm"
          style={{ opacity: infoVisible ? 1 : 0 }}
        >
          {modelMeta}
        </span>
        {/* Progress dots: decoration, from 1024 px. */}
        <span className="mt-4 hidden gap-2.5 lg:flex" aria-hidden="true">
          {HERO_MODELS.map((m, i) => (
            <i key={m.name} className={`block h-0.75 w-8 rounded-xs ${activeDot === i ? "bg-or" : "bg-hair2"}`} />
          ))}
        </span>
      </div>
    </section>
  );
}
