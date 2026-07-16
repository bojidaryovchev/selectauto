import type { DetectedCar, LotCheckResponse } from "./types";
import { buildViberText } from "./viber";

/**
 * Render the floating status panel into a shadow-root container (styles are
 * isolated from the host auction page). Pure DOM — no innerHTML with dynamic
 * values, so untrusted-looking strings can't inject markup.
 *
 * States:
 *   - lookup failed (!ok)      → neutral "no connection" pill
 *   - not in DB (exists false) → neutral "не е в базата" pill
 *   - active                   → green, + "Копирай Viber текст" + open link
 *   - past (sold)              → amber, + "Виж резултата" link
 *   - unlisted                 → blue, + open link
 */

const STYLES = `
:host { all: initial; }
.sa-wrap {
  position: fixed; top: 96px; right: 20px; z-index: 2147483647;
  width: 280px; box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  background: #ffffff; color: #1a1a1a;
  border-radius: 14px; border: 1px solid rgba(0,0,0,0.08);
  border-left: 5px solid var(--accent, #6b7280);
  box-shadow: 0 12px 32px rgba(0,0,0,0.22);
  overflow: hidden;
}
.sa-head { display: flex; align-items: center; gap: 8px; padding: 12px 12px 8px; }
.sa-status { font-weight: 700; font-size: 14px; line-height: 1.2; flex: 1; }
.sa-close {
  appearance: none; border: none; background: transparent; cursor: pointer;
  font-size: 18px; line-height: 1; color: #9ca3af; padding: 2px 4px; border-radius: 6px;
}
.sa-close:hover { background: rgba(0,0,0,0.06); color: #4b5563; }
.sa-body { display: flex; gap: 10px; padding: 0 12px 10px; }
.sa-thumb { width: 72px; height: 54px; border-radius: 8px; object-fit: cover; background: #f3f4f6; flex: none; }
.sa-meta { min-width: 0; }
.sa-title { font-size: 13px; font-weight: 600; margin: 0 0 3px; overflow-wrap: anywhere; }
.sa-sub { font-size: 12px; color: #6b7280; margin: 0; }
.sa-actions { display: flex; flex-direction: column; gap: 6px; padding: 0 12px 12px; }
.sa-btn {
  appearance: none; cursor: pointer; text-decoration: none; text-align: center;
  border: none; border-radius: 9px; padding: 9px 12px; font-size: 13px; font-weight: 600;
}
.sa-btn-primary { background: var(--accent, #6b7280); color: #fff; }
.sa-btn-primary:hover { filter: brightness(0.95); }
.sa-btn-ghost { background: #f3f4f6; color: #374151; }
.sa-btn-ghost:hover { background: #e5e7eb; }
`;

type Variant = "active" | "past" | "unlisted" | "absent" | "error";

const VARIANT: Record<Variant, { accent: string; label: string }> = {
  active: { accent: "#16a34a", label: "✔ Вече е в базата" },
  past: { accent: "#d97706", label: "🏁 Продаден" },
  unlisted: { accent: "#2563eb", label: "ℹ️ В базата (не е листната)" },
  absent: { accent: "#6b7280", label: "🔍 Не е в базата" },
  error: { accent: "#6b7280", label: "⚠️ Няма връзка със SelectAuto" },
};

function variantOf(res: LotCheckResponse): Variant {
  if (!res.ok) return "error";
  if (!res.exists) return "absent";
  return res.status ?? "unlisted";
}

export function renderPanel(container: HTMLElement, res: LotCheckResponse, car: DetectedCar): void {
  const variant = variantOf(res);
  const meta = VARIANT[variant];

  const style = document.createElement("style");
  style.textContent = STYLES;
  container.appendChild(style);

  const wrap = document.createElement("div");
  wrap.className = "sa-wrap";
  wrap.style.setProperty("--accent", meta.accent);

  // Header: status + close
  const head = document.createElement("div");
  head.className = "sa-head";
  const status = document.createElement("div");
  status.className = "sa-status";
  status.textContent = meta.label;
  const close = document.createElement("button");
  close.className = "sa-close";
  close.type = "button";
  close.textContent = "×";
  close.setAttribute("aria-label", "Затвори");
  close.addEventListener("click", () => wrap.remove());
  head.append(status, close);
  wrap.appendChild(head);

  // Body: thumbnail + title/sub (only when we have listing details)
  if (res.exists && (res.title || res.image)) {
    const body = document.createElement("div");
    body.className = "sa-body";

    if (res.image) {
      const img = document.createElement("img");
      img.className = "sa-thumb";
      img.src = res.image;
      img.alt = "";
      img.referrerPolicy = "no-referrer";
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
    const subParts = [res.price || null, res.mileage || null].filter(Boolean).join(" · ");
    if (subParts) {
      const s = document.createElement("p");
      s.className = "sa-sub";
      s.textContent = subParts;
      metaBox.appendChild(s);
    }
    body.appendChild(metaBox);
    wrap.appendChild(body);
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
      try {
        await navigator.clipboard.writeText(buildViberText(res));
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

  // Mark which lot this panel is for (useful for debugging on SPA navigations).
  wrap.dataset.saLot = `${car.source}:${car.externalId}`;

  container.appendChild(wrap);
}
