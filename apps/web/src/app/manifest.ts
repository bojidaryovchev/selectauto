import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/constants";

/**
 * Web app manifest (served at `/manifest.webmanifest`, auto-linked from <head>).
 * Gives Android "add to home screen" a proper name/icon/theme and completes the
 * PWA-baseline metadata the site was missing. Icons reference the app-dir
 * `icon.png` (512) + `apple-icon.png` (180), served at stable root paths.
 * `theme_color` matches the dark header/nav chrome (`bg-shell`, #0f1014).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — внос на автомобили от Корея, САЩ и Канада`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: "bg",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f1014",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
