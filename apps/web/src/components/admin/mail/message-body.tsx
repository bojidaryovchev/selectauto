/**
 * Renders one message's body.
 *
 * ── SECURITY: this renders content a STRANGER controls, inside /admin ────────
 * `/admin` is the highest-privilege surface in the app — it mints contracts,
 * changes user roles, generates payment documents and de-lists cars. The app
 * deliberately sets NO Content-Security-Policy (next.config.ts explains why) and
 * ships no HTML sanitizer, so injecting a stranger's HTML here would be a stored
 * XSS straight into that surface.
 *
 * So: the body is rendered as PLAIN TEXT, always. `text_body` when the sender
 * provided one; otherwise the HTML part is stripped to text well enough to read.
 * There is intentionally no `dangerouslySetInnerHTML` anywhere in this file, and
 * none should be added — if a rich view is ever wanted it must be a sandboxed
 * iframe with its own CSP, not inline markup.
 */

/**
 * Crude but SAFE html→text: drop script/style wholesale, turn block edges into
 * newlines, strip the remaining tags, then decode the handful of entities that
 * matter. Output is inserted as a TEXT node, so anything this misses is
 * displayed, never executed.
 */
function htmlToText(html: string): string {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function MessageBody({
  textBody,
  htmlBody,
  fetched,
}: {
  textBody: string | null;
  htmlBody: string | null;
  fetched: boolean;
}) {
  if (!fetched) {
    return (
      <p className="text-sm italic text-muted">
        Съдържанието още не е изтеглено. Презаредете след малко.
      </p>
    );
  }

  const text = textBody?.trim() || (htmlBody ? htmlToText(htmlBody) : "");

  if (!text) {
    return <p className="text-sm italic text-muted">(празно съобщение)</p>;
  }

  // `whitespace-pre-wrap` preserves the sender's line breaks; the value is a
  // text node, so no markup in it can execute.
  return <div className="wrap-break-word whitespace-pre-wrap text-sm text-ink">{text}</div>;
}
