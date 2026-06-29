"use client";

import { useEffect, useRef, useState } from "react";
// Type-only import: erased at build time, so `three` never enters the server
// bundle, while THREE.* type annotations below still resolve.
import type * as THREE from "three";
import { Button, LinkButton } from "@/components/common";
import { HERO_MODELS } from "@/data/home";
import { useInquiry } from "@/contexts/inquiry-context";

/**
 * 3D particle hero — a faithful React port of the site's
 * `selectauto-particle-hero.php` Three.js scene. Each GLB car model is sampled
 * into a point cloud; particles morph from one model to the next on a loop.
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

    (async () => {
      const THREE = await import("three");
      const { GLTFLoader } = await import(
        "three/examples/jsm/loaders/GLTFLoader.js"
      );
      const { OrbitControls } = await import(
        "three/examples/jsm/controls/OrbitControls.js"
      );
      if (disposed) return;

      const isMobile = () => window.innerWidth <= 768;
      const isTablet = () => window.innerWidth > 768 && window.innerWidth <= 1100;

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

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(
        isMobile() ? 44 : 36,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        100,
      );

      function applyResponsiveCamera() {
        const width = canvas!.clientWidth || hero!.clientWidth;
        const height = canvas!.clientHeight || hero!.clientHeight;
        camera.aspect = width / height;
        if (isMobile()) {
          camera.position.set(4.2, 1.8, 8.8);
          camera.setViewOffset(width, height, -width * 0.02, 0, width, height);
        } else if (isTablet()) {
          camera.position.set(4.4, 2.1, 7.4);
          camera.setViewOffset(width, height, -width * 0.1, 0, width, height);
        } else {
          camera.position.set(4.6, 2.2, 7.2);
          camera.setViewOffset(width, height, -width * 0.2, 0, width, height);
        }
        camera.updateProjectionMatrix();
      }
      applyResponsiveCamera();

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false;
      controls.enableRotate = true;
      controls.autoRotate = true;
      controls.autoRotateSpeed = isMobile() ? 0.35 : 0.65;
      controls.target.set(4.25, 0.25, 0);

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

      function fitModel(model: THREE.Object3D, targetSize = isMobile() ? 4.9 : 4.4) {
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        const center = new THREE.Vector3();
        box.getSize(size);
        box.getCenter(center);
        const maxSize = Math.max(size.x, size.y, size.z);
        const scale = targetSize / maxSize;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.rotation.y = Math.PI / 2;
        model.updateMatrixWorld(true);
        const newBox = new THREE.Box3().setFromObject(model);
        model.position.y -= newBox.min.y;
        model.updateMatrixWorld(true);
      }

      function collectTriangles(model: THREE.Object3D) {
        const triangles: { a: THREE.Vector3; b: THREE.Vector3; c: THREE.Vector3; area: number }[] = [];
        model.updateMatrixWorld(true);
        model.traverse((child: THREE.Object3D) => {
          const mesh = child as THREE.Mesh;
          if (!mesh.isMesh || !mesh.geometry?.attributes.position) return;
          const pos = mesh.geometry.attributes.position;
          const index = mesh.geometry.index;
          const matrix = mesh.matrixWorld;
          const getVertex = (i: number) =>
            new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)).applyMatrix4(
              matrix,
            );
          if (index) {
            for (let i = 0; i < index.count; i += 3) {
              const a = getVertex(index.getX(i));
              const b = getVertex(index.getX(i + 1));
              const c = getVertex(index.getX(i + 2));
              const area = new THREE.Triangle(a, b, c).getArea();
              if (area > 0.00001) triangles.push({ a, b, c, area });
            }
          } else {
            for (let i = 0; i < pos.count; i += 3) {
              const a = getVertex(i);
              const b = getVertex(i + 1);
              const c = getVertex(i + 2);
              const area = new THREE.Triangle(a, b, c).getArea();
              if (area > 0.00001) triangles.push({ a, b, c, area });
            }
          }
        });
        return triangles;
      }

      function sampleSurfacePoints(model: THREE.Object3D) {
        const triangles = collectTriangles(model);
        const cumulative: number[] = [];
        let totalArea = 0;
        for (const tri of triangles) {
          totalArea += tri.area;
          cumulative.push(totalArea);
        }
        const pts = new Float32Array(PARTICLE_COUNT * 3);
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const r = Math.random() * totalArea;
          let low = 0;
          let high = cumulative.length - 1;
          while (low < high) {
            const mid = Math.floor((low + high) / 2);
            if (cumulative[mid] < r) low = mid + 1;
            else high = mid;
          }
          const tri = triangles[low];
          let u = Math.random();
          let v = Math.random();
          if (u + v > 1) {
            u = 1 - u;
            v = 1 - v;
          }
          const point = new THREE.Vector3()
            .copy(tri.a)
            .addScaledVector(new THREE.Vector3().subVectors(tri.b, tri.a), u)
            .addScaledVector(new THREE.Vector3().subVectors(tri.c, tri.a), v);
          const ix = i * 3;
          pts[ix] = point.x;
          pts[ix + 1] = point.y;
          pts[ix + 2] = point.z;
        }
        return pts;
      }

      function loadModelPoints(src: string, retries = 2): Promise<Float32Array> {
        const loader = new GLTFLoader();
        return new Promise((resolve, reject) => {
          const attempt = (attemptsLeft: number) => {
            loader.load(
              src,
              (gltf) => {
                fitModel(gltf.scene);
                resolve(sampleSurfacePoints(gltf.scene));
              },
              undefined,
              (err) => {
                if (attemptsLeft > 0) {
                  setTimeout(() => attempt(attemptsLeft - 1), 800);
                } else {
                  reject(err);
                }
              },
            );
          };
          attempt(retries);
        });
      }

      function showModelInfo(i: number) {
        setModelName(HERO_MODELS[i].name);
        setModelMeta(HERO_MODELS[i].meta);
        setActiveDot(i);
        setInfoVisible(true);
      }

      const easeInOut = (t: number) =>
        t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      const clock = new THREE.Clock();

      function animate() {
        rafId = requestAnimationFrame(animate);
        if (!isVisible || !models.length) return;

        const dt = Math.min(clock.getDelta(), 0.05);
        const t = clock.elapsedTime;
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
          models[0] = await loadModelPoints(HERO_MODELS[0].src);
          if (disposed) return;
          positions.set(models[0]);
          fromPositions.set(models[0]);
          particleGeometry.attributes.position.needsUpdate = true;
          showModelInfo(0);
          animate();
          setTimeout(async () => {
            try {
              models[1] = await loadModelPoints(HERO_MODELS[1].src);
              models[2] = await loadModelPoints(HERO_MODELS[2].src);
              if (!disposed) toPositions.set(models[1]);
            } catch {
              /* lazy models failed — hero keeps showing the first model */
            }
          }, 1200);
        } catch {
          setModelName("3D ERROR");
          setModelMeta("Моделът не успя да се зареди");
        }
      }

      const observer = new IntersectionObserver(
        (entries) => {
          isVisible = entries[0]?.isIntersecting ?? true;
          if (isVisible) clock.getDelta();
        },
        { threshold: 0.05 },
      );
      observer.observe(hero);

      const onVisibility = () => {
        isVisible = !document.hidden;
        if (isVisible) clock.getDelta();
      };
      const onResize = () => {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        renderer.setSize(canvas!.clientWidth, canvas!.clientHeight, false);
        applyResponsiveCamera();
      };
      document.addEventListener("visibilitychange", onVisibility);
      window.addEventListener("resize", onResize);

      cleanupListeners = () => {
        observer.disconnect();
        document.removeEventListener("visibilitychange", onVisibility);
        window.removeEventListener("resize", onResize);
        controls.dispose();
        renderer.dispose();
        particleGeometry.dispose();
        particleMaterial.dispose();
        particleTexture.dispose();
      };

      init();
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      cleanupListeners();
    };
  }, []);

  return (
    <section
      ref={heroRef}
      className="relative isolate min-h-screen overflow-hidden bg-[radial-gradient(ellipse_at_70%_50%,#2a1a10_0%,#100a06_55%,#050302_100%)] text-white max-[900px]:min-h-[100svh] max-[900px]:bg-[radial-gradient(ellipse_at_60%_80%,#3a1f0a_0%,#1a0d05_50%,#080403_100%)]"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-[1] h-full w-full [touch-action:pan-y] max-[900px]:top-[48%] max-[900px]:h-[52%]"
      />

      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 z-[2] bg-[linear-gradient(90deg,rgba(0,0,0,0.62)_0%,rgba(0,0,0,0.28)_42%,rgba(0,0,0,0.05)_100%),radial-gradient(ellipse_at_center,transparent_30%,rgba(0,0,0,0.58)_100%)]" />

      {/* Copy — aligned to the shared 1280px page column (matches the header/nav
          and every Container section) instead of a fixed viewport inset. */}
      <div className="pointer-events-none relative z-[5] mx-auto flex min-h-screen w-[min(100%-28px,1280px)] flex-col items-start justify-center pb-[90px] pt-[clamp(110px,12vh,150px)] [&>*]:pointer-events-auto max-[900px]:min-h-fit max-[900px]:justify-start max-[900px]:pb-0 max-[900px]:pt-[52px]">
        <div
          className="mb-6 inline-flex w-fit items-center gap-2.5 rounded-full border border-[#e86c20]/50 bg-[#e86c20]/[0.12] px-5 py-2.5 text-xs font-extrabold tracking-[2px] text-[#ffb37a] backdrop-blur-md max-[900px]:mb-[18px] max-[900px]:px-3.5 max-[900px]:py-2 max-[900px]:text-[10px] max-[900px]:tracking-[1.4px]"
        >
          <span
            className="h-2 w-2 rounded-full bg-brand-glow"
            style={{ animation: "sa-pulse 2s infinite" }}
          />
          SELECTAUTO · AUCTION · ENCAR · IMPORT
        </div>

        <h1 className="mb-6 max-w-[680px] text-[clamp(46px,6vw,88px)] font-black leading-[0.95] tracking-[-2px] text-white max-[900px]:mb-3.5 max-[900px]:max-w-full max-[900px]:text-[clamp(34px,11vw,46px)] max-[900px]:leading-none max-[900px]:tracking-[-1.4px]">
          Намираме{" "}
          <span className="bg-gradient-to-br from-brand-glow to-[#ffb37a] bg-clip-text text-transparent">
            точните
          </span>{" "}
          автомобили за{" "}
          <span className="bg-gradient-to-br from-brand-glow to-[#ffb37a] bg-clip-text text-transparent">
            точните
          </span>{" "}
          хора
        </h1>

        <p className="mb-9 max-w-[520px] text-lg leading-relaxed text-white/70 max-[900px]:mb-[22px] max-[900px]:max-w-full max-[900px]:text-sm max-[900px]:text-white/85">
          SelectAuto не е просто каталог. Това е процес, опит и реално
          съдействие — от подбора и участието в търг до логистиката и предаването
          на ключ.
        </p>

        <div className="flex flex-wrap items-center gap-4 max-[900px]:w-full max-[900px]:flex-col max-[900px]:gap-3">
          <LinkButton
            href="/vsichki-avtomobili/"
            rippleTheme="light"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-gradient-to-br from-brand-glow to-[#e86c20] px-[30px] text-[15px] font-extrabold text-white shadow-[0_12px_40px_rgba(232,108,32,0.4)] transition-transform duration-200 hover:-translate-y-[3px] max-[900px]:w-full"
          >
            Разгледай автомобилите
          </LinkButton>
          <Button
            onClick={openInquiry}
            rippleTheme="light"
            className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-white/[0.18] bg-white/[0.08] px-[30px] text-[15px] font-extrabold text-white backdrop-blur-md transition-colors hover:bg-white/[0.14] max-[900px]:w-full"
          >
            Направете запитване
          </Button>
        </div>
      </div>

      {/* Model label — pinned to the right edge of the shared page column. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[58px] z-[5] max-[900px]:bottom-5 max-[900px]:z-[8]">
        <div className="mx-auto w-[min(100%-28px,1280px)] text-right">
          <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[3px] text-white/40 max-[900px]:hidden">
            Подбор · Внос · Доставка
          </div>
          <div
            className="bg-gradient-to-br from-brand-glow to-[#ffb37a] bg-clip-text text-[56px] font-black leading-none tracking-[-1px] text-transparent transition-opacity duration-300 max-[900px]:text-[36px] max-[900px]:tracking-[-0.5px]"
            style={{ opacity: infoVisible ? 1 : 0 }}
          >
            {modelName}
          </div>
          <div
            className="mt-3 text-[13px] font-semibold text-white/50 transition-opacity duration-300 max-[900px]:mt-1 max-[900px]:text-[11px] max-[900px]:text-white/65"
            style={{ opacity: infoVisible ? 1 : 0 }}
          >
            {modelMeta}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="pointer-events-none absolute bottom-[30px] left-1/2 z-[5] flex -translate-x-1/2 gap-3 max-[900px]:hidden">
        {HERO_MODELS.map((_, i) => (
          <div
            key={i}
            className={`h-[3px] w-8 rounded-sm transition-colors duration-300 ${
              activeDot === i
                ? "bg-gradient-to-r from-brand-glow to-[#ffb37a]"
                : "bg-white/15"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
