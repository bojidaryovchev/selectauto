import Link from "next/link";

/**
 * The line under a form's send button that points to the privacy policy: GDPR art. 13 wants the information given
 * when the data is collected (owner decision 33, PR8). Used by the inquiry, Carfax, calculator-offer and registration
 * forms. The policy opens in a new tab, so a half-filled form (or the inquiry dialog) is not lost.
 *
 * `className` adds to the kit's `.sa-hint`; `bare` renders only the sentence, for a form that already has a note line
 * to append it to (the calculator's consent line).
 */
export function PrivacyNote({ className = "", bare = false }: { className?: string; bare?: boolean }) {
  const sentence = (
    <>
      Данните Ви се обработват съгласно{" "}
      <Link href="/politika-za-poveritelnost" target="_blank" rel="noopener" className="underline underline-offset-3">
        Политиката за поверителност
        <span className="sr-only"> (отваря се в нов раздел)</span>
      </Link>
      .
    </>
  );
  return bare ? sentence : <p className={`sa-hint ${className}`.trim()}>{sentence}</p>;
}
