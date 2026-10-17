"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { once } = require("node:events");
const { createHmac } = require("node:crypto");
const { createApp } = require("../server/app.js");
const { loadConfig } = require("../server/config.js");

const secret = "unit-test-secret-not-a-real-key";
const selection = { song_id: "the-night-we-met", product_type: "download" };

async function fixture(t, options = {}) {
  const calls = { created: [], orders: [], payments: [] };
  const order = { id: "order_test123", amount: 9900, currency: "INR", amount_paid: 9900, status: "paid",
    notes: { store: "shivammadaan.com", ...selection }, ...options.order };
  const payment = { id: "pay_test123", order_id: order.id, amount: 9900, currency: "INR",
    status: "captured", amount_refunded: 0, ...options.payment };
  const razorpay = {
    orders: {
      async create(input) {
        calls.created.push(input);
        if (options.createError) throw options.createError;
        return { ...input, id: order.id };
      },
      async fetch(id) {
        calls.orders.push(id);
        if (options.fetchError) throw options.fetchError;
        return order;
      }
    },
    payments: { async fetch(id) { calls.payments.push(id); return payment; } }
  };
  const config = loadConfig({ RAZORPAY_KEY_ID: "rzp_test_example", RAZORPAY_KEY_SECRET: secret,
    NODE_ENV: "production", ALLOWED_ORIGINS: "https://shivammadaan.com" });
  const server = createApp({ config, razorpay }).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const proof = {
    razorpay_order_id: order.id, razorpay_payment_id: payment.id,
    razorpay_signature: createHmac("sha256", secret).update(`${order.id}|${payment.id}`).digest("hex")
  };
  async function post(endpoint, body, headers = {}) {
    const response = await fetch(base + endpoint, { method: "POST",
      headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }
  return { base, calls, proof, post };
}

test("creates INR 9900-paise orders for every song and format using server prices", async (t) => {
  const f = await fixture(t);
  for (const song_id of ["the-night-we-met", "mann-bharrya"]) {
    for (const product_type of ["download", "stems"]) {
      const result = await f.post("/api/create-order", { song_id, product_type });
      assert.equal(result.status, 201);
      assert.equal(result.body.amount, 9900);
      assert.equal(result.body.currency, "INR");
      assert.equal(result.body.key_id, "rzp_test_example");
      assert.ok(!JSON.stringify(result.body).includes(secret));
      const input = f.calls.created.at(-1);
      assert.deepEqual(input.notes, { store: "shivammadaan.com", song_id, product_type });
      assert.equal(input.partial_payment, false);
      assert.ok(input.receipt.length <= 40);
    }
  }
  assert.equal(new Set(f.calls.created.map((input) => input.receipt)).size, 4);
});

test("rejects unknown products, amounts under 100 paise, fractional prices and price/currency tampering", async (t) => {
  const f = await fixture(t);
  for (const body of [{}, { ...selection, song_id: "unknown" }, { ...selection, product_type: "unknown" },
    { ...selection, amount: 99 }, { ...selection, amount: -1 }, { ...selection, amount: 9900.5 },
    { ...selection, amount: "9900" }, { ...selection, amount: 100 }, { ...selection, currency: "USD" }]) {
    assert.equal((await f.post("/api/create-order", body)).status, 400);
  }
  assert.equal(f.calls.created.length, 0);
});

test("returns 401 for provider authentication failures without exposing credentials", async (t) => {
  const f = await fixture(t, { createError: { statusCode: 401, error: { description: secret } } });
  const result = await f.post("/api/create-order", selection);
  assert.equal(result.status, 401);
  assert.ok(!JSON.stringify(result.body).includes(secret));
});

test("returns 500 for provider errors without exposing raw provider data", async (t) => {
  const f = await fixture(t, { createError: { statusCode: 503, error: { description: secret } } });
  const result = await f.post("/api/create-order", selection);
  assert.equal(result.status, 500);
  assert.ok(!JSON.stringify(result.body).includes(secret));
});

test("verifies a captured payment using the provider-stored order without local order state", async (t) => {
  const f = await fixture(t);
  const result = await f.post("/api/verify-payment", f.proof);
  assert.equal(result.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.status, "paid");
  assert.equal(result.body.delivery, "manual");
  assert.equal(result.body.test_mode, true);
  assert.deepEqual(f.calls.orders, [f.proof.razorpay_order_id]);
  assert.deepEqual(f.calls.payments, [f.proof.razorpay_payment_id]);
  assert.equal((await f.post("/api/verify-payment", f.proof)).body.success, true);
});

test("rejects missing fields and malformed signatures before making provider requests", async (t) => {
  const f = await fixture(t);
  for (const body of [{}, { ...f.proof, razorpay_payment_id: "" },
    { ...f.proof, razorpay_signature: "bad" }, { ...f.proof, razorpay_signature: "z".repeat(64) }]) {
    const result = await f.post("/api/verify-payment", body);
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  }
  assert.equal(f.calls.orders.length, 0);
});

test("rejects a forged signature and does not treat the payment as paid", async (t) => {
  const f = await fixture(t);
  const result = await f.post("/api/verify-payment", { ...f.proof, razorpay_signature: "0".repeat(64) });
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
  assert.equal(f.calls.payments.length, 0);
});

test("rejects orders created outside this shop even with a valid signature", async (t) => {
  const f = await fixture(t, { order: { notes: { store: "another-shop", ...selection } } });
  const result = await f.post("/api/verify-payment", f.proof);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});

test("rejects a signed order whose amount does not match its catalog product", async (t) => {
  const f = await fixture(t, { order: { amount: 100 } });
  assert.equal((await f.post("/api/verify-payment", f.proof)).status, 400);
  assert.equal(f.calls.payments.length, 0);
});

test("rejects mismatched payments, failed payments and partial/full refunds", async (t) => {
  for (const payment of [{ order_id: "order_other" }, { amount: 100 }, { currency: "USD" },
    { status: "refunded" }, { amount_refunded: 100 }, { status: "failed" }]) {
    const f = await fixture(t, { payment });
    const result = await f.post("/api/verify-payment", f.proof);
    assert.equal(result.status, 400);
    assert.equal(result.body.success, false);
  }
});

test("keeps authorized but uncaptured payments pending", async (t) => {
  const f = await fixture(t, { payment: { status: "authorized" }, order: { status: "attempted", amount_paid: 0 } });
  const result = await f.post("/api/verify-payment", f.proof);
  assert.equal(result.status, 202);
  assert.equal(result.body.success, false);
  assert.equal(result.body.status, "pending");
});

test("handles nonexistent provider orders as verification failures", async (t) => {
  const f = await fixture(t, { fetchError: { statusCode: 400 } });
  const result = await f.post("/api/verify-payment", f.proof);
  assert.equal(result.status, 400);
  assert.equal(result.body.success, false);
});

test("allows configured CORS origins and rejects others including null origins", async (t) => {
  const f = await fixture(t);
  const allowed = await f.post("/api/create-order", selection, { Origin: "https://shivammadaan.com" });
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://shivammadaan.com");
  for (const Origin of ["https://untrusted.example", "null"]) {
    assert.equal((await f.post("/api/create-order", selection, { Origin })).status, 403);
  }
  const preflight = await fetch(`${f.base}/api/create-order`, { method: "OPTIONS",
    headers: { Origin: "https://shivammadaan.com", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" } });
  assert.equal(preflight.status, 204);
});

test("serves public pages while keeping credentials, backend files and dependencies private", async (t) => {
  const f = await fixture(t);
  assert.equal((await fetch(`${f.base}/health`)).status, 200);
  assert.equal((await fetch(`${f.base}/shop`)).status, 200);
  assert.equal((await fetch(`${f.base}/assets/shop.js`)).status, 200);
  for (const file of ["/.env", "/.env.example", "/.git/config", "/server/index.js", "/package.json", "/node_modules/razorpay/package.json", "/shop/README.md"]) {
    assert.equal((await fetch(f.base + file)).status, 404, file);
  }
});

test("returns safe errors for invalid JSON, oversized bodies and unsupported media types", async (t) => {
  const f = await fixture(t);
  for (const [body, type, expected] of [["{", "application/json", 400],
    [JSON.stringify({ value: "x".repeat(10000) }), "application/json", 413],
    ["hello", "text/plain", 415]]) {
    const response = await fetch(`${f.base}/api/create-order`, { method: "POST", headers: { "Content-Type": type }, body });
    assert.equal(response.status, expected);
    assert.ok(!(await response.text()).includes(secret));
  }
});

test("rate limits order creation", async (t) => {
  const f = await fixture(t);
  for (let i = 0; i < 20; i++) assert.equal((await f.post("/api/create-order", selection)).status, 201);
  assert.equal((await f.post("/api/create-order", selection)).status, 429);
});

test("requires server credentials and includes the Render service origin", () => {
  assert.throws(() => loadConfig({}), /RAZORPAY_KEY_ID/);
  assert.throws(() => loadConfig({ RAZORPAY_KEY_ID: "example", RAZORPAY_KEY_SECRET: secret, PORT: "invalid" }), /PORT/);
  const config = loadConfig({ RAZORPAY_KEY_ID: "example", RAZORPAY_KEY_SECRET: secret,
    RENDER_EXTERNAL_URL: "https://my-api.onrender.com", NODE_ENV: "production" });
  assert.ok(config.allowedOrigins.has("https://my-api.onrender.com"));
  assert.ok(!config.allowedOrigins.has("http://localhost:3000"));
});
