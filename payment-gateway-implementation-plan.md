# Payment Gateway — Implementation Plan

**Goal:** A modern payment gateway that websites integrate with a few lines of code.
Supports cards, UPI, and netbanking. Highly secure, fully encrypted, and stores no
sensitive payment data.

**Assumptions** (adjust if wrong): India-first (UPI/netbanking imply India), small
team (1–3 people), cloud-hosted, no existing banking relationships.

---

## 0. Executive summary — the three decisions that shape everything

1. **Never touch card data.** The checkout UI is served from your (or your partner's)
   domain and submits directly to the licensed PSP/acquirer. Your servers only ever
   see opaque tokens. This single decision drops your PCI scope from ~300 controls
   to **SAQ A (~24 controls)** and satisfies the "don't store data" requirement by design.
2. **Partner for the licensed rails; build the product layer.** Acquirer relationships,
   card network membership, and NPCI/UPI access come via a licensed PSP/PG. You build
   the orchestration, checkout UX, webhooks, dashboard, and DX that developers love.
3. **Store only tokens + transaction metadata.** No PAN, no CVV, no UPI credentials —
   ever. What must be stored (transaction records, settlement data, audit logs) is
   non-sensitive and legally required.

Result: a launchable gateway in **2–3 months**, not the 12–18 months a full licensed
stack would take.

---

## 1. Read this first: which business are you actually building?

| Model | What it requires | Cost / time | Choose when |
|---|---|---|---|
| **A. Self-use only** (payments on your own sites) | Just use a licensed PG SDK (Razorpay/Adyen/etc.). No RBI license. | Days | You only need payments for yourself |
| **B. Technology layer on a licensed PA/PG** (white-label checkout, orchestration, dashboards; the licensed entity moves funds) | Partner agreement; PCI DSS SAQ A; you never hold funds | Weeks to first merchants | ✅ Recommended starting point |
| **C. Full Payment Aggregator** (you onboard merchants, hold/route funds) | RBI PA authorization: net worth **₹15 cr at application → ₹25 cr by end of 3rd FY**, escrow account, PCI-DSS certification, data localization, 4–6+ month approval; PA-CB needed for cross-border | ₹ crores + a year | Only when volume justifies it |

**The bright line:** if money passes *through* you (escrow/nodal accounts, settlement
to merchants), you need RBI authorization under the *RBI (Regulation of Payment
Aggregators) Directions, 2025* (issued 15 Sep 2025). If you merely *instruct* a
licensed entity, you are a technology provider. Start at B; graduate to C when
revenue demands it.

---

## 2. Product requirements

### 2.1 Payment methods

- **P0 (MVP):** Cards (Visa, Mastercard, RuPay, Amex), UPI (collect, QR, intent), Netbanking (top 15 banks).
- **P1:** Wallets (Paytm/PhonePe/Amazon Pay), saved cards via tokens, refunds (full/partial), payment links.
- **P2:** EMI/BNPL, subscriptions via UPI Autopay + card e-mandates, payouts, international cards + PA-CB.

### 2.2 Merchant features

- Test/live API keys, sandbox (test cards, UPI simulator VPAs, webhook replay).
- Signed webhooks, dashboard (payments, refunds, settlements, disputes), CSV/report exports, team roles, request logs.

### 2.3 Developer experience — the actual differentiator

- 10-line checkout, SDKs (JS, Node, Python, PHP), OpenAPI spec, Postman collection, idempotency keys, stable error codes, webhook retries + replay tool.

---

## 3. Architecture

```
 Browser (merchant site)
   │  1. checkout.js opens hosted checkout
   ▼
┌──────────────────┐   2. payment intent (server→server, tokens only)
│ Hosted Checkout  │ ─────────────────────────────►┌───────────────┐
│ (payment page)   │ ◄──────────────────────────── │ PSP/Acquirer  │──► Card networks
└──────────────────┘        tokens + status        │ + UPI/NPCI    │──► Banks (netbanking)
   │  3. result + token ref                        └───────────────┘
   ▼
┌──────────────────┐   ┌────────────────┐   ┌───────────────┐   ┌──────────────┐
│  Payments API    │──►│  Orchestrator  │──►│ Token Broker  │   │  Risk/3DS2   │
│  (orders/intents)│   │ (state machine)│   │ (PSP vault    │   │ (velocity,   │
└──────────────────┘   └────────────────┘   │  + network    │   │  blocklists) │
   │                                        │  tokens)      │   └──────────────┘
   ▼                                        └───────────────┘
┌──────────────────┐   ┌────────────────┐   ┌───────────────┐
│ Webhook Service  │   │ Ledger & Recon │   │ Merchant      │
│ (HMAC-signed)    │   │ (double-entry) │   │ Console (web) │
└──────────────────┘   └────────────────┘   └───────────────┘
```

### 3.1 Components

1. **Hosted Checkout** — owns *all* sensitive input; posts directly to PSP; returns token references. This component is what keeps you in SAQ A.
2. **Payments API** — orders/intents, idempotency keys, state machine: `created → requires_payment → authorized → captured → settled → refunded | failed | expired`. Amounts always integer paise; never floats.
3. **Orchestrator** — PSP abstraction layer so you can swap/add providers by config; retries and (Phase 2) smart routing.
4. **Token Broker** — maps PSP tokens ↔ your references; stores only `last4, brand, expiry, network_token_flag, consent`.
5. **Webhook Service** — ingests PSP events, normalizes, fan-outs signed webhooks; at-least-once delivery, exponential backoff, dead-letter queue, replay endpoint.
6. **Ledger & Reconciliation** — double-entry ledger per merchant; daily settlement-file ingestion; discrepancy workflow.
7. **Risk** — 3DS2 (mandatory for cards in India), velocity limits, blocklists, device fingerprint.
8. **Merchant Console** — onboarding/KYC (only if you aggregate), API keys, transactions, refunds, reports.
9. **Platform** — Postgres (primary), Redis, queue (SQS or Kafka), object storage for reports.

### 3.2 Suggested stack

- **APIs:** TypeScript + Node (Fastify/NestJS) or Go — pick for hiring pool and speed.
- **Console:** Next.js.
- **Data:** Postgres 16, Redis, SQS/Kafka, S3.
- **Infra:** AWS `ap-south-1` (Mumbai — data localization), Terraform, CloudFront + WAF, KMS/HSM, Vault or Secrets Manager, OpenTelemetry + Grafana, GitHub Actions.
- Early infra cost: **~$300–800/month**.

### 3.3 Data model (sketch)

`merchants` · `api_keys` (secret keys hashed, Argon2) · `orders` · `payments` ·
`refunds` · `tokens` (provider_token, last4, brand, expiry) · `webhook_endpoints` ·
`webhook_events` · `settlements` · `ledger_entries` · `audit_logs`

---

## 4. Integration — "simple code" (the promise, kept)

### A. Drop-in checkout — the entire client side

```html
<script src="https://checkout.yourpg.com/v1/checkout.js"></script>
<button id="pay">Pay ₹499</button>
<script>
  document.getElementById("pay").onclick = () => YourPay.open({
    key: "pk_live_xxx",          // publishable key — safe in the browser
    orderId: "order_9f2c...",    // created server-side, one call
    onSuccess: (p) => location.href = "/success?pid=" + p.id,
    onFailure: (e) => alert(e.message),
  });
</script>
```

### B. Server side — create the order (secret key stays server-only)

```js
// POST /api/pay — your server
const r = await fetch("https://api.yourpg.com/v1/orders", {
  method: "POST",
  headers: {
    Authorization: "Bearer sk_live_xxx",
    "Idempotency-Key": crypto.randomUUID(),
  },
  body: JSON.stringify({ amount: 49900, currency: "INR", receipt: "rcpt_1024" }),
});
const order = await r.json();   // → { id: "order_9f2c..." }
```

### C. Webhooks — the only source of truth

```js
const crypto = require("crypto");

function verifyWebhook(rawBody, signatureHeader, secret) {
  // header format: t=1729...  ,v1=hex-hmac
  const parts = Object.fromEntries(signatureHeader.split(",").map(p => p.split("=")));
  const expected = crypto
    .createHmac("sha256", secret)
    .update(`${parts.t}.${rawBody}`)          // timestamp prevents replay
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}
```

**Integration contract guarantees** (state these in your docs — they're your product):
- Amounts are integer paise, currency ISO-4217.
- Every mutating endpoint accepts `Idempotency-Key`; replays return the original result.
- Every webhook is HMAC-signed with timestamp; delivery is retried with backoff for 72h.
- **Never trust the browser redirect** — fulfillment only on verified webhook.

### D. Other modes (later)

- **Embedded checkout (iframe)** — merchant stays on their domain; your iframe is the payment page (keeps SAQ A).
- **Headless / server-to-server** — merchant's own UI calls PSP SDK for card capture; your API handles tokens, UPI and netbanking via redirect/QR.

---

## 5. Security & encryption

- **Card data:** never on your servers, never in logs, never in the DB. Only PSP/acquirer vaults and network tokens (Visa VTS / Mastercard MDES). Per RBI card-on-file tokenization rules (in force since Oct 2022), only issuers/networks may store card data at all.
- **PCI DSS 4.0.1** (the only active version in 2026; all future-dated requirements are mandatory):
  - Design for **SAQ A** (~24 controls). If any payment UI is served from your own origin instead of the partner's, you fall to **SAQ A-EP (~140 controls)** — avoid it.
  - Even SAQ A now includes **client-side script protections (6.4.3 / 11.6.1)**: inventory every script on payment pages, CSP + SRI, tamper monitoring. Keep the payment page ruthlessly minimal.
  - SAQ A eligibility criteria were tightened in early 2026 — confirm current criteria with your acquirer before freezing the design.
- **3DS2 / SCA:** mandatory for card payments in India; implement AFA exemptions correctly.
- **Transport:** TLS 1.3 (1.2 fallback), HSTS, mTLS internal, cert automation, pinned connections to PSPs.
- **At rest:** AES-256-GCM via KMS, envelope encryption, column-level encryption for any PII, secrets in Vault/KMS, 90-day rotation.
- **Keys:** `pk_`/`sk_` prefixes; secret keys hashed with Argon2 in DB; per-endpoint webhook secrets; rotation + revocation UI; no secrets in env files.
- **API hardening:** idempotency on all POSTs, per-key rate limits, WAF, bot protection on checkout, 2FA + RBAC on the console, full audit log.
- **Monitoring:** structured logs through a redaction pipeline; anomaly alerts (refund spikes, velocity); incident-response runbook with RBI-mandated reporting timelines (hours, not days).
- **Testing:** penetration test before launch, quarterly ASV scans if in A-EP scope, annual re-test, private bug bounty.

---

## 6. "Don't store data" — the precise policy (put this in your docs)

**Never stored anywhere (DB, logs, backups, analytics):**
PAN, CVV/CVC, track data, PINs, UPI credentials, full bank account numbers.

**Stored (minimum viable + legally required):**
provider tokens, `last4 / brand / expiry` for display, transaction records
(amount, status, timestamps), settlement data, consent + audit logs, tax-relevant
records (retain 7–8 years per Indian law). None of it is sensitive payment data.

**Lifecycle:** documented retention policy; deletion on customer request where
legally permitted; tokens deleted on consent withdrawal (RBI requires these controls).

**Residency:** payment data for Indian transactions stored **only in India**
(RBI data-localization requirement) — region-locked DB/S3 in `ap-south-1`, no
cross-border replication. If you go global later, route storage by residency.

---

## 7. Roadmap

**Phase 0 — Foundations (2–3 weeks)**
Partner selection + contracts (PSP/acquirer, vault). Choose model (A/B/C above).
Threat model. API spec v1 (OpenAPI). Repo, CI, Terraform skeleton. PCI scope mapped
to SAQ A.

**Phase 1 — MVP (6–8 weeks)**
Hosted checkout; cards + UPI + netbanking through the partner; orders, captures,
refunds; signed webhooks with retries; sandbox; idempotency everywhere; log
redaction; basic console; light pen test. Recruit 2 friendly merchants for beta.

**Phase 2 — Growth (6–8 weeks)**
Embedded checkout; saved cards via tokens; subscriptions (UPI Autopay + card
e-mandates; RBI's *Digital Payments E-Mandate Framework, 2026* — ≤₹15,000 per
transaction without AFA, AFA above); reconciliation engine against settlement
files; dispute workflow; second PSP + routing v1; SOC 2 readiness.

**Phase 3 — Scale**
Split payments, payouts, orchestration rules UI, fraud ML, PA-CB (cross-border)
if needed, status page + SLA, SOC 2 Type II.

**Team & cost:** 1 backend + 1 full-stack (checkout/console) + 0.5 DevOps + 0.5 PM
(roles can merge in a small team). Infra ~$300–800/month; biggest cost is people
and compliance.

---

## 8. Go-live checklist

- [ ] PCI DSS 4.0.1 SAQ A attested (quarterly ASV scans only if A-EP scope)
- [ ] Partner sandbox certification passed — test matrix: happy paths, failures, refunds, 3DS, timeouts, duplicate requests
- [ ] 3DS2 + RBI tokenization verified end-to-end
- [ ] Webhook signature + replay protection tested; replay tool works
- [ ] Idempotency chaos tests (duplicate POSTs, retries, races)
- [ ] Load test — e.g., 100 TPS burst with p99 latency budget
- [ ] Secrets/HSM audit; key-rotation drill executed
- [ ] Redaction audit: grep DB + logs for PAN-like patterns → expect zero hits
- [ ] Incident-response runbook + RBI reporting timelines documented
- [ ] Reconciliation dry-run against a live settlement file
- [ ] Developer docs: quickstart, error codes, webhook reference, Postman collection

---

## 9. Key risks & mitigations

| Risk | Mitigation |
|---|---|
| PSP dependency / outages | Abstraction layer from day 1; second provider in Phase 2 |
| Regulatory drift (PA Directions 2025, E-Mandate Framework 2026) | Quarterly compliance review; lean on partner's compliance team |
| Chargebacks / fraud | 3DS2, velocity rules, reserve policy if aggregating |
| Accidentally holding funds → licensing exposure | Legal review before any money flow touches your accounts |
| Scope creep into card storage | Hard rule: PAN never enters your infrastructure; code review gate |

---

## Appendix — sources of truth to bookmark

- RBI (Regulation of Payment Aggregators) Directions, 2025 — RBI master directions
- RBI Digital Payments E-Mandate Framework, 2026 (issued 21 Apr 2026)
- RBI card-on-file tokenization circulars (Oct 2022 onward)
- PCI DSS v4.0.1 + SAQ A / SAQ A-EP (PCI SSC document library)
- NPCI UPI specifications (for flow details)
- OWASP ASVS — as the internal security baseline
