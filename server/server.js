"use strict";

/**
 * Blissri the Bakeshoppe — web server.
 *
 *   GET  /api/menu      → serves the editable menu (public/data/menu.json)
 *   POST /api/checkout  → re-prices the cart server-side and creates a Square
 *                         hosted checkout link. Falls back to a safe "demo mode"
 *                         when Square credentials are not configured.
 *   GET  /healthz       → health check for AWS App Runner / load balancers
 *   everything else     → static files from public/
 */

const path = require("path");
const fs = require("fs");
const express = require("express");
const { createCheckoutLink, isConfigured } = require("./square");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const MENU_PATH = path.join(PUBLIC_DIR, "data", "menu.json");

app.use(express.json({ limit: "100kb" }));

// ---- Menu (cached, reloaded if the file changes) ----------------------------
let menuCache = null;
let menuMtime = 0;

function loadMenu() {
  const stat = fs.statSync(MENU_PATH);
  if (!menuCache || stat.mtimeMs !== menuMtime) {
    menuCache = JSON.parse(fs.readFileSync(MENU_PATH, "utf8"));
    menuMtime = stat.mtimeMs;
  }
  return menuCache;
}

function priceMap() {
  const menu = loadMenu();
  const map = new Map();
  for (const item of menu.items) map.set(item.id, item);
  return map;
}

app.get("/api/menu", (_req, res) => {
  try {
    res.json(loadMenu());
  } catch (e) {
    res.status(500).json({ error: "Could not load menu." });
  }
});

app.get("/healthz", (_req, res) => {
  res.json({ ok: true, square: isConfigured() ? "configured" : "demo" });
});

// ---- Checkout ----------------------------------------------------------------
app.post("/api/checkout", async (req, res) => {
  try {
    const { items, customer } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Your cart is empty." });
    }

    const cust = {
      name: clean(customer && customer.name, 80),
      phone: clean(customer && customer.phone, 40),
      email: clean(customer && customer.email, 120),
      notes: clean(customer && customer.notes, 280),
    };

    if (!cust.name || !cust.phone) {
      return res.status(400).json({ error: "Please provide a pickup name and phone number." });
    }

    // Re-price every line from the trusted menu so totals can't be tampered with.
    const prices = priceMap();
    const lineItems = [];
    let totalCents = 0;

    for (const line of items) {
      const item = prices.get(line && line.id);
      const qty = Math.max(1, Math.min(99, parseInt(line && line.qty, 10) || 0));
      if (!item) {
        return res.status(400).json({ error: `Unknown item: ${line && line.id}` });
      }
      const amountCents = Math.round(Number(item.price) * 100);
      totalCents += amountCents * qty;
      lineItems.push({
        name: item.name,
        quantity: qty,
        amountCents,
        note: clean(line && line.note, 80) || undefined,
      });
    }

    // Demo mode: no Square keys yet → confirm without taking a real payment.
    if (!isConfigured()) {
      return res.json({
        demo: true,
        url: "/order-confirmed.html?demo=1",
        totalCents,
        message:
          "Demo mode: Square is not connected yet. Add SQUARE_ACCESS_TOKEN and " +
          "SQUARE_LOCATION_ID to take real payments.",
      });
    }

    const result = await createCheckoutLink({ lineItems, customer: cust });
    if (!result.url) {
      return res.status(502).json({ error: "Square did not return a checkout URL." });
    }
    return res.json({ url: result.url, orderId: result.orderId, totalCents });
  } catch (err) {
    console.error("Checkout error:", err.message);
    if (err.message === "SQUARE_NOT_CONFIGURED") {
      return res.status(500).json({ error: "Payment is not configured yet." });
    }
    return res.status(502).json({
      error: "We couldn't start checkout. Please try again or call the shop.",
    });
  }
});

function clean(v, max) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

// ---- Static files ------------------------------------------------------------
app.use(
  express.static(PUBLIC_DIR, {
    extensions: ["html"],
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  })
);

// SPA-ish fallback: unknown non-API paths → 404 page (or index).
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).sendFile(path.join(PUBLIC_DIR, "404.html"), (err) => {
    if (err) res.status(404).send("Not found");
  });
});

app.listen(PORT, () => {
  const mode = isConfigured() ? "Square CONNECTED" : "DEMO mode (no Square keys)";
  console.log(`Blissri server running on http://localhost:${PORT}  [${mode}]`);
});
