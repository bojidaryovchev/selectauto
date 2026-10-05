/**
 * Names of the CPU rasterisers a browser falls back to when it has no usable GPU
 * (headless servers, VMs, remote desktops, blocklisted drivers): Chrome's
 * SwiftShader, Mesa's llvmpipe/softpipe, Windows' "Microsoft Basic Render Driver",
 * Apple's "Software Renderer".
 */
const SOFTWARE_RENDERER = /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * True when this WebGL context is drawn by the CPU rather than a GPU.
 *
 * The particle scenes need to know: a scene that costs a GPU a millisecond costs a
 * software rasteriser a whole frame or more of MAIN-thread time, so a continuous
 * animation there is one long task after another and the page never becomes
 * responsive.
 */
export function isSoftwareRenderer(gl: WebGLRenderingContext | WebGL2RenderingContext): boolean {
  // Chrome and Safari mask RENDERER ("WebKit WebGL") and reveal the real name only
  // through the extension; Firefox reports it on RENDERER and warns if the
  // extension is touched — so the extension is the fallback, not the first stop.
  let name = String(gl.getParameter(gl.RENDERER));
  if (/webkit webgl/i.test(name)) {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (info) name = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL));
  }
  return SOFTWARE_RENDERER.test(name);
}
