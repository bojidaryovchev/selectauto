# Parity checks

One file per screen, written before the screen is rebuilt and walked again once it is built. This is the owner's rule
of 17 November 2026 (decision 26): the rebuild improves how SelectAuto looks and works, and loses nothing it does.

Name each file after the route or the component, such as `vsichki-avtomobili.md` or `inquiry-modal.md`. The
`selectauto-design` skill writes them.

## What a check covers

Read today's code on `main` in full: the page, every component it renders, its data, constants, server actions and
e-mails. Then list everything the screen does:

- every field and every string, compared case-sensitively;
- every control, and what it does;
- every state: loading, empty, error, success, disabled, signed in and out, and each admin role;
- every variant of each entity, such as the car types;
- every interaction: filters, sorting, paging, favourites, copying, dialogs, form validation;
- every message, including errors nobody sees often;
- every side effect: records written, e-mails sent, redirects, cache invalidation;
- page metadata and structured data;
- accessible names;
- what changes per device.

## Format

```markdown
# <Screen> · <route or component>

- Boards: `<id>` (d, t, p), `<id>` (flow) …
- Code on main, read in full: `apps/web/src/…`, …
- Checked before building: <date> · Walked after building: <date>

| # | What the code does today (file:line) | On the board | Outcome |
|---|---|---|---|
| 1 | <behaviour or string> | yes · `<board id>` | — |
| 2 | <behaviour or string> | missing | Board fixed on <date>: <what changed> |
| 3 | <behaviour or string> | differs | Owner decision <n> |
```

An outcome is one of:
- **—:** the board has it as the code does.
- **Board fixed:** the board was wrong or incomplete, so it was corrected first and the owner was told.
- **Owner decision `<n>`:** the board changes it on purpose, and `decisions.md` records the owner's decision.

A difference with neither stops the build of that screen until it has one.
