# Boards by screen

Which boards on the design canvases draw each screen, so the rebuild of a page starts from the right ones and
checks every state. Generated on 17 November 2026 from the design workspace's board index (`index/*.json` in
`D:/design/selectauto`): 553 boards in 169 rows.

- **Screen · route or code** is the canvas row's caption. It names the route, the code file, or the state it shows.
- **Boards** lists each board source by id. A page source is built into a desktop board `<id>.dc.html` (d, 1440 px),
  a tablet board `<id>-t.dc.html` (t, 820 px) and a phone board `<id>-p.dc.html` (p, 390 px). A *flow* board holds
  several frames of one interaction, a *fixed* board one fixed-width state, and a *board* a foundation sheet. A
  "2nd part" is the lower half of a page too tall for one board.
- The built boards are in `canvases/main/project/` and `canvases/admin/project/` in the workspace. Their sources,
  which are easier to read, are `src/<id>.html`. `dcanvas shot <id>.dc.html --slice 1400`, run in the workspace,
  saves screenshots to `shots/`.

When a board is added or moved, regenerate this file from the index rather than editing it by hand.

## Main canvas: the site, the account, e-mails and documents (333 boards)

### Бранд и основи (`brand`, 6 boards)

| Screen · route or code | Boards |
|---|---|
| Основи | `Main` (board) · `kit-components` (board) · `kit-cards` (board) · `kit-layout` (board) · `kit-voice` (board) · `kit-makes` (board) |

### Каталог и карти (`cars`, 42 boards)

| Screen · route or code | Boards |
|---|---|
| Каталог · /vsichki-avtomobili | `ct-catalog` (d, t, p) |
| Каталог с филтри · ?market=kr&type=bt:suv&year_from=2014 | `ct-filtered` (d, t, p) |
| Приключили търгове · ?status=past | `ct-past` (d, t, p) |
| Търсене по лот № / VIN · ?q=46198098 | `ct-search` (d, t, p) |
| Търсене без резултат · ?status=past&q=46198098 | `ct-search-none` (d, t, p) |
| Без резултати за филтрите · ?market=kr&auction=today | `ct-empty` (d, t, p) |
| Зареждане · loading.tsx | `ct-loading` (d, t, p) |
| Обновяване при смяна на филтър · ?brand=140 в ход | `ct-pending` (d, t, p) |
| Безкраен скрол: следваща страница · loadMoreCars | `ct-more` (d, t, p) |
| Споделена връзка: зареждане нагоре · ?after=&lt;sort_id&gt; | `ct-prev` (d, t, p) |
| Край на списъка · без следваща страница | `ct-end` (d, t, p) |
| Безкраен скрол: грешка при зареждане | `ct-err-d` (fixed) · `ct-err-p` (flow) |
| Падащи списъци · компютър | `ct-dd-make` (fixed) · `ct-dd-model` (fixed) · `ct-dd-type` (fixed) · `ct-dd-rest` (fixed) |
| Филтри на телефон · лист на цял екран | `ct-sheet` (flow) |
| Конзола на таблет · 820 px | `ct-tablet` (flow) |
| Статуси на картата | `ct-status` (fixed) |

### Автомобил (`car`, 61 boards)

