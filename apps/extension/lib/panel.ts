import type { DetectedCar, LotCheckResponse } from "./types";
import { buildViberText } from "./viber";

/**
 * Render the floating status panel into a shadow-root container (styles isolated
 * from the host auction page). Pure DOM — no innerHTML with dynamic values.
 *
 * States: lookup failed → neutral pill; not in DB → neutral pill; active →
 * green, + persisted phone field + "Копирай Viber текст" + open link; past →
 * amber + result link; unlisted → blue + open link.
 *
 * Font: the web app's Montserrat (registered at document level by assets.ts;
 * referenced here as 'SA Montserrat'). Palette mirrors the app's brand tokens.
 */

export interface PanelOptions {
  res: LotCheckResponse;
  car: DetectedCar;
  logoUrl: string;
  /** Prefilled Viber phone (saved value → server default → ""). */
  initialPhone: string;
  /** Placeholder when the field is empty (server default). */
  placeholderPhone: string;
  /** Persist a changed phone (debounced by the caller's storage write). */
  onPhoneChange: (phone: string) => void;
}

const FONT = `'SA Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;

// Brand tokens ported from the web app's globals.css :root.
const BRAND = "#d86f16";
const BRAND_DARK = "#b95200";
const INK = "#222222";
const MUTED = "#666666";
const LINE = "#e8e8e8";
const SUCCESS = "#1eb960";

const STYLES = `
:host { all: initial; }
* { box-sizing: border-box; }
.sa-wrap {
  position: fixed; top: 92px; right: 20px; z-index: 2147483647;
  width: 300px; font-family: ${FONT};
  color: ${INK}; background: #fff;
  border-radius: 16px; border: 1px solid rgba(0,0,0,0.06);
  box-shadow: 0 18px 44px rgba(17,17,17,0.20), 0 3px 10px rgba(17,17,17,0.08);
  overflow: hidden; animation: sa-in .18s ease-out;
}
@keyframes sa-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
.sa-accent { height: 4px; background: var(--accent, ${MUTED}); }
.sa-head { display: flex; align-items: center; gap: 9px; padding: 13px 14px 9px; }
.sa-logo { width: 26px; height: 26px; border-radius: 7px; object-fit: cover; flex: none; box-shadow: 0 1px 3px rgba(0,0,0,0.18); }
.sa-status { font-weight: 700; font-size: 14px; line-height: 1.25; letter-spacing: -0.01em; flex: 1; color: var(--accent, ${INK}); }
.sa-close {
  appearance: none; border: none; background: transparent; cursor: pointer; font-family: ${FONT};
  font-size: 20px; line-height: 1; color: #b0b0b0; padding: 2px 5px; border-radius: 7px; flex: none;
}
.sa-close:hover { background: #f2f2f2; color: ${MUTED}; }
.sa-body { display: flex; gap: 11px; padding: 2px 14px 12px; }
.sa-thumb { width: 78px; height: 58px; border-radius: 9px; object-fit: cover; background: #f3f3f3; flex: none; border: 1px solid ${LINE}; }
.sa-meta { min-width: 0; padding-top: 1px; }
.sa-title { font-size: 13px; font-weight: 600; line-height: 1.3; margin: 0 0 4px; color: ${INK}; overflow-wrap: anywhere; }
.sa-sub { font-size: 12.5px; font-weight: 600; color: ${BRAND_DARK}; margin: 0; }
.sa-field { padding: 0 14px 12px; }
.sa-label { display: block; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: ${MUTED}; margin: 0 0 5px; }
.sa-input {
  width: 100%; font-family: ${FONT}; font-size: 14px; font-weight: 600; color: ${INK};
  padding: 9px 11px; border: 1.5px solid ${LINE}; border-radius: 10px; background: #fafafa; outline: none;
}
.sa-input::placeholder { color: #b3b3b3; font-weight: 500; }
.sa-input:focus { border-color: ${BRAND}; background: #fff; box-shadow: 0 0 0 3px rgba(216,111,22,0.12); }
.sa-actions { display: flex; flex-direction: column; gap: 8px; padding: 0 14px 14px; }
.sa-btn {
  appearance: none; cursor: pointer; text-decoration: none; text-align: center; font-family: ${FONT};
  border: none; border-radius: 11px; padding: 11px 12px; font-size: 13.5px; font-weight: 700; letter-spacing: -0.01em;
  transition: filter .12s, background .12s;
}
.sa-btn-primary { background: ${BRAND}; color: #fff; box-shadow: 0 4px 12px rgba(216,111,22,0.28); }
.sa-btn-primary:hover { filter: brightness(1.04); }
.sa-btn-primary:active { filter: brightness(0.95); }
.sa-btn-ghost { background: #f4f4f4; color: ${INK}; }
.sa-btn-ghost:hover { background: #ececec; }
`;

type Variant = "active" | "past" | "unlisted" | "absent" | "error";

const VARIANT: Record<Variant, { accent: string; label: string }> = {
  active: { accent: SUCCESS, label: "✔ Вече е в базата" },
  past: { accent: BRAND, label: "🏁 Продаден" },
  unlisted: { accent: "#2563eb", label: "ℹ️ В базата (не е листната)" },
  absent: { accent: MUTED, label: "🔍 Не е в базата" },
  error: { accent: MUTED, label: "⚠️ Няма връзка със SelectAuto" },
};

function variantOf(res: LotCheckResponse): Variant {
  if (!res.ok) return "error";
  if (!res.exists) return "absent";
  return res.status ?? "unlisted";
}

export function renderPanel(container: HTMLElement, opts: PanelOptions): void {
  const { res, car, logoUrl, initialPhone, placeholderPhone, onPhoneChange } = opts;
  const variant = variantOf(res);
  const meta = VARIANT[variant];

  const style = document.createElement("style");
  style.textContent = STYLES;
  container.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "sa-wrap";
  wrap.style.setProperty("--accent", meta.accent);
  wrap.dataset.saLot = `${car.source}:${car.externalId}`;

  const accent = document.createElement("div");
  accent.className = "sa-accent";
  wrap.appendChild(accent);

  // Header: logo + status + close
  const head = document.createElement("div");
  head.className = "sa-head";
  const logo = document.createElement("img");
  logo.className = "sa-logo";
  logo.src = logoUrl;
  logo.alt = "SelectAuto";
  const status = document.createElement("div");
  status.className = "sa-status";
  status.textContent = meta.label;
  const close = document.createElement("button");
  close.className = "sa-close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Затвори");
  close.addEventListener("click", () => wrap.remove());
  head.append(logo, status, close);
  wrap.appendChild(head);

  // Body: thumbnail + title/sub
  if (res.exists && (res.title || res.image)) {
    const body = document.createElement("div");
    body.className = "sa-body";
    if (res.image) {
      const img = document.createElement("img");
      img.className = "sa-thumb";
      img.src = res.image;
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      // Mirror the site's thumbnail→raw fallback: if the baked CloudFront thumbnail
      // fails to load (e.g. a not-yet-propagated object during a CDN migration), swap
      // once to the raw upstream image instead of showing a broken thumbnail.
      if (res.imageFallback && res.imageFallback !== res.image) {
        img.addEventListener("error", () => { img.src = res.imageFallback!; }, { once: true });
      }
      body.appendChild(img);
    }
    const metaBox = document.createElement("div");
    metaBox.className = "sa-meta";
    if (res.title) {
      const t = document.createElement("p");
      t.className = "sa-title";
      t.textContent = res.title;
      metaBox.appendChild(t);
    }
    const sub = [res.price || null, res.mileage || null].filter(Boolean).join("  ·  ");
    if (sub) {
      const s = document.createElement("p");
      s.className = "sa-sub";
      s.textContent = sub;
      metaBox.appendChild(s);
    }
    body.appendChild(metaBox);
    wrap.appendChild(body);
  }

  // Phone field (only where a Viber message is offered — active listings).
  let phoneInput: HTMLInputElement | null = null;
  if (variant === "active") {
    const field = document.createElement("div");
    field.className = "sa-field";
    const label = document.createElement("label");
    label.className = "sa-label";
    label.textContent = "Телефон за Viber";
    phoneInput = document.createElement("input");
    phoneInput.className = "sa-input";
    phoneInput.type = "tel";
    phoneInput.value = initialPhone;
    phoneInput.placeholder = placeholderPhone;
    phoneInput.autocomplete = "off";
    phoneInput.spellcheck = false;
    label.htmlFor = "sa-phone";
    phoneInput.id = "sa-phone";
    let t: ReturnType<typeof setTimeout> | undefined;
    const persist = () => onPhoneChange(phoneInput!.value.trim());
    phoneInput.addEventListener("input", () => {
      if (t) clearTimeout(t);
      t = setTimeout(persist, 400);
    });
    phoneInput.addEventListener("change", persist);
    field.append(label, phoneInput);
    wrap.appendChild(field);
  }

  // Actions
  const actions = document.createElement("div");
  actions.className = "sa-actions";

  if (variant === "active") {
    const copy = document.createElement("button");
    copy.className = "sa-btn sa-btn-primary";
    copy.type = "button";
    copy.textContent = "📋 Копирай Viber текст";
    copy.addEventListener("click", async () => {
      const phone = phoneInput?.value.trim() || placeholderPhone;
      try {
        await navigator.clipboard.writeText(buildViberText(res, phone));
        copy.textContent = "✔ Копирано";
      } catch {
        copy.textContent = "❌ Грешка";
      }
      window.setTimeout(() => {
        copy.textContent = "📋 Копирай Viber текст";
      }, 1500);
    });
    actions.appendChild(copy);
  }

  if (res.url) {
    const link = document.createElement("a");
    link.className = "sa-btn sa-btn-ghost";
    link.href = res.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = variant === "past" ? "Виж резултата" : "Отвори обявата";
    actions.appendChild(link);
  }

  if (actions.childElementCount > 0) wrap.appendChild(actions);

  container.appendChild(wrap);
}
