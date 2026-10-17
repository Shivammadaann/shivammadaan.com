"use strict";

function loadConfig(env = process.env) {
  const keyId = (env.RAZORPAY_KEY_ID || "").trim();
  const keySecret = (env.RAZORPAY_KEY_SECRET || "").trim();
  if (!keyId || !keySecret) {
    throw new Error("Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the server environment.");
  }

  const port = Number(env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535.");
  }

  const origins = (env.ALLOWED_ORIGINS || "https://shivammadaan.com,https://www.shivammadaan.com")
    .split(",").map((origin) => origin.trim()).filter(Boolean);
  if (env.RENDER_EXTERNAL_URL) origins.push(env.RENDER_EXTERNAL_URL);
  if (env.NODE_ENV !== "production") {
    origins.push("http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5500", "http://127.0.0.1:5500");
  }

  const allowedOrigins = new Set(origins.map((origin) => {
    const url = new URL(origin);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
      throw new Error("ALLOWED_ORIGINS must contain comma-separated HTTP(S) origins without paths.");
    }
    return url.origin;
  }));

  return { keyId, keySecret, port, allowedOrigins };
}

module.exports = { loadConfig };