| Screen · route or code | Boards |
|---|---|
| Автомобил: Copart, търг с брояч · /avtomobil/73264027 | `cd-copart` (d, t, p) |
| Автомобил: IAAI: оценка, 360°, видео, застраховател, текуща оферта · /avtomobil/127211024 | `cd-iaai` (d, t, p) |
| Автомобил: Copart Buy Now · /avtomobil/152896320 | `cd-buynow` (d, t, p) |
| Автомобил: IAAI Buy Now, непотвърден километраж, само 360° · /avtomobil/106474787 | `cd-buynow-iaai` (d, t, p) |
| Автомобил: Канада · /avtomobil/152896791 | `cd-canada` (d, t, p) |
| Автомобил: Корея (Encar): история, пакети, бивша под наем · /avtomobil/152501392 | `cd-korea` (d, t, p) |
| Автомобил: Корея (Encar): технически преглед, щети по автомобила · /avtomobil/152895572 | `cd-korea-insp` (d, t, p) |
| Автомобил: Корея (Encar): мощност, кражба, отзоваване, ламарина · /avtomobil/66043 | `cd-korea-full` (d, t, p) |
| Автомобил: продаден, Copart (резултат, без индексиране) · /avtomobil/150835313 | `cd-sold` (d, t, p) |
| Автомобил: продаден, без цена (IAAI) · /avtomobil/151368267 | `cd-sold-noprice` (d, t, p) |
| Автомобил: непродаден, Copart (от архива) · /avtomobil/148150417 | `cd-unsold` (d, t, p) |
| Автомобил: продаден, Encar от архива (без корейските раздели) · /avtomobil/150210054 | `cd-sold-kr` (d, t, p) |
| Автомобил: мотоциклет, марка и модел без данни · /avtomobil/108934810 | `cd-moto` (d, t, p) |
| Автомобил: зареждане (скелет) · /avtomobil/[id] | `cd-loading` (d, t, p) |
| Автомобил: галерия, увеличение и преглед на цял екран | `cd-f-gallery` (flow) · `cd-f-gallery-d` (fixed) · `cd-f-viewer` (flow) · `cd-f-viewer-d` (fixed) |
| Автомобил: 360° оглед и видео на двигател | `cd-f-media` (flow) · `cd-f-media-d` (fixed) |
| Автомобил: проверка на история по VIN | `cd-f-vin` (flow) |
| Автомобил: калкулатор за внос, попълнен за автомобила | `cd-f-calc` (flow) · `cd-f-calc-d` (fixed) · `cd-f-calc2` (flow) |
| Автомобил: Carfax заявка, попълнена и заключена | `cd-f-carfax` (flow) · `cd-f-carfax-d` (fixed) |
| Автомобил: запитване за автомобила (→ /zapitvane, decision 41) | `cd-f-inquiry` (flow) · `cd-f-inquiry-d` (fixed) |
| Автомобил: любими без вход, копиране на VIN и лот № | `cd-f-fav` (flow) |
| Автомобил: лента с цена и действия на телефон | `cd-f-bar` (flow) |
| Автомобил: закрепена колона с цена при превъртане | `cd-f-sticky` (fixed) |
| Автомобил: заглавие и описание в търсачки и при споделяне | `cd-meta` (fixed) |
| Автомобил: корейски раздели, редки състояния | `cd-states` (fixed) |

### Начало и марки (`home`, 32 boards)

| Screen · route or code | Boards |
|---|---|
| Начало · / | `hm-home` (d, t, p, wide) |
| Начало · състояния на 3D сцената и резервни обяви | `hm-home-states` (fixed) |
| Начало · телефон: 3D сцена, ленти с автомобили, марки | `hm-flow-hero` (flow) · `hm-flow-cars` (flow) · `hm-flow-brand` (flow) |
| Марка · /avtomobili/marka/[make] | `hm-make` (d, t, p, wide) |
| Марка под прага, без модели (1 обява) · /avtomobili/marka/bugatti | `hm-make-thin` (d, t, p) |
| Марка без обяви · /avtomobili/marka/skoda | `hm-make-empty` (d, t, p) |
| Марка и модел · зареждане | `hm-hub-loading` (d, t, p) |
| Марка и модел · редки състояния и варианти на текста | `hm-hub-edge` (fixed) |
| Модел · /avtomobili/marka/[make]/[model] | `hm-model` (d, t, p, wide) |
| Модел под прага за индексиране (2 обяви) · /avtomobili/marka/toyota/hiace | `hm-model-thin` (d, t, p) |
| Модел без обяви · /avtomobili/marka/toyota/corona | `hm-model-empty` (d, t, p) |

### Внос и калкулатори (`import`, 37 boards)

