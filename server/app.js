"use strict";

const path = require("node:path");
const { createHmac, timingSafeEqual, randomUUID } = require("node:crypto");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const catalog = require("../assets/shop-catalog.js");

const siteRoot = path.resolve(__dirname, "..");
const storeId = "shivammadaan.com";

function findProduct(songId, productType) {
  const song = catalog.songs.find((item) => item.id === songId);
  const product = song?.products.find((item) => item.type === productType);
  if (!song || !product) return null;
  return { song, product, amount: Math.round(product.price * 100), currency: catalog.currency };
}

function apiFailure(res, error, operation) {
  const status = Number(error?.statusCode || error?.response?.status);
  // Never return or log the SDK's request, Basic Auth header, or raw error object.
  if (status === 401) return res.status(401).json({ error: "Payment provider authentication failed. Please contact the shop." });
  if (operation === "verify" && [400, 404].includes(status)) {
    return res.status(400).json({ success: false, error: "The payment or order could not be verified." });
  }
  return res.status(500).json({ error: operation === "create"
    ? "Unable to create your payment order. Please try again shortly."
    : "Payment verification is temporarily unavailable. Keep your payment ID and retry verification before paying again." });
}

function createApp({ config, razorpay }) {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  // Existing pages use inline scripts/styles and third-party embeds.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" } }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.has(origin)) return callback(null, true);
      const error = new Error("This website origin is not allowed to use the payment API.");
      error.status = 403;
      return callback(error);
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type"],
    maxAge: 600
  }));
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api", (_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  app.use("/api", express.json({ limit: "8kb" }));
  app.use("/api", (req, res, next) => {
    if (req.method === "POST" && !req.is("application/json")) {
      return res.status(415).json({ error: "Send the request as application/json." });
    }
    next();
  });

  const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "Too many checkout attempts. Please try again later." }
  });
  const verifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, limit: 60, standardHeaders: "draft-8", legacyHeaders: false,
    message: { error: "Too many verification attempts. Keep your payment ID and try again later." }
  });

  app.post("/api/create-order", orderLimiter, async (req, res) => {
    const { song_id, product_type, amount, currency } = req.body || {};
    const selection = findProduct(song_id, product_type);
    if (!selection) return res.status(400).json({ error: "Choose a valid song and product type." });
    if (!Number.isSafeInteger(selection.amount) || selection.amount < 100) {
      return res.status(400).json({ error: "Order amount must be at least 100 paise." });
    }
    // Optional caller amounts must match the server catalog; they never set the price.
    if (amount !== undefined && (!Number.isSafeInteger(amount) || amount < 100 || amount !== selection.amount)) {
      return res.status(400).json({ error: "The amount must match the catalog price and be at least 100 paise." });
    }
    if (currency !== undefined && currency !== selection.currency) {
      return res.status(400).json({ error: "The currency must match the catalog currency." });
    }
    try {
      const order = await razorpay.orders.create({
        amount: selection.amount,
        currency: selection.currency,
        receipt: `shop_${randomUUID().replaceAll("-", "")}`,
        partial_payment: false,
        notes: { store: storeId, song_id: selection.song.id, product_type: selection.product.type }
      });
      if (!/^order_[A-Za-z0-9]+$/.test(order.id) || order.amount !== selection.amount || order.currency !== selection.currency) {
        throw new Error("Unexpected payment order response.");
      }
      return res.status(201).json({
        order_id: order.id, amount: order.amount, currency: order.currency,
        key_id: config.keyId,
        description: `${selection.song.title} — ${selection.song.version} / ${selection.product.label}`
      });
    } catch (error) {
      return apiFailure(res, error, "create");
    }
  });

  app.post("/api/verify-payment", verifyLimiter, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
    if (typeof razorpay_order_id !== "string" || !/^order_[A-Za-z0-9]{1,100}$/.test(razorpay_order_id)
      || typeof razorpay_payment_id !== "string" || !/^pay_[A-Za-z0-9]{1,100}$/.test(razorpay_payment_id)
      || typeof razorpay_signature !== "string" || !/^[a-fA-F0-9]{64}$/.test(razorpay_signature)) {
      return res.status(400).json({ success: false, error: "Provide a valid payment ID, order ID, and payment signature." });
    }
    try {
      // Razorpay stores the order and product notes durably, so verification also
      // works after a Render restart without an in-memory order map or a database.
      const order = await razorpay.orders.fetch(razorpay_order_id);
      if (order.id !== razorpay_order_id || order.notes?.store !== storeId) {
        return res.status(400).json({ success: false, error: "This order was not created by this shop." });
      }
      // Use the order fetched on the server as the source of the signed order ID.
      const expected = createHmac("sha256", config.keySecret)
        .update(`${order.id}|${razorpay_payment_id}`).digest();
      const supplied = Buffer.from(razorpay_signature, "hex");
      if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
        return res.status(400).json({ success: false, error: "Payment signature verification failed." });
      }
      const selection = findProduct(order.notes.song_id, order.notes.product_type);
      if (!selection || order.amount !== selection.amount || order.currency !== selection.currency) {
        return res.status(400).json({ success: false, error: "The order does not match a shop product and price. Please contact support." });
      }
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      if (payment.id !== razorpay_payment_id || payment.order_id !== order.id
        || payment.amount !== order.amount || payment.currency !== order.currency
        || payment.status === "refunded" || Number(payment.amount_refunded || 0) > 0) {
        return res.status(400).json({ success: false, error: "The payment does not match this order or has been refunded." });
      }
      if (payment.status === "failed") {
        return res.status(400).json({ success: false, error: "This payment failed. It has not been marked as paid." });
      }
      if (payment.status !== "captured" || order.status !== "paid" || order.amount_paid !== order.amount) {
        return res.status(202).json({ success: false, status: "pending", payment_id: payment.id,
          message: "Payment is awaiting confirmation. Retry verification shortly; do not pay again." });
      }
      return res.json({
        success: true, status: "paid", order_id: order.id, payment_id: payment.id,
        amount: order.amount, currency: order.currency,
        product: { song_id: selection.song.id, product_type: selection.product.type,
          title: selection.song.title, label: selection.product.label },
        test_mode: config.keyId.startsWith("rzp_test_"),
        delivery: "manual"
      });
    } catch (error) {
      return apiFailure(res, error, "verify");
    }
  });

  // Serve only public assets and the known HTML pages. Never serve the repository
  // root with express.static: .env, backend source and dependencies stay private.
  app.use("/assets", express.static(path.join(siteRoot, "assets"), { dotfiles: "deny", index: false, redirect: false }));
  app.get("/favicon.png", (_req, res) => res.sendFile(path.join(siteRoot, "favicon.png")));
  app.get("/sitemap.xml", (_req, res) => res.sendFile(path.join(siteRoot, "sitemap.xml")));
  for (const page of ["", "about", "releases", "contact", "shop"]) {
    app.get(page ? `/${page}` : "/", (_req, res) => res.sendFile(path.join(siteRoot, page, "index.html")));
  }
  app.use((_req, res) => res.status(404).json({ error: "Not found." }));
  app.use((error, _req, res, _next) => {
    if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Invalid JSON request." });
    if (error.type === "entity.too.large") return res.status(413).json({ error: "Request body is too large." });
    if (error.status === 403) return res.status(403).json({ error: "This website origin is not allowed to use the payment API." });
    return res.status(500).json({ error: "The server could not complete this request." });
  });
  return app;
}

module.exports = { createApp };
