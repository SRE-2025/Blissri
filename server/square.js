"use strict";

/**
 * Square integration — creates a hosted Square Checkout (Payment Link) for a
 * cart. Uses the built-in `fetch` (Node 18+), so there is no SDK dependency.
 *
 * Docs: https://developer.squareup.com/reference/square/checkout-api/create-payment-link
 *
 * Required env vars (see .env.example):
 *   SQUARE_ACCESS_TOKEN  — your Square access token (sandbox or production)
 *   SQUARE_LOCATION_ID   — the location orders should be attributed to
 *   SQUARE_ENV           — "sandbox" (default) or "production"
 *   SITE_URL             — public base URL, used for the post-payment redirect
 */

const SQUARE_VERSION = "2025-01-23";

function squareBaseUrl() {
  const env = (process.env.SQUARE_ENV || "sandbox").toLowerCase();
  return env === "production"
    ? "https://connect.squareup.com"
    : "https://connect.squareupsandbox.com";
}

function isConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

/**
 * Build a Square Payment Link from priced line items.
 *
 * @param {Object} params
 * @param {Array<{name:string, quantity:number, amountCents:number, note?:string}>} params.lineItems
 * @param {Object} params.customer  { name, phone, email, notes }
 * @returns {Promise<{url:string, orderId?:string, paymentLinkId?:string}>}
 */
async function createCheckoutLink({ lineItems, customer }) {
  if (!isConfigured()) {
    throw new Error("SQUARE_NOT_CONFIGURED");
  }

  const locationId = process.env.SQUARE_LOCATION_ID;
  const siteUrl = (process.env.SITE_URL || "").replace(/\/+$/, "");
  const redirectUrl = siteUrl ? `${siteUrl}/order-confirmed.html` : undefined;

  const pickupNote = buildPickupNote(customer);

  const body = {
    idempotency_key: cryptoRandomId(),
    order: {
      location_id: locationId,
      line_items: lineItems.map((li) => ({
        name: li.name,
        quantity: String(li.quantity),
        base_price_money: { amount: li.amountCents, currency: "USD" },
        ...(li.note ? { note: li.note } : {}),
      })),
      // Surface the pickup details on the order itself so staff see them.
      note: pickupNote.slice(0, 500),
    },
    checkout_options: {
      ask_for_shipping_address: false,
      ...(redirectUrl ? { redirect_url: redirectUrl } : {}),
    },
    pre_populated_data: {
      ...(customer.email ? { buyer_email: customer.email } : {}),
      ...(customer.phone ? { buyer_phone_number: customer.phone } : {}),
    },
    payment_note: pickupNote.slice(0, 500),
  };

  const resp = await fetch(`${squareBaseUrl()}/v2/online-checkout/payment-links`, {
    method: "POST",
    headers: {
      "Square-Version": SQUARE_VERSION,
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await resp.json().catch(() => ({}));

  if (!resp.ok) {
    const detail =
      (data.errors && data.errors.map((e) => e.detail || e.code).join("; ")) ||
      `HTTP ${resp.status}`;
    const err = new Error(`SQUARE_ERROR: ${detail}`);
    err.squareErrors = data.errors;
    throw err;
  }

  const link = data.payment_link || {};
  return {
    url: link.url,
    orderId: link.order_id,
    paymentLinkId: link.id,
  };
}

function buildPickupNote(customer) {
  const parts = ["Online pickup order"];
  if (customer.name) parts.push(`for ${customer.name}`);
  if (customer.phone) parts.push(`(${customer.phone})`);
  if (customer.notes) parts.push(`— ${customer.notes}`);
  return parts.join(" ");
}

function cryptoRandomId() {
  // Prefer the platform crypto; fall back to a timestamp-based id.
  try {
    return require("crypto").randomUUID();
  } catch (_e) {
    return `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

module.exports = { createCheckoutLink, isConfigured, squareBaseUrl };
