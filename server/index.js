"use strict";

const path = require("node:path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env"), quiet: true });
const Razorpay = require("razorpay");
const { loadConfig } = require("./config.js");
const { createApp } = require("./app.js");

try {
  const config = loadConfig();
  const razorpay = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
  // The installed SDK uses this Axios instance for all provider requests.
  razorpay.api.rq.defaults.timeout = 20000;
  const app = createApp({ config, razorpay });
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`Site and payment API running at http://localhost:${config.port}`);
  });
  server.on("error", (error) => {
    console.error(`Server failed to listen (${error.code || "unknown error"}).`);
    process.exitCode = 1;
  });
  function shutdown() {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  }
  process.once("SIGTERM", shutdown);
  process.once("SIGINT", shutdown);
} catch (error) {
  // Configuration errors are actionable; never print an SDK object with auth data.
  console.error(error.message);
  process.exitCode = 1;
}
