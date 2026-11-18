# Sign-in and account pages · `/sign-in`, `/registratsiya`, `/zabravena-parola`, `/nova-parola`, `/verify`, `/greshka-pri-vhod`

- Boards: `ac-signin`, `ac-register`, `ac-forgot`, `ac-reset`, `ac-verify`, `ac-autherr` (d, t, p) and their state
  sheets `ac-signin-st`, `ac-register-st`, `ac-forgot-st`, `ac-reset-st`, `ac-verify-st`, `ac-autherr-st`. The design
  run's notes: `D:/design/selectauto/notes/ac.md` §1–4 and the follow-up of 26.10.2026 (the lead's decisions).
- Code on main, read in full: the six `page.tsx`, `components/auth/*` (but `user-menu.tsx`, done with the shell),
  `mutations/auth/*`, `schemas/auth.schema.ts`, `hooks/use-last-auth-method.ts`.
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026, every page at 1440, 820, 390 and 320 (the
  card 472 px, full width on a phone; no sideways scroll). Server Actions answered from mocks in the real response
  envelope, captured once from `/verify` with a token that can't exist (one SELECT, no row, nothing written); every
  other non-GET request aborted. Walked: the field messages, marked fields and the eye buttons; „Вход" busy, then
  „Грешен имейл или парола." in the red alert; both „Последно използвано" badges and rings; „Продължете с Google"
  waiting; registration's four messages, „Името е твърде дълго.", the mismatch, „Вече съществува профил…" and the
  done state; forgot's done state; the new password's mismatch, expired link and success; verify's check and
  confirmation, and the real error path; the sign-in error page's seven `?error=` cases; the loading skeletons.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Every page: `<title>` („Вход \| SelectAuto", „Регистрация \| SelectAuto", „Забравена парола \| SelectAuto", „Нова парола \| SelectAuto", „Потвърждение на имейл \| SelectAuto", „Грешка при вход \| SelectAuto") and `noindex, nofollow` (each page.tsx:7-10) | — | — |
