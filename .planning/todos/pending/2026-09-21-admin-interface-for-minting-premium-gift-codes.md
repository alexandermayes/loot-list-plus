---
created: 2026-09-22T05:55:00.000Z
title: Admin interface for minting Premium gift codes
area: billing
severity: minor
files:
  - scripts/lib/gift-code.ts
  - scripts/create-gift-code.ts
  - app/api/admin/clear-all-guilds/route.ts:7
  - app/api/billing/checkout/route.ts:88
---

## Problem

Gifting a guild Premium currently means either hand-creating a coupon plus a
promotion code in the Stripe Dashboard, or running `npm run gift:code` locally.
The CLI needs `STRIPE_SECRET_KEY` in `.env.local`, which is not set on the
development machine, so in practice gifting falls back to Dashboard clicking.
Both paths work but neither leaves a record inside the product, so there is no
easy answer to "which codes have I handed out and did they get used".

Not blocking anything. Both workarounds are about two minutes. This is
convenience plus visibility.

## Solution

An `/admin/gifts` page gated by the existing `SUPER_ADMIN_IDS` env pattern
(see `app/api/admin/clear-all-guilds/route.ts:7` for the established check:
allow in development, otherwise require the user id to be in the list).

The page needs: duration control (forever / 3 months / 12 months), an
expires-in-days field defaulting to 30, a create button, the resulting code
displayed for copying, and a list of recently minted codes with redemption
status read back from Stripe.

**Decision already made (2026-09-21):** mint promotion codes rather than
granting `pro` directly to a guild. Stripe stays the source of truth, the
existing webhook to `syncSubscriptionToGuild` to `tierForStatus` chain keeps
working untouched, and no schema change is needed. Granting directly was
considered and rejected: it would need new columns for comp source, expiry and
audit, plus a nightly expiry job, and it creates three known problems, namely
the guild is then blocked from subscribing normally (`checkout/route.ts:56`
returns 400 when already pro), the Discord premium role keys on
`guilds.created_by` rather than the intended recipient, and comps need their
own audit trail.

**Why this is cheap.** Everything in `scripts/lib/gift-code.ts` except
`parseGiftCodeArgs` is transport-agnostic and reusable from an API route:
`generateGiftCode`, `resolveGift`, `giftMetadata`, `buildCouponParams`,
`buildPromotionCodeParams`, `isLiveKey`, `redactStripeSecrets`. The work is:

1. Move `scripts/lib/gift-code.ts` to `lib/billing/gift-code.ts` and update the
   CLI import. Its test file moves with it. Do not import from `scripts/` into
   `app/` instead; shared billing logic does not belong under `scripts/`.
2. Add one admin API route that reuses those builders.
3. Add one page.

Keep the CLI working. It is the fallback when the app is not running, and its
live-mode confirmation gate should have an equivalent in the UI so a real
100%-off-forever code is never one careless click away.

Codes are bearer credentials. The page should say so next to the copy button,
and the code should not be logged server-side.

Context: the CLI this wraps was added in quick task 260921-ud3.
