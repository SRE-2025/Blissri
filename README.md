# Blissri the Bakeshoppe 🧁

A full, deployable website + **Crumbl-style online ordering system** for Blissri
the Bakeshoppe (Lantana, FL). Customers browse treats, build a cart, and check
out securely through **Square hosted checkout** — every order lands in the
bakery's Square Dashboard and pushes a notification to the Square POS app, so the
business is told exactly what people ordered online.

Built as a small Node/Express app serving a fast, static front-end. No build step.

## What's inside

- **8 pages** rebuilt from the live site: Home, Menu, Order (location picker),
  the Lantana ordering page, Custom Orders, About, FAQs, Contact (+ a confirmation
  and 404 page).
- **Crumbl-style ordering** — category tabs, photo/emoji product cards, an
  “Add +” with fly-to-cart animation, a slide-in cart drawer with quantity
  steppers and a live total, and a pickup name/phone/notes form.
- **Square checkout that actually connects** — the server re-prices every cart
  from `menu.json` (so totals can't be tampered with) and creates a Square
  Payment Link. Orders appear in Square → Dashboard/POS.
- **Safe demo mode** — with no Square keys configured, the whole flow works and
  shows a confirmation without taking a real payment. Add keys to go live.

## Run locally

```bash
npm install
npm start          # http://localhost:3000
```

To test real checkout, copy `.env.example` to `.env` and add Square **sandbox**
keys, then `npm start`.

## Deploy

See **[DEPLOY.md](DEPLOY.md)** — step-by-step for connecting Square and launching
on **AWS App Runner** with HTTPS and your custom domain.

## Edit the menu

All products and prices live in **`public/data/menu.json`**. Edit names, prices,
emoji, badges or add an `img` URL — the server and every page pick it up
automatically.

## Project structure

```
server/
  server.js        Express server: static files, /api/menu, /api/checkout, /healthz
  square.js        Square hosted-checkout (Payment Link) integration
public/
  *.html           all pages (header/footer injected by js/site.js)
  css/styles.css   design system + ordering UI + cart drawer
  js/site.js       shared chrome, nav, menu loader
  js/cart.js       cart state, drawer, checkout
  js/order.js      ordering page (tabs + product cards)
  js/forms.js      contact / custom-order forms
  data/menu.json   ← single source of truth for items & prices
Dockerfile         container image for AWS App Runner
.env.example       Square credentials template
```
