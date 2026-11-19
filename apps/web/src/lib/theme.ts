/**
 * Light and night themes (owner, 19.11.2026). Night is the default and the brand („Нощно шосе"); light is the visitor's
 * choice, remembered in this browser. The tokens for both are in styles/tokens.css; the switch is
 * components/common/theme-switch.tsx.
 *
 * The theme lives on <html> as `data-theme` ("light" or "dark"; none = night). `THEME_BOOTSTRAP` runs in <head> before
 * the first paint, so a saved light theme never flashes night first; the pages themselves are static and identical for
 * everyone, so nothing about the theme can come from the server.
 */
export type Theme = "dark" | "light";

/** The localStorage key of the visitor's choice. */
export const THEME_KEY = "sa-theme";

/** The browser chrome colour (`<meta name="theme-color">`) per theme: each theme's page ground. */
export const THEME_COLOR: Record<Theme, string> = { dark: "#0c0d10", light: "#f3f4f6" };

/** Inline, before the first paint: the saved theme onto <html>, and the matching browser chrome colour. */
export const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content",t==="light"?"${THEME_COLOR.light}":"${THEME_COLOR.dark}")}}catch(e){}})();`;

/** The theme on the page now. */
export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

/** Puts a theme on the page and remembers it. */
export function setTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private mode or blocked storage: the theme still applies to this page.
  }
}
