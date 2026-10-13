# Analytics Tracking — Mixpanel

This project uses **Mixpanel** for all product analytics. Mixpanel is the single source of truth for event tracking, user identification, and behavioral data. Do not introduce any other analytics tools, SDKs, or tracking libraries without explicit instruction from a user.

> Note: Яндекс Метрика (вебвизор, цели) и Google tag (GA4, NEXT_PUBLIC_GA_ID в `lib/analytics/gtag.ts`) остаются для SEO/маркетинговой аналитики. Продуктовая аналитика действий пользователей — в Mixpanel.

---

## Before You Add or Modify Any Tracking

⛔ **Do not write Mixpanel tracking code without reading this file first.**

Wrong assumptions about platform, identity, or consent will produce broken Mixpanel data that requires manual cleanup or data deletion requests.

### Mandatory checklist before writing any Mixpanel code

- [ ] Confirm you are using the correct Mixpanel SDK for this project's platform (see Tech Stack below)
- [ ] Check if this project routes data through a CDP — if yes, send Mixpanel events through the CDP, not the Mixpanel SDK directly
- [ ] Check if consent gating is required — if this project serves EU or California users, no Mixpanel events may fire before user consent
- [ ] Review the existing Mixpanel tracking plan below before adding new events

---

## Tech Stack

| Detail | Value |
|---|---|
| **Platform** | Next.js 14 (App Router) + Android app (bearer-token API) |
| **Mixpanel SDK** | `mixpanel-browser` (web, client) + `mixpanel` (Node, server) |
| **SDK version** | `mixpanel-browser` ^2.84.0, `mixpanel` ^0.24.0 |
| **Tracking method** | client-side (web UI events, identity) + server-side (signup via NextAuth) |
| **CDP (if any)** | none |
| **Consent required** | yes — SDK init is gated behind cookie consent `"all"` (same gate as Yandex Metrika, `lib/analytics/consent.ts`). EU/CA status to be confirmed with the owner. |
| **Mixpanel project token location** | `.env.local` → `NEXT_PUBLIC_MIXPANEL_TOKEN` (declared in `.env.example`; never commit the value). Production: the same variable in `/opt/buty/.env` on the server (must be present at build time — it is a `NEXT_PUBLIC_` var) |
| **Data residency** | **EU** — проект с EU Data Residency, endpoint `NEXT_PUBLIC_MIXPANEL_API_HOST="https://api-eu.mixpanel.com"` (обязателен и на клиенте, и на сервере; без него события уходят в US и не попадают в проект) |
| **Session Replay** | включён: `record_sessions_percent` = `NEXT_PUBLIC_MIXPANEL_REPLAY_PERCENT` (по умолчанию 100). Работает независимо от `autocapture: false`; запись стартует только после init, т.е. после согласия. В реплеях по умолчанию замаскированы весь текст и инпуты |

---

## Mixpanel Initialization

Mixpanel is initialized in:

**File:** `lib/analytics/mixpanel.ts` (`initMixpanel`) — client-side, called only from `components/analytics/mixpanel-tracker.tsx` after consent `"all"`.

**File:** `lib/analytics/mixpanel-server.ts` (`trackServerEvent`, `setServerProfile`) — lazy server-side client, used from backend code.

```
// Client: init happens once, after cookie consent "all" (buty:consent event).
// Server: Mixpanel.init(token) is lazy — call trackServerEvent()/setServerProfile() anywhere.
```

**Do not:**
- Initialize Mixpanel in multiple places
- Create separate Mixpanel instances per component or module
- Import Mixpanel SDK directly in feature files — use the shared wrappers

---

## Mixpanel Identity

Mixpanel identity is managed through these calls (Simplified ID Merge is enabled; `distinct_id` = Prisma user id):

| Action | When to call | Code location |
|---|---|---|
| `identifyUser(user.id)` | On session appear / restore (login) | `components/analytics/mixpanel-tracker.tsx` |
| `resetUser()` | On logout: before `signOut()` in the sign-out button, and when the session disappears | `components/sign-out-button.tsx`, `components/analytics/mixpanel-tracker.tsx` |
| `resetIfIdentified()` | Page loads without a session but the browser still holds a previous `$user_id` (signOut reloads the page) | `components/analytics/mixpanel-tracker.tsx` |
| `disableMixpanel()` | Consent withdrawn ("necessary") → `opt_out_tracking()`; re-consent → `opt_in_tracking()` | `components/analytics/mixpanel-tracker.tsx` |
| server `distinct_id` | Server events pass `distinct_id: user.id` | `lib/analytics/mixpanel-server.ts` |
| `setServerProfile` | On user creation (`$email` only) | `lib/auth.ts` → NextAuth `events.createUser`; `app/api/mobile/auth/verify-code/route.ts` |

