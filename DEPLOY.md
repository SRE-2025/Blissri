# Deploy Guide — Blissri Bakeshoppe

Follow this once. Total time ~30–45 minutes. No prior coding needed, but you'll
use Square's developer site and the AWS console.

---

## Step 1 — Connect your Square account (~5 min)

1. Go to https://developer.squareup.com/apps and sign in with the SAME Square
   account the bakery uses for sales.
2. Click **+ Create an app** (name it e.g. "Blissri Website"). Open the app.
3. In the left menu choose **Credentials**. At the top, switch the toggle to
   **Production** (use **Sandbox** first if you want to test with fake cards).
4. Copy two values:
   - **Access token** (Production Access Token) → this is `SQUARE_ACCESS_TOKEN`
   - Go to **Locations** in the left menu → copy the **Location ID** of your
     Lantana shop → this is `SQUARE_LOCATION_ID`
5. Keep these private. You'll paste them into AWS in Step 2 (never put them in
   the website code or share them in email/chat).

### How you'll be told what people ordered
Because checkout creates a real Square **Order**, every online order appears in:
- **Square Dashboard → Orders** (on the web), and
- the **Square POS app** on your phone/tablet, which sends a push notification.

Make sure the Square app is installed and notifications are on:
Square app → **≡ More → Settings → Notifications → Order notifications = ON**.
That's the "tell the business what people ordered" piece — built into Square, no
extra setup.

---

## Step 2 — Launch on AWS (recommended: App Runner)

AWS App Runner takes this code and runs it as a live website with automatic
HTTPS. It's the simplest full-app option.

### 2a. Put the code on GitHub (one time)
1. Create a free account at https://github.com and a new **private** repository
   called `blissri-bakeshoppe`.
2. Upload this entire folder to that repo (GitHub's web uploader works, or use
   GitHub Desktop). Make sure these are included: `server/`, `public/`,
   `package.json`, `Dockerfile`. (`.env` is intentionally excluded.)

### 2b. Create the App Runner service
1. Sign in to https://console.aws.amazon.com and search **App Runner** → open it.
2. **Create service**.
3. Source: **Source code repository** → connect GitHub → pick your repo and the
   `main` branch. Deployment trigger: **Automatic** (redeploys when you change code).
4. Build settings: pick **Dockerfile** (App Runner detects the included `Dockerfile`).
   - If asked manually: Build command `npm install --omit=dev`, Start command
     `node server/server.js`, Port `3000`.
5. Service settings:
   - **Port**: `3000`
   - **Environment variables** — add these four:
     | Name | Value |
     |------|-------|
     | `SQUARE_ACCESS_TOKEN` | (your production token from Step 1) |
     | `SQUARE_LOCATION_ID` | (your Lantana location ID) |
     | `SQUARE_ENV` | `production` |
     | `SITE_URL` | leave blank for now; set after you have the URL |
6. Click **Create & deploy**. After a few minutes App Runner gives you a URL like
   `https://xxxx.us-east-1.awsapprunner.com`. Open it — your site is live.
7. Go back to the service → **Configuration → Environment variables**, set
   `SITE_URL` to that App Runner URL (or your custom domain), and **Deploy** again
   so the post-payment redirect points to the right place.

### 2c. Use your own domain (blissribakeshoppe.com)
In App Runner → your service → **Custom domains** → **Link domain** →
enter `blissribakeshoppe.com`. AWS shows DNS records to add at your domain
registrar (where you bought the domain). Add them; HTTPS is issued automatically.
Then update `SITE_URL` to `https://blissribakeshoppe.com` and redeploy.

> Switching the live domain over replaces the current WordPress site, so do this
> only once you've tested the App Runner URL and are happy with it.

---

## Alternative hosting options
- **AWS Elastic Beanstalk** — also runs the Node app; choose the "Node.js"
  platform, upload a zip of this folder, set the same 4 environment variables.
- **S3 + CloudFront (static only)** — cheapest, but it can only host the pages,
  NOT the `/api/checkout` endpoint. If you go this route you'd run the small
  checkout server separately (e.g. an AWS Lambda) — more moving parts, so App
  Runner is recommended for simplicity.

---

## Testing checkout safely
1. In Step 1, use **Sandbox** credentials and set `SQUARE_ENV=sandbox`.
2. At checkout you'll be sent to Square's sandbox page. Use test card
   `4111 1111 1111 1111`, any future expiry, any CVV/ZIP.
3. The order appears in your Square **Sandbox** dashboard.
4. When happy, swap to **Production** token + `SQUARE_ENV=production` and redeploy.

> Before adding any keys the site runs in **demo mode**: the cart and checkout
> flow work end-to-end and show a confirmation, but no real payment is taken.

## Optional add-ons (not required to launch)
- **Email/SMS alerts in addition to Square's app**: the Contact and Custom Order
  forms currently just confirm on-screen. To email submissions, wire them to a
  form service (e.g. AWS SES, Formspree). Ask and this can be added.
- **Self-hosting product photos**: cards use emoji by default. To use real
  photos, add an `img` URL to any item in `public/data/menu.json` (cards fall
  back to the emoji automatically if an image fails to load).

## Running it locally
```bash
npm install
# optional: cp .env.example .env  and add Square sandbox keys
npm start
# open http://localhost:3000
```

## Where things live
```
server/server.js        web server + /api/checkout + /api/menu
server/square.js        Square payment-link integration
public/*.html           all pages
public/js/site.js       shared header/footer + menu loader
public/js/cart.js       cart drawer + checkout
public/js/order.js      ordering page (tabs, product cards)
public/js/forms.js      contact / custom-order form handling
public/data/menu.json   ← edit menu & prices here
Dockerfile              used by AWS App Runner
.env.example            template for your Square keys
```
