/**
 * The slice of three the particle scenes use, re-exported by name. Load it with
 * `await import("@/lib/three")` — never `import("three")`.
 *
 * A dynamic import of the package itself asks for its whole namespace, so the
 * bundler has to keep all of it; importing THIS module gives it a static list of
 * names to keep. That list only pays off together with the `three` alias in
 * next.config.ts (see the note there): the two together cut three from ~750KB to
 * ~510KB. A scene that needs another class adds it here.
 */
export {
  AdditiveBlending,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  DirectionalLight,
  Group,
  LineBasicMaterial,
  LineSegments,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  Timer,
  Vector3,
  WebGLRenderer,
} from "three";
