(function () {
  "use strict";

  // The controller is also exported for tests with a fake SDK and HTTP client.
  function createShopCheckout({ apiBaseUrl = "", currency = "INR", fetchRequest, loadCheckout, storage, onState }) {
    const storageKey = "shivam-shop-pending-payment";
    let busy = false;
    let pending = null;

    function savePending() {
      try {
        if (pending) storage?.setItem(storageKey, JSON.stringify(pending));
        else storage?.removeItem(storageKey);
      } catch { /* Verification still works when browser storage is unavailable. */ }
    }

    function notify(state) {
      onState({ ...state, blocked: busy || Boolean(pending), busy,
        canRetry: Boolean(pending) && !busy, paymentId: state.paymentId || pending?.razorpay_payment_id || "" });
    }

    async function post(endpoint, body) {
      let response;
      try {
        response = await fetchRequest(`${apiBaseUrl.replace(/\/$/, "")}${endpoint}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          credentials: "omit", body: JSON.stringify(body), signal: AbortSignal.timeout(30000)
        });
      } catch {
        throw new Error("The payment service could not be reached. Please try again shortly.");
      }
      let result;
      try { result = await response.json(); } catch {
        throw new Error("Checkout is temporarily unavailable. Please contact the shop or try again later.");
      }
      if (!response.ok) throw new Error(result.error || "The payment request could not be completed.");
      return result;
    }

    async function verifyPending() {
      if (!pending || busy) return;
      busy = true;
      notify({ type: "verifying", message: "Verifying your payment. Please keep this page open." });
      try {
        const result = await post("/api/verify-payment", pending);
        if (result.success !== true || result.status !== "paid") {
          busy = false;
          notify({ type: "pending", message: result.message || "Payment confirmation is pending. Retry verification before paying again." });
          return;
        }
        if (result.order_id !== pending.razorpay_order_id || result.payment_id !== pending.razorpay_payment_id) {
          throw new Error("The payment confirmation did not match your order. Please contact the shop.");
        }
        const paymentId = result.payment_id;
        pending = null;
        savePending();
        busy = false;
        notify({ type: "success", paymentId, testMode: result.test_mode,
          message: result.test_mode
            ? "Test payment verified. No real money was charged and no files will be delivered for this test."
            : "Payment confirmed. Contact the shop with the payment ID below to arrange delivery of your files." });
      } catch (error) {
        busy = false;
        notify({ type: "pending", message: `${error.message} Keep your payment ID and retry verification before paying again.` });
      }
    }

    async function buy(song, product) {
      if (busy || pending) return;
      busy = true;
      notify({ type: "preparing", message: "Preparing secure checkout…" });
      try {
        const Checkout = await loadCheckout();
        if (typeof Checkout !== "function") throw new Error("Secure checkout could not load. Please reload the page and try again.");
        const order = await post("/api/create-order", { song_id: song.id, product_type: product.type });
        if (!/^order_[A-Za-z0-9]+$/.test(order.order_id) || typeof order.key_id !== "string"
          || !Number.isSafeInteger(order.amount) || order.amount < 100) {
          throw new Error("The payment order could not be prepared. Please contact the shop.");
        }
        if (order.amount !== Math.round(product.price * 100) || order.currency !== currency) {
          throw new Error("The price has changed. Reload this page before paying.");
        }
        let settled = false;
        let lastFailure = "";
        const checkout = new Checkout({
          key: order.key_id, order_id: order.order_id, amount: order.amount, currency: order.currency,
          name: "Shivam Madaan", description: order.description,
          theme: { color: "#2563eb" },
          handler: async (response) => {
            if (settled) return;
            settled = true;
            pending = {
              razorpay_order_id: order.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };
            savePending();
            busy = false;
            await verifyPending();
          },
          modal: {
            ondismiss() {
              if (settled) return;
              settled = true;
              busy = false;
              notify({ type: lastFailure ? "error" : "cancelled",
                message: lastFailure || "Checkout closed. No payment has been confirmed." });
            }
          }
        });
        checkout.on("payment.failed", (response) => {
          if (settled) return;
          lastFailure = response.error?.description || "The payment failed. You can retry in checkout or close it and try again.";
          notify({ type: "error", message: lastFailure });
        });
        notify({ type: "checkout", message: "Complete your payment in the secure Razorpay checkout." });
        checkout.open();
      } catch (error) {
        busy = false;
        notify({ type: "error", message: error.message });
      }
    }

    try {
      const saved = JSON.parse(storage?.getItem(storageKey) || "null");
      if (saved && typeof saved.razorpay_order_id === "string" && typeof saved.razorpay_payment_id === "string"
        && typeof saved.razorpay_signature === "string") {
        pending = { razorpay_order_id: saved.razorpay_order_id,
          razorpay_payment_id: saved.razorpay_payment_id, razorpay_signature: saved.razorpay_signature };
        notify({ type: "pending", message: "A previous payment still needs verification. Retry verification before starting another payment." });
      }
    } catch { /* An invalid or blocked session store must not break the shop. */ }

    return { buy, retryVerification: verifyPending, isBlocked: () => busy || Boolean(pending) };
  }

  if (typeof module !== "undefined" && module.exports) module.exports = { createShopCheckout };
  else window.createShopCheckout = createShopCheckout;
})();
