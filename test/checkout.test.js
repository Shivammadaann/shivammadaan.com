"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { createShopCheckout } = require("../assets/shop-checkout.js");

const song = { id: "the-night-we-met" };
const product = { type: "download", price: 99 };
const proof = { razorpay_order_id: "order_example", razorpay_payment_id: "pay_example", razorpay_signature: "a".repeat(64) };

function fixture(options = {}) {
  const requests = [];
  const states = [];
  const data = new Map();
  let instance;
  const storage = { getItem: (key) => data.get(key) || null,
    setItem: (key, value) => data.set(key, value), removeItem: (key) => data.delete(key) };
  class Checkout {
    constructor(config) { this.config = config; this.events = {}; instance = this; }
    on(name, handler) { this.events[name] = handler; }
    open() { this.opened = true; }
  }
  const settings = {
    apiBaseUrl: "https://api.example", storage,
    loadCheckout: () => options.sdkMissing ? undefined : Checkout,
    onState: (state) => states.push(state),
    async fetchRequest(url, request) {
      requests.push({ url, body: JSON.parse(request.body) });
      if (options.offline) throw new Error("offline");
      if (url.endsWith("create-order")) {
        return { ok: true, json: async () => ({ order_id: "order_example", key_id: "rzp_test_example",
          amount: options.orderAmount || 9900, currency: "INR", description: "The Night We Met / Digital download" }) };
      }
      return { ok: !options.verificationError,
        json: async () => options.verificationError ? { error: "Verification temporarily unavailable." }
          : options.pending ? { success: false, status: "pending", message: "Awaiting capture." }
            : { success: true, status: "paid", order_id: proof.razorpay_order_id,
              payment_id: proof.razorpay_payment_id, test_mode: true } };
    }
  };
  const controller = createShopCheckout(settings);
  return { controller, requests, states, settings, data, get checkout() { return instance; } };
}

test("opens checkout using the server order and does not send a client-controlled price", async () => {
  const f = fixture();
  await f.controller.buy(song, product);
  assert.equal(f.checkout.opened, true);
  assert.equal(f.checkout.config.order_id, "order_example");
  assert.equal(f.checkout.config.amount, 9900);
  assert.deepEqual(f.requests[0].body, { song_id: song.id, product_type: "download" });
  assert.equal(f.controller.isBlocked(), true);
  assert.ok(!f.states.some((state) => state.type === "success"));
  await f.controller.buy(song, product);
  assert.equal(f.requests.length, 1);
});

test("shows success only after backend verification and clears the recovery record", async () => {
  const f = fixture();
  await f.controller.buy(song, product);
  await f.checkout.config.handler(proof);
  assert.deepEqual(f.requests[1].body, proof);
  assert.equal(f.states.at(-1).type, "success");
  assert.equal(f.states.at(-1).testMode, true);
  assert.equal(f.controller.isBlocked(), false);
  assert.equal(f.data.size, 0);
  f.checkout.config.modal.ondismiss();
  assert.equal(f.states.at(-1).type, "success");
});

test("handles dismissal and payment.failed without claiming payment success", async () => {
  const f = fixture();
  await f.controller.buy(song, product);
  f.checkout.events["payment.failed"]({ error: { description: "Payment declined." } });
  assert.equal(f.states.at(-1).message, "Payment declined.");
  f.checkout.config.modal.ondismiss();
  assert.equal(f.states.at(-1).type, "error");
  assert.equal(f.controller.isBlocked(), false);
  assert.ok(!f.states.some((state) => state.type === "success"));
  const cancelled = fixture();
  await cancelled.controller.buy(song, product);
  cancelled.checkout.config.modal.ondismiss();
  assert.equal(cancelled.states.at(-1).type, "cancelled");
  assert.equal(cancelled.controller.isBlocked(), false);
});

test("keeps pending verification recoverable after reload without starting another payment", async () => {
  const options = { verificationError: true };
  const f = fixture(options);
  await f.controller.buy(song, product);
  await f.checkout.config.handler(proof);
  assert.equal(f.states.at(-1).type, "pending");
  assert.equal(f.states.at(-1).canRetry, true);
  assert.equal(f.controller.isBlocked(), true);
  const restored = createShopCheckout(f.settings);
  assert.equal(restored.isBlocked(), true);
  options.verificationError = false;
  await restored.retryVerification();
  assert.equal(f.states.at(-1).type, "success");
  assert.equal(f.requests.filter((request) => request.url.endsWith("create-order")).length, 1);
});

test("does not mark an authorized but uncaptured payment as successful", async () => {
  const f = fixture({ pending: true });
  await f.controller.buy(song, product);
  await f.checkout.config.handler(proof);
  assert.equal(f.states.at(-1).type, "pending");
  assert.equal(f.states.at(-1).message, "Awaiting capture.");
  assert.equal(f.controller.isBlocked(), true);
});

test("handles unavailable SDK and network failures without leaving checkout stuck", async () => {
  for (const options of [{ sdkMissing: true }, { offline: true }]) {
    const f = fixture(options);
    await f.controller.buy(song, product);
    assert.equal(f.states.at(-1).type, "error");
    assert.equal(f.controller.isBlocked(), false);
  }
});

test("stops checkout if server and displayed prices differ", async () => {
  const f = fixture({ orderAmount: 19900 });
  await f.controller.buy(song, product);
  assert.equal(f.checkout, undefined);
  assert.equal(f.states.at(-1).type, "error");
  assert.match(f.states.at(-1).message, /price has changed/i);
});