| Screen · route or code | Boards |
|---|---|
| Внос от Корея · /vnos-na-koli-ot-korea | `im-hub-kr` (d, t, p, t, 2nd part, p, 2nd part) |
| Внос от САЩ · /vnos-na-koli-ot-sasht | `im-hub-us` (d, t, p, p, 2nd part) |
| Внос от Канада · /vnos-na-koli-ot-kanada | `im-hub-ca` (d, t, p, p, 2nd part) |
| Внос: състояния на секциите | `im-hub-states` (fixed) · `im-hub-flow` (flow) |
| Калкулатор за внос · /kalkulator | `im-calc` (d, t, p) |
| Калкулатор: пазари и разбивки | `im-calc-kr` (fixed) · `im-calc-us` (fixed) · `im-calc-ca` (fixed) |
| Калкулатор: състояния за САЩ | `im-calc-states` (fixed) |
| Калкулатор: разбивката на имейл | `im-calc-offer` (fixed) |
| Калкулатор на телефон: стъпка по стъпка | `im-calc-flow` (flow) |
| Калкулатор на телефон: варианти и грешки | `im-calc-flow2` (flow) |
| Калкулатор от страницата на автомобил · calculator-dialog.tsx | `im-dialog` (fixed) · `im-dialog-states` (fixed) |
| Калкулатор от автомобил на телефон | `im-dialog-flow` (flow) |
| Лизингов калкулатор · /lizingov-kalkulator | `im-leasing` (d, t, p) |
| Лизингов калкулатор: състояния | `im-leasing-states` (fixed) |
| Бюджетен калкулатор · /byudzheten-kalkulator | `im-budget` (d, t, p) |
| Бюджетен калкулатор: състояния | `im-budget-states` (fixed) |
| Лизинг и бюджет на телефон | `im-fin-flow` (flow) |

### Услуги и информация (`info`, 66 boards)

| Screen · route or code | Boards |
|---|---|
| Carfax проверка · /carfax | `in-carfax` (d, t, p) · `in-carfax-flow` (flow) · `in-carfax-msgs` (fixed) |
| Проверка на VIN · /proverka-vin | `in-vin` (d, t, p) · `in-vin-flow` (flow) · `in-vin-carfax` (flow) · `in-vin-dlg` (fixed) · `in-vin-msgs` (fixed) |
| Процес · /proces | `in-proces` (d, t, p) · `in-proces-flow` (flow) · `in-proces-nogl` (d, t, p) |
| За нас · /za-nas | `in-za-nas` (d, t, p) |
| Отзиви · /otzivi | `in-otzivi` (d, t, p) · `in-otzivi-flow` (flow) · `in-otzivi-google` (fixed) |
| Контакти · /kontakti | `in-kontakti` (d, t, p) · `in-kontakti-flow` (flow) · `in-kontakti-spec` (fixed) |
| Често задавани въпроси · /chesto-zadavani-vaprosi | `in-faq` (d, t, p) · `in-faq-flow` (flow) · `in-faq-all` (fixed) |
| Блог · /blog | `in-blog` (d, t, p) · `in-blog-empty` (flow) |
| Статия · /blog/koreya-ili-amerika-otkade-da-vnesa-kola | `in-blog-post` (d, t, p) · `in-blog-elements` (fixed) |
| Общи условия · /obshti-usloviya | `in-terms` (d, t, p) · `in-legal-flow` (flow) |
| Политика за поверителност · /politika-za-poveritelnost | `in-privacy` (d, t, p) |
| Политика за бисквитки · /politika-za-biskvitki | `in-cookies` (d, t, p) |
| Грешка 404 · app/not-found.tsx | `info-404` (d, t, p) |
| Обявата не е налична · 410 от proxy.ts | `info-410` (d, t, p) |
| Грешка при зареждане · app/error.tsx (нов файл) | `info-500` (d, t, p) · `info-500-flow` (flow) |
| Заглавия и описания в търсачки и при споделяне | `info-meta` (fixed) |

### Профил и вход (`account`, 43 boards)