**Rules:**
- `identify()` uses the stable internal user ID (Prisma `user.id`) — never email
- Call `identify()` **after** the user record is confirmed; signup flow: DB user → identify → profile → `sign_up_completed`
- `reset()` must run on every logout path — the tracker resets automatically when the session disappears
- Mobile app (Expo, bearer auth): no Mixpanel SDK in the app; sign-up is tracked server-side with `distinct_id` = user id

---

## Mixpanel Tracking Plan

These are the Mixpanel events currently tracked in this project. **All new Mixpanel events must follow the same conventions.**

### Naming conventions

- Mixpanel event names: `snake_case`, past tense verb + noun (e.g., `composition_analyzed`)
- Mixpanel property names: `snake_case` (e.g., `sign_up_method`, `input_method`)
- No abbreviations; boolean properties use `is_` prefix
- Property values: lowercase strings, consistent enums; numbers unquoted; omit properties that don't apply (never `null` / `""` / `"N/A"`)

### Current Mixpanel events

| Mixpanel Event | Trigger | Key Properties | File |
|---|---|---|---|
| `sign_up_completed` | NextAuth adapter creates a user (email magic-link; fires once per account) | `sign_up_method` (`"email"`), `platform` (`"web"`) | `lib/auth.ts` (events.createUser, server) |
| `sign_up_completed` | Mobile app: first successful `verify-code` for a new email | `sign_up_method` (`"email_code"`), `platform` (`"mobile_app"`) | `app/api/mobile/auth/verify-code/route.ts` (server) |
| `composition_analyzed` | `/api/analyze` returned a successful analysis (Value Moment) | `input_method` (`"text"`/`"photo"`), `recognized`, `total`, `actives`, `fragrances`, `alcohols`, `spf_filters`, `conflicts` (numbers), + super property `platform: "web"` | `components/analyze-view.tsx` (`runAnalysis`, client) |
| `partner_link_clicked` | Click on a `/go/[productId]` partner link («Где купить») | `product_id`, `source` (query param, default `"direct"`), + super property `platform: "web"` | `components/analytics/mixpanel-tracker.tsx` (delegated click, client) |
| `payment_started` | Click «Оплатить» on /pricing (start of checkout) | `period` (`"month"`/`"year"`), `price` (number, ₽) | `components/pricing-client.tsx` (`pay`, client) |
| `payment_completed` | Payment callback confirmed and Pro granted | `period` (`"month"`/`"year"`), `plan` (`"pro"`) | `app/api/payments/callback/route.ts` (server) |
| `product_added_to_shelf` | `POST /api/shelf` created an item (201) | `add_method` (`"product"`/`"custom"`), `is_pro` (boolean), `shelf_count` (number), `has_inci` (boolean, custom only), `product_id` (product method only) | `app/api/shelf/route.ts` (server) |

### Super properties

Registered once at client init (`mixpanel.register`): `platform: "web"`. `ip: false` — no IP-based geo enrichment.

---

## How to Add a New Mixpanel Event

1. **Check the tracking plan above** — if the event already exists, use it. Do not create duplicate events.
2. **Name the event**: `snake_case`, past tense, descriptive (`object_verb`).
3. **Define properties** — only properties available at the moment the event fires.
4. **Place the call**:
   - Client UI actions → `trackEvent()` from `lib/analytics/mixpanel.ts`, after the action succeeds (API response), in the handler/component.
   - Backend-observable actions → `trackServerEvent(userId, ...)` from `lib/analytics/mixpanel-server.ts`.
   - After `identify()` if tied to a logged-in action.
5. **Update this file** — add the event to the tracking plan table.
6. **Verify in Mixpanel Live View** — confirm the event appears with correct properties.

### Mixpanel event template

```ts
// Client
import { trackEvent } from "@/lib/analytics/mixpanel";
trackEvent("item_added_to_shelf", { source: "search", product_id: product.id });

// Server
import { trackServerEvent } from "@/lib/analytics/mixpanel-server";
trackServerEvent(user.id, "subscription_started", { plan_type: "premium" });
```

---

## What Not to Do

- **Do not introduce other analytics tools.** All product tracking goes through Mixpanel.
- **Do not track events on page load** unless explicitly measuring page views.
- **Do not track PII as event properties** — no emails, names, phone numbers, IPs (disabled), or payment details. (`$email` on the user profile is set once at signup and is not an event property.)
- **Do not fire events before consent** — client SDK is not initialized until cookie consent `"all"`.
- **Do not fire events inside loops.**
- **Do not hardcode the project token** — read it from `NEXT_PUBLIC_MIXPANEL_TOKEN`.
- **Do not skip `reset()` on logout** — the tracker handles it via session state; keep it that way.
- **Do not call `identify()` before the user is authenticated.**

---

## Verification checklist (after adding events)

1. `pnpm dev` → open the site, accept cookies («Принять все») so the SDK initializes.
2. Trigger the event (e.g., paste a composition on `/analyze` → «Разобрать»).
3. Mixpanel → Live View: the event appears with expected properties.
4. Log in with a magic link → `sign_up_completed` (first account) appears server-side, and later events are attributed to the user ID (ID Merge).
