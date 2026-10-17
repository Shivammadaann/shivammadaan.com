# Shivam Madaan website and payment backend

The HTML/CSS/JavaScript website now has a Node.js/Express backend for Razorpay
Standard Checkout. It can run as one Render Web Service, or as a Render API
behind the existing GitHub Pages frontend. No database is required: Razorpay
stores the orders, product notes, and payment records.

## Run locally

Use Node.js 24 LTS. Dependencies are locked in `package-lock.json`.

```sh
npm ci
```

For a fresh checkout, copy `.env.example` to `.env` and enter your own Razorpay
test key ID and secret. The local `.env` is already populated in this workspace
and is excluded from Git. Existing environment variables take precedence.

```sh
npm test
npm start
```

Open `http://localhost:3000/shop`. Use this URL rather than a static preview
server so `/api` requests reach the backend. `npm run dev` restarts the backend
when server files change. Restart after changing the catalog or environment.

## Deploy to Render

Commit and push the application files and lockfile to your repository. Keep
`.env` out of Git.

Either create a **Blueprint** from `render.yaml`, or create a **Web Service**:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Root directory | Repository root (leave blank) |
| Build command | `npm ci --omit=dev` |
| Start command | `npm start` |
| Health check | `/health` |
| `NODE_ENV` | `production` |
| `RAZORPAY_KEY_ID` | Your Razorpay test key ID |
| `RAZORPAY_KEY_SECRET` | The matching secret, set in Render's environment settings |
| `ALLOWED_ORIGINS` | `https://shivammadaan.com,https://www.shivammadaan.com` |

The Blueprint asks for the credentials during setup. The app binds to
`0.0.0.0` and Render's `PORT`. Render's own `RENDER_EXTERNAL_URL` is automatically
included in the allowed origins.

**Serve the whole site on Render:** open `https://YOUR-SERVICE.onrender.com/shop`.
Leave `apiBaseUrl` empty in `assets/shop-config.js`. No frontend build is needed.

**Keep the frontend on GitHub Pages:** after Render deploys, set `apiBaseUrl`
in `assets/shop-config.js` to the actual Render service origin:

```js
window.SHOP_CONFIG = {
  apiBaseUrl: "https://YOUR-SERVICE.onrender.com"
};
```

Publish that public configuration with the frontend. Add any additional exact
frontend origins to `ALLOWED_ORIGINS`. Do not put API credentials in this file.
The backend returns only the public key ID when it creates an order.

## Test checkout

1. Start the backend or deploy it on Render with **test** credentials. Configure
   automatic capture in the Razorpay dashboard's matching test mode.
2. Open `/shop` and click **Buy now** for a digital download or stems package.
   Each costs INR 99; the backend creates an order for 9,900 paise.
3. Use Razorpay's documented test payment methods to complete a simulated
   payment, and test cancellation and failure as well.
4. Confirm the site displays **Test payment verified** only after server-side
   signature verification and confirmation that the payment is captured.
5. If capture is pending, check the payment's status in the matching Razorpay
   dashboard mode, then use **Retry verification** after capture is confirmed.
   Keep the payment ID; do not make another payment to retry verification.

The test suite uses fake provider responses and dummy credentials. It does not
charge anything or call Razorpay. Pending verification is kept in the current
browser tab's session storage and can be retried after a reload or server restart.

## Endpoints

`GET /health` returns `{ "status": "ok" }`.

`POST /api/create-order`, with JSON:

```json
{ "song_id": "the-night-we-met", "product_type": "download" }
```

Choose `mann-bharrya` for the other song and `stems` for project stems. The server
uses the shared catalog's price and currency. An optional `amount` must be an
integer of at least 100 paise and match the server price; an optional `currency`
must also match. The server generates the receipt. Response fields include
`order_id`, `amount`, `currency`, `key_id`, and `description`.

`POST /api/verify-payment`, with the Checkout callback fields:

```json
{
  "razorpay_order_id": "order_FROM_CHECKOUT",
  "razorpay_payment_id": "pay_FROM_CHECKOUT",
  "razorpay_signature": "64-character-hex-signature-from-checkout"
}
```

The backend fetches the original order from Razorpay, confirms it belongs to
this shop, verifies HMAC-SHA256 using a constant-time comparison, and checks the
payment's order, amount, currency, capture state and refund state. It returns
`success: true` only for a captured payment on the fully paid matching order.
An uncaptured payment returns HTTP 202 with `success: false` and `status: pending`.
Bad fields/signatures return 400, provider authentication failures 401, provider
outages 500, and excessive requests 429. API responses are not cached.

## File delivery

**This integration processes and verifies payments; delivery is currently manual.**
Paid song files and stems have not been provided, and no automatic download link
is generated. After a verified real payment, the shop displays a contact link
with the payment ID for arranging delivery. Test payments do not deliver files.
Razorpay order notes identify the exact song and format for fulfillment.

Before accepting real payments, prepare the deliverable files, confirm capture
settings, and replace the test credentials with live credentials on Render.
Orders are visible in Razorpay if a customer closes the page before the callback
returns. There is no webhook-driven fulfillment or local order database.

## References

- [Razorpay Standard Checkout integration](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/)
- [Render Node/Express deployment](https://render.com/docs/deploy-node-express-app)
- [Render Blueprint configuration](https://render.com/docs/blueprint-spec)