| Screen · route or code | Boards |
|---|---|
| Вход · /sign-in | `ac-signin` (d, t, p) · `ac-signin-st` (fixed) |
| Регистрация · /registratsiya | `ac-register` (d, t, p) · `ac-register-st` (fixed) |
| Забравена парола · /zabravena-parola | `ac-forgot` (d, t, p) · `ac-forgot-st` (fixed) |
| Нова парола · /nova-parola | `ac-reset` (d, t, p) · `ac-reset-st` (fixed) |
| Потвърждение на имейл · /verify | `ac-verify` (d, t, p) · `ac-verify-st` (fixed) |
| Грешка при вход · /greshka-pri-vhod | `ac-autherr` (d, t, p) · `ac-autherr-st` (fixed) |
| Любими автомобили · /lyubimi | `ac-fav` (d, t, p) · `ac-fav-st` (fixed) · `ac-fav-flow` (flow) |
| Любими без вход · /lyubimi | `ac-fav-out` (d, t, p) · `ac-fav-guest` (flow) |
| Шапка и меню на профила · site-header | `ac-hdr` (fixed) |
| Меню на телефон и таблет · site-header | `ac-drawer` (flow) · `ac-drawer-tab` (flow) |
| Viber, нагоре и известия · layout | `ac-float` (flow; frames 5–6, the dialog's pre-load spinner and toast, retired by decision 41) · `ac-float-desk` (fixed; figure 5 retired) |
| Запитване: въпросник · inquiry-modal (retired: decision 41 removed the dialog; the quiz is on /zapitvane) | `ac-inq-desk` (fixed) · `ac-inq-quiz` (flow) |
| Запитване: изпращане и от автомобил · inquiry-modal (retired, decision 41) | `ac-inq-desk2` (fixed) · `ac-inq-send` (flow) · `ac-inq-tab` (flow) |
| Запитване: страница · /zapitvane | `ac-zap` (d, t, p) · `ac-zap-st` (fixed) · `ac-zap-flow` (flow) · `ac-zap-flow2` (flow: from a car) · `ac-zap-tab` (flow) |

### Имейли и документи (`msg`, 46 boards)

| Screen · route or code | Boards |
|---|---|
| Имейли и документи: основа | `ms-base` (board) |
| Имейл: потвърждение на регистрацията · emails/verification-email.tsx | `ms-em-verify` (fixed) · `ms-em-verify-ph` (fixed) · `ms-em-verify-txt` (fixed) |
| Имейл: смяна на парола · emails/password-reset-email.tsx | `ms-em-reset` (fixed) · `ms-em-reset-ph` (fixed) · `ms-em-reset-txt` (fixed) |
| Имейл: калкулация за внос · emails/calculator-offer-email.tsx | `ms-em-calc` (fixed) · `ms-em-calc-ph` (fixed) · `ms-em-calc-txt` (fixed) |
| Имейл: любими автомобили с търг днес · emails/favorite-auction-digest-email.tsx · api/cron/favorite-auction-alerts | `ms-em-digest` (fixed) · `ms-em-digest-ph` (fixed) · `ms-em-digest-txt` (fixed) |
| Имейл до екипа: нов лийд от калкулатора · emails/calculator-offer-notification-email.tsx | `ms-em-calc-team` (fixed) · `ms-em-calc-team-ph` (fixed) · `ms-em-calc-team-txt` (fixed) |
| Имейл до екипа: Carfax проверка по VIN · emails/carfax-notification-email.tsx | `ms-em-carfax` (fixed) · `ms-em-carfax-ph` (fixed) · `ms-em-carfax-txt` (fixed) |
| Имейл до екипа: безплатна консултация · emails/inquiry-notification-email.tsx | `ms-em-inquiry` (fixed) · `ms-em-inquiry-ph` (fixed) · `ms-em-inquiry-txt` (fixed) |
| Имейли: варианти и условни блокове | `ms-em-var-client` (board) · `ms-em-var-team` (board) |
| Имейл: отговор на екипа до клиент · mutations/mail/send-reply.mutation.ts | `ms-em-reply-txt` (fixed) |
| Договор за посредничество · САЩ (USD) · pdf/mediation-contract-pdf.tsx · dogovor-2026-094-v1.pdf | `ms-doc-med-us-1` (fixed) · `ms-doc-med-us-2` (fixed) · `ms-doc-med-us-3` (fixed) |
| Договор за посредничество · Корея (EUR), клиент юридическо лице · pdf/mediation-contract-pdf.tsx | `ms-doc-med-kr-1` (fixed) · `ms-doc-med-kr-2` (fixed) · `ms-doc-med-kr-3` (fixed) |
| Договор за посредничество · Канада (EUR, перо 1 в CAD) · pdf/mediation-contract-pdf.tsx | `ms-doc-med-ca-1` (fixed) · `ms-doc-med-ca-2` (fixed) · `ms-doc-med-ca-3` (fixed) |
| Договор за доставка · Европа (EUR с ДДС) · pdf/delivery-contract-pdf.tsx · dogovor-2026-097-v1.pdf | `ms-doc-del-eu-1` (fixed) · `ms-doc-del-eu-2` (fixed) · `ms-doc-del-eu-3` (fixed) |
| Договор за депозит · pdf/deposit-contract-pdf.tsx · dogovor-2026-050-v1.pdf | `ms-doc-dep-1` (fixed) · `ms-doc-dep-2` (fixed) |
| Известие за плащане · pdf/payment-notice-pdf.tsx | `ms-doc-ntc-a` (fixed) · `ms-doc-ntc-f` (fixed) · `ms-doc-ntc-b` (fixed) · `ms-doc-ntc-c` (fixed) · `ms-doc-ntc-d` (fixed) · `ms-doc-ntc-e` (fixed) |
| Документи: варианти на полетата | `ms-doc-var` (board) |

## Admin canvas (220 boards)

### Обвивка, табло и състояния (`adm-shell`, 23 boards)

| Screen · route or code | Boards |
|---|---|
| Обвивка · app/admin/layout.tsx | `ad-shell-roles` (fixed) · `ad-shell-phone` (flow) |
| Табло · /admin | `ad-dashboard` (d, t, p) · `ad-dashboard-states` (flow) |
| Зареждане · app/admin/loading.tsx | `ad-loading` (d, t, p) · `ad-loading-first` (d, t, p) |
| Грешка · app/admin/error.tsx | `ad-error` (d, t, p) · `ad-error-states` (flow) |
| Няма такъв запис · app/admin/not-found.tsx | `ad-404` (d, t, p) · `ad-404-states` (flow) |
| Съобщения за грешки · всички страници | `ad-errors` (fixed) |
| Потвърждения · всички диалози на договори, депозити, тарифи, скрити обяви и mobile.bg | `ab-dialogs` (fixed) |
| Съобщения · грешки, валидация и успех в договори, депозити, тарифи, скрити обяви и mobile.bg | `ab-messages` (fixed) |

### Входящи (`adm-inbox`, 27 boards)

| Screen · route or code | Boards |
|---|---|
| Поща · /admin/poshta | `ad-mail` (d, t, p) · `ad-mail-states` (flow) |
| Писмо · /admin/poshta/[id] | `ad-thread` (d, t, p) · `ad-thread-states` (flow) · `ad-thread-reply` (flow) |
| Carfax запитвания · /admin/carfax | `ad-carfax` (d, t, p) · `ad-carfax-drawer` (fixed) · `ad-carfax-phone` (flow) |
| Консултации · /admin/zapitvaniya | `ad-inquiries` (d, t, p) · `ad-inquiries-list` (flow) · `ad-inquiries-drawer` (fixed) · `ad-inquiries-status` (flow) · `ad-inquiries-notes` (flow) · `ad-inquiries-kept` (fixed) |
| Оферти от калкулатора · /admin/oferti | `ad-offers` (d, t, p) · `ad-offers-drawer` (fixed) · `ad-offers-markets` (flow) |

### Сделки (`adm-deals`, 90 boards)

| Screen · route or code | Boards |
|---|---|
| Договори · /admin/dogovori | `ab-contracts` (d, t, p) |
| Договори · наблюдаващ – всички договори, филтър по статус | `ab-contracts-sup` (d, t, p) |
| Договори · промяна на номерацията, филтър без резултати | `ab-contracts-filter` (d, t, p) · `ab-contracts-states` (d, t, p) |
| Договори · наблюдаващ, празен регистър | `ab-contracts-empty` (d, t, p) |
| Нов договор · /admin/dogovori/nov | `ab-contract-new` (d, t, p) · `ab-contract-new-kr` (d, t, p) |
| Нов договор · Канада, нов клиент фирма, грешка под полето | `ab-contract-new-ca` (d, t, p) · `ab-contract-new-ca2` (d, t, p) |
| Нов договор · Европа, депозит в същата валута | `ab-contract-new-eu` (d, t, p) |
| Нов договор · на телефон | `ab-contract-new-flow` (flow) |
| Договор · /admin/dogovori/[id] | `ab-contract` (d, t, p) · `ab-contract-eu` (d, t, p) · `ab-contract-paid` (d, t, p) |
| Договор · наблюдаващ, Канада (три етапа, курс CAD) | `ab-contract-obs` (d, t, p) |
| Договор · анулиран, редакция и административни действия | `ab-contract-edit` (d, t, p) · `ab-contract-edit-states` (d, t, p) |
| Договор · етапи на плащане, всички състояния | `ab-contract-stages` (d, t, p) · `ab-contract-stages2` (d, t, p) |
| Договор · известие, преглед, плащане, документ | `ab-contract-panels` (d, t, p) · `ab-contract-panels2` (d, t, p) · `ab-contract-parts` (d, t, p) · `ab-contract-panels3` (d, t, p) |
| Договор · известие за плащане на телефон | `ab-contract-flow` (flow) |
| Договор · плащане и връщане на статус на телефон | `ab-contract-flow2` (flow) · `ab-contract-paid-flow` (flow) |
| Договор · нова версия и изтриване на телефон | `ab-contract-del-flow` (flow) |
| Депозити · /admin/depoziti | `ab-deposits` (d, t, p) · `ab-deposits-sup` (d, t, p) |
| Депозити · създаден депозит, промяна на номерацията | `ab-deposits-form` (d, t, p) |
| Депозити · наблюдаващ, празен списък, грешка във формата | `ab-deposits-empty` (d, t, p) · `ab-deposits-empty2` (d, t, p) |
| Депозити · състояния на ред и форма | `ab-deposits-states` (d, t, p) |
| Депозити · статус, версия, изтриване на телефон | `ab-deposits-flow` (flow) |

### Обяви (`adm-ads`, 47 boards)

| Screen · route or code | Boards |
|---|---|
| mobile.bg · /admin/mobile-bg | `ab-mobilebg` (d, t, p) |
| mobile.bg · публикувана обява, пълни параметри | `ab-mobilebg-ready` (d, t, p) · `ab-mobilebg-gone` (d, t, p) |
| mobile.bg · непозната марка, акаунтът не е настроен, празен регистър | `ab-mobilebg-block` (d, t, p) · `ab-mobilebg-dict` (d, t, p) |
| mobile.bg · електромобил: батерия, ръчна цена, непозната екстра | `ab-mobilebg-ev` (d, t, p) |
| mobile.bg · моделът липсва в речника на mobile.bg | `ab-mobilebg-model` (d, t, p) |
| mobile.bg · начално състояние | `ab-mobilebg-start` (d, t, p) |
| mobile.bg · търсене, марка и модел, цена, публикуване | `ab-mobilebg-states` (d, t, p) |
| mobile.bg · регистър: филтър, изтриване, съответствия | `ab-mobilebg-list` (d, t, p) · `ab-mobilebg-sync` (d, t, p) |
| mobile.bg · публикуване на телефон | `ab-mobilebg-flow` (flow) |
| Скрити обяви · /admin/skriti-obyavi | `ab-hidden` (d, t, p) |
| Скрити обяви · скрита обява и регистър със заявки | `ab-hidden-done` (d, t, p) |
| Скрити обяви · търсене, избор, резултат | `ab-hidden-states` (d, t, p) · `ab-hidden-states2` (d, t, p) |
| Скрити обяви · търсене, скриване, възстановяване на телефон | `ab-hidden-flow` (flow) |

### Настройки и контрол (`adm-settings`, 33 boards)

| Screen · route or code | Boards |
|---|---|
| Тарифи · /admin/tarifi | `ab-tariffs` (d, t, p) |
| Тарифи · незапазени настройки, проверка на поставена таблица | `ab-tariffs-check` (d, t, p) |
| Тарифи · състояния на настройките, таблицата и версиите | `ab-tariffs-states` (d, t, p) · `ab-tariffs-states2` (d, t, p) · `ab-tariffs-states3` (d, t, p) · `ab-tariffs-flow` (flow) |
| Получатели · /admin/poluchateli | `ad-recipients` (d, t, p) · `ad-recipients-edit` (fixed) · `ad-recipients-states` (flow) |
| Потребители · /admin/potrebiteli | `ad-users` (d, t, p) · `ad-users-dialog` (fixed) · `ad-users-list` (flow) · `ad-users-roles` (flow) |
| Дневник · /admin/dnevnik | `ad-log` (d, t, p) · `ad-log-states` (flow) · `ad-log-kinds` (flow) · `ad-log-kinds2` (flow) |