| 2 | A white card centred on the page; the title in capitals through CSS; the subtitle (auth-card.tsx:4-19) | `ac-card` on the night ground, the title in the display face | Sentence case (decision 10) |
| 3 | Sign-in and registration read `redirectTo`, kept only when it is a same-site path (sign-in/page.tsx:37-46; registratsiya/page.tsx:33-37); a blank box while the form loads | the form's loading state: a skeleton (`ac-signin-st` 8) | Kept; the skeleton is named „Зареждане" (decision 12) |
| 4 | „Продължи с Google" → the Google sign-in action with `redirectTo`, disabled while it runs (google-button.tsx:33-44) | `sa-btn--sec` with the Google mark; a spinner while it redirects (`-st` 7) | Formal „Продължете с Google" (decision 1) |
| 5 | „Последно използвано" on the method this browser last signed in with, a ring on its control; read from `localStorage` after hydration (sign-in-form.tsx:74-82, 132-147; last-used-badge.tsx; hooks/use-last-auth-method.ts) | the badge on the button's edge; the Google button's ring, an offset ring on the chamfered „Вход" (`-st` 2–3) | As drawn; storage and the writer unchanged |
| 6 | „или" in capitals through CSS (sign-in-form.tsx:84-88; sign-up-form.tsx:58-62) | `ac-or` | Sentence case |
| 7 | Sign-in fields Имейл (example@email.com), Парола (••••••••) with „Забравена парола?" → /zabravena-parola beside the label; the password a plain field (sign-in-form.tsx:91-128) | the kit's fields; the password with an eye button | The eye button as on „Нова парола" (notes ac §4 Q2, the lead's decision): „Покажете паролата" / „Скрийте паролата" |
| 8 | Field messages under each field: „Невалиден имейл адрес.", „Моля въведете парола.", and the sign-up and reset ones (schemas/auth.schema.ts) | `sa-err` with an icon, the field marked (`-st` 4) | As drawn |
| 9 | Server messages in a red box above the button: „Невалиден имейл или парола.", „Имейлът ви не е потвърден. Проверете пощата си за линк за активиране.", „Този имейл е регистриран чрез Google. Влезте с бутона „Продължи с Google“.", „Грешен имейл или парола.", „Възникна грешка при входа. Моля опитайте отново." (credentials-sign-in.mutation.ts:27-59) | `sa-alert--neg` (`-st` 5, 10) | As drawn; the Google message names the button as it now reads („Продължете с Google") |
| 10 | „Вход" submits through a Server Action; disabled while sending; on success the session is refetched, then `redirectTo` (sign-in-form.tsx:57-71, 132-147) | the primary button with a spinner (`-st` 6) | Kept |
| 11 | „Нямате профил? Регистрация" → /registratsiya (sign-in-form.tsx:150-155) | `ac-alt` | — |
| 12 | Registration: Google, „или", Име (Вашето име), Имейл, Парола (Поне 8 символа), Потвърдете паролата (Повторете паролата), plain password fields, „Регистрация", „Вече имате профил? Вход" (sign-up-form.tsx:54-145) | the same, both passwords with eye buttons | The eye buttons (as row 7) |
| 13 | Registration server messages, among them „Вече съществува профил с този имейл. …", „Възникна грешка при регистрацията. Моля опитайте отново.", „Невалидни данни." (sign-up.mutation.ts:34-36, 52-59, 79-81) | `ac-register-st` 4, 9 | As drawn |
| 14 | A name over 120 characters: zod's English „Too big: expected string to have <=120 characters" (auth.schema.ts:22) | „Името е твърде дълго." (`ac-register-st` 9) | New message (decision 12) |
| 15 | After sign-up the form becomes the green „Изпратихме линк за потвърждение на имейла ви. …" (sign-up-form.tsx:46-52) | `sa-alert--pos` (`-st` 7) | As drawn |
| 16 | Forgot password: Имейл, „Изпрати линк", the same answer for every e-mail („Ако съществува профил …"), „Назад към вход" as a link (forgot-password-form.tsx:44-80; forgot-password.mutation.ts) | the primary button; the answer in `sa-alert--pos`; „Назад към вход" a text button | Formal „Изпратете линк"; „Назад към вход" a 48 px text button (notes ac §4 Q9) |
| 17 | New password without a token: „Липсва или невалиден линк за смяна на парола." and the link „Поискай нов линк" → /zabravena-parola (nova-parola/page.tsx:37-45) | `sa-alert--warn` and a primary button (`ac-reset-st` 8) | Formal „Поискайте нов линк", a button (Q9) |
| 18 | New password: two fields with the eye button („Покажи паролата" / „Скрий паролата", `aria-pressed`), „Смени паролата"; „Линкът за смяна на парола е невалиден или изтекъл.", „Възникна грешка. Моля опитайте отново."; success „Паролата е сменена успешно." and „Към вход" (reset-password-form.tsx; password-input.tsx:34-43; reset-password.mutation.ts) | `ac-reset`, `-st` 1–7, 10 | Formal „Сменете паролата", „Покажете паролата" / „Скрийте паролата" |
| 19 | Verify: „Зареждане…" while the page reads the address; „Потвърждаваме имейла ви…" while the link is checked, once; „Имейлът ви е потвърден успешно. …" with „Към вход"; without a token or for a bad link „Линкът за потвърждение е невалиден или изтекъл. …" with „Към вход" as a link (verify/page.tsx:24; verify-email-client.tsx) | `ac-verify-st` 1–4: a waiting row with a spinner; green alert and a primary „Към вход"; red alert and a secondary „Към вход" | As drawn (Q9) |
| 20 | Sign-in error page: five titles and messages by `?error=` (Configuration and the OAuth codes → „Влизането не бе завършено", AccessDenied, OAuthAccountNotLinked, Verification, anything else), „Опитайте отново" → /sign-in, „Към началото" → / (auth-error-content.tsx) | `ac-autherr` (centred card, warning circle), `-st` 1–6 with its loading skeleton | As drawn; the messages word for word |
| 21 | A light page ground | the night ground | The shell's |
