# Mail · `/admin/poshta`, `/admin/poshta/[id]` (`components/admin/mail`)

- Boards (admin canvas): `ad-mail` (d, t, p), `ad-mail-states` (flow: unread only, nothing found, end of page),
  `ad-thread` (d, t, p), `ad-thread-states` (flow: status, saving, not changed, body not fetched, empty message and a
  reply still sending), `ad-thread-reply` (flow: Reply-To, sending, sent, not sent in the thread and in the box, no
  connection), `ad-errors` (fixed). The design run's notes: `D:/design/selectauto/notes/ad.md` (rows 14–16).
- Code on main, read in full: `app/admin/poshta/page.tsx`, `app/admin/poshta/[id]/page.tsx`, `components/admin/mail/*`,
  `constants/mail.ts`, `queries/mail/{list-threads,get-thread}.query.ts` (types and search), and the messages of
  `mutations/mail/send-reply.mutation.ts` (`sendReply`, `markThreadRead`, `updateThreadStatus`).
- Checked before building: 18.11.2026 · Walked after building: 18.11.2026 on the local build, signed in as a real
  admin; every request to a real thread blocked (none was made) and every action answered by a mock or cut off.
  Walked: the inbox at 1440, 1280, 1150, 820, 390 and 320 (one line per thread on a 952 px list and wider, the subject
  228 px at 1280; stacked below; no sideways scroll; no label on two lines); „Само непрочетени" (144), with
  „Затворен" (0, the empty state), a search that finds nothing (the mail icon). On a temporary route rendering the
  thread components with made-up threads, deleted before the commit: the header and back link; every message state
  (an HTML-only body shown as text with its script dropped, not fetched yet, empty, still sending, failed with and
  without a reason); the attachments and the note; marking an unread thread read; the status saving, saved, refused
  and with no connection; the composer to the Reply-To address, sending (field and button locked, „Изпраща се…"),
  sent (box cleared), refused and with no connection (the text kept, the message above the button).
- A thread page is never opened on the live data to check it: its render fetches missing bodies from Resend and saves
  them. It is walked on a temporary route that renders the same components with made-up threads.

## What the code does today

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | Admins only (`requireAdminPage`); tab titles „Поща" and „Писмо" (the two page.tsx) | `ad-shell-roles` | Kept |
| 2 | „Поща", „Съобщения до info@selectauto.bg. Отговорите се изпращат от същия адрес." (poshta/page.tsx:34-38) | `ad-ph` | — |
| 3 | Search: „Търсене" for screen readers, `type=search`, no autocapitalise or autocorrect, „Търсене по имейл, име или тема…", a primary „Търси"; it writes `q` and goes back to page 1; it matches the e-mail, the subject and the name (mail-inbox.tsx:54-77; list-threads.query.ts:51-58) | the kit's field with a search icon, a secondary „Търсете" | Formal „Търсете" (decision 1); as drawn |
| 4 | Chips „Всички", Нов, В процес, Затворен and „Само непрочетени" (on and off, `unread=1`, combined with the status) in a group „Филтър по статус"; each goes back to page 1 (mail-inbox.tsx:79-108) | `sa-chips` (`ad-mail-states` 1) | — |
| 5 | „Намерени: N" (mail-inbox.tsx:110-112) | `ad-count` | — |
| 6 | „Няма съобщения за този филтър." (mail-inbox.tsx:114-115) | `ad-empty` with a mail icon (`ad-mail-states` 2) | As drawn |
| 7 | A row per thread, newest first, 50 a page: the name or else the e-mail (heavier when unread), a dot „Непрочетено", the status; the subject or „(без тема)", with „Вие: " when we wrote last; the e-mail, „N съобщения", the date; the row opens the thread and is never prefetched, because a prefetch renders the thread page (mail-inbox.tsx:116-150) | `ad-ml`: on a wide list one line per thread (the name with the e-mail under it, the subject, count and date, the status); the dot in info blue; the status as the kit's tag | As drawn. One line from a 56rem list, not the board's 1100 px window: with the sidebar that left the subject about 60 px. Prefetch stays off |
| 8 | The pager, keeping the filters (mail-inbox.tsx:153-157) | `ad-pager` (`ad-mail-states` 3) | Built with the shell |
| 9 | The thread's header: back to „Поща", the subject or „(без тема)" as the title, „{name} · {e-mail}" (mail-thread-view.tsx:39-49) | `ad-ph` with the back link | — |
| 10 | „Статус" and the shared dropdown in its old look, „Статус на разговора", three options; a pick shows at once and saves, the field locked meanwhile, back to the old value on a failure with „Връзката прекъсна — статусът не е сменен." or the server's message in red; it follows the server's value after a reply (mail-thread-status-select.tsx; mail-thread-view.tsx:51-56) | `ad-stsel` with the kit's dropdown; the error with an icon (`ad-thread-states` 1–3) | As drawn |
| 11 | The messages, oldest first: „SelectAuto" for ours, else the sender's name or address; the date; ours tinted (mail-thread-view.tsx:58-71) | `ad-msg`; ours set in from the left on a lighter surface | As drawn |
| 12 | A reply that failed: a red banner „НЕ е изпратено: {причина}" or „НЕ е изпратено."; one still going: „изпраща се…" (mail-thread-view.tsx:73-81) | the kit's red alert with „НЕ е изпратено" in bold; „изпраща се…" with a small spinner (`ad-thread-reply` 4, `ad-thread-states` 5) | As drawn; the text as written, the lower case included |
| 13 | The body always as plain text, never the sender's HTML (a stranger's markup inside /admin); „Съдържанието още не е изтеглено. Презаредете след малко." before it is fetched; „(празно съобщение)" (message-body.tsx) | `ad-msg__b`, `ad-msg__note` | Kept; the plain-text rule unchanged |
| 14 | A chip per attachment „{име} · N KB · {тип}", „прикачен файл" without a name; under the thread „Прикачените файлове се съхраняват в Resend и още не се свалят от панела." (mail-thread-view.tsx:85-103) | `ad-file` chips with a paperclip; `ad-note` with an info icon | As drawn |
| 15 | Opening an unread thread marks it read, once, without waiting or refreshing (mail-thread-view.tsx:22-28) | — | Kept |
| 16 | The composer: „Отговор", „До {Reply-To or the participant} · от info@selectauto.bg", 8 rows, „Напишете отговора си…", locked while sending; „Изпрати", off while empty or sending, „Изпраща се…"; „Съобщението не може да е празно."; the server's errors („Изпращането не бе успешно. Съобщението е запазено, но НЕ е изпратено." …) and, without a connection, „Връзката прекъсна, докато отговорът се изпращаше. Проверете дали се появи в разговора, преди да изпратите отново." in a red banner under the field, the text kept; sent: the box clears and the page refreshes (reply-composer.tsx) | `ad-comp` on a panel; the primary button with a spinner while sending; the error above the button (`ad-thread-reply` 1–6) | Formal „Изпратете" (decision 1); as drawn |
| 17 | The actions' messages: „Нямате достъп до тази операция.", „Съобщението е твърде дълго.", „Възникна грешка при запазването. Моля опитайте отново.", and the ones only a forged request reaches (send-reply.mutation.ts) | `ad-errors` | Kept as written |
| 18 | White rows and cards | the night ground, the kit's surfaces | The kit's |
