(function () {
  "use strict";

  const catalog = window.SHOP_CATALOG;
  const grid = document.getElementById("song-grid");
  const dialog = document.getElementById("purchase-dialog");
  if (!catalog || !grid || !dialog) return;

  const icons = {
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" /></svg>',
    stems: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16M2 9h6M9 15h6M16 8h6" /></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m7 4 14 8-14 8V4Z" /></svg>'
  };
  const productDescriptions = {
    download: "The finished song, yours to keep",
    stems: "Explore the individual audio layers"
  };
  const priceFormatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: catalog.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  let paymentStorage;
  try { paymentStorage = window.sessionStorage; } catch { /* Storage is optional. */ }
  const checkout = window.createShopCheckout({
    apiBaseUrl: window.SHOP_CONFIG?.apiBaseUrl || "",
    currency: catalog.currency,
    fetchRequest: window.fetch.bind(window),
    loadCheckout: () => window.Razorpay,
    storage: paymentStorage,
    onState(state) {
      const status = document.getElementById("payment-status");
      status.hidden = false;
      status.dataset.state = state.type;
      document.getElementById("payment-message").textContent = state.message;
      const reference = document.getElementById("payment-reference");
      reference.textContent = state.paymentId ? `Payment ID: ${state.paymentId}` : "";
      reference.hidden = !state.paymentId;
      const retry = document.getElementById("payment-retry");
      retry.hidden = !state.canRetry;
      retry.disabled = state.busy;
      const help = document.getElementById("payment-help");
      help.hidden = !state.paymentId;
      help.href = `mailto:${catalog.email}?subject=${encodeURIComponent("Shop payment and file delivery")}&body=${encodeURIComponent(`Hi Shivam, please help with my purchase.\n\nPayment ID: ${state.paymentId}`)}`;
      grid.querySelectorAll(".product-action").forEach((button) => { button.disabled = state.blocked; });
      if (!state.busy && ["success", "pending", "error", "cancelled"].includes(state.type)) {
        status.focus({ preventScroll: false });
      }
    }
  });
  document.getElementById("payment-retry").addEventListener("click", () => checkout.retryVerification());

  function openPurchase(song, product) {
    document.getElementById("purchase-artwork").src = song.artwork;
    document.getElementById("purchase-song").textContent = song.title;
    document.getElementById("purchase-version").textContent = song.version;
    const hasPrice = typeof product.price === "number" && Number.isFinite(product.price) && product.price > 0;
    const price = hasPrice ? priceFormatter.format(product.price) : null;
    document.getElementById("purchase-format").textContent = price ? `${product.label} · ${price}` : product.label;
    document.getElementById("purchase-description").textContent = price
      ? `Your selected product is ${price}. Confirm availability, included files, and payment and delivery details directly before you buy.`
      : "Enquire directly about pricing, availability, and the files included. Payment and delivery details will be confirmed before you buy.";
    const songName = `${song.title} — ${song.version}`;
    const message = `Hi Shivam, I would like to purchase:\n\nSong: ${songName}\nProduct: ${product.label}${price ? `\nListed price: ${price}` : ""}\n\nPlease confirm ${price ? "" : "pricing, "}availability, included file formats, and payment and delivery details. Thank you!`;
    document.getElementById("purchase-whatsapp").href = `https://wa.me/${catalog.whatsapp}?text=${encodeURIComponent(message)}`;
    document.getElementById("purchase-email").href = `mailto:${catalog.email}?subject=${encodeURIComponent(`Purchase enquiry: ${songName} (${product.label})`)}&body=${encodeURIComponent(message)}`;
    dialog.showModal();
  }

  function renderProduct(song, product) {
    const row = element("div", "product-row");
    row.dataset.productType = product.type;
    const info = element("div", "product-info");
    info.innerHTML = icons[product.type] || icons.download;
    const copy = element("div");
    copy.append(element("h4", "", product.label));
    const hasPrice = typeof product.price === "number" && Number.isFinite(product.price) && product.price > 0;
    copy.append(element("p", hasPrice ? "product-price" : "", hasPrice ? priceFormatter.format(product.price) : productDescriptions[product.type]));
    info.append(copy);

    const action = element("button", `button ${product.type === "download" ? "button-primary" : "button-secondary"} product-action`, "Buy now ↗");
    action.setAttribute("aria-label", `Buy ${product.label.toLowerCase()} for ${song.title} — ${song.version}`);
    action.type = "button";
    action.disabled = checkout.isBlocked();
    action.addEventListener("click", () => checkout.buy(song, product));
    row.append(info, action);
    return row;
  }

  function renderSong(song, index) {
    const card = element("article", "song-card");
    card.dataset.songId = song.id;
    const art = element("div", "song-art");
    art.style.setProperty("--artwork", `url("${song.artwork}")`);
    const image = element("img");
    image.src = song.artwork;
    image.alt = `${song.title} — ${song.version} cover artwork`;
    image.width = 300;
    image.height = 300;
    image.loading = "lazy";
    art.append(element("span", "song-number", `0${index + 1} / SHIVAM MADAAN`), image);

    const content = element("div", "song-content");
    const heading = element("div", "song-heading");
    const title = element("div");
    title.append(element("h3", "", song.title), element("p", "song-version", song.version));
    const preview = element("button", "preview-button");
    preview.type = "button";
    preview.innerHTML = icons.play + "<span>Listen</span>";
    preview.setAttribute("aria-expanded", "false");
    preview.setAttribute("aria-controls", `preview-${song.id}`);
    preview.setAttribute("aria-label", `Listen to ${song.title} — ${song.version}`);
    const panel = element("div", "preview-panel");
    panel.id = `preview-${song.id}`;
    panel.hidden = true;
    preview.addEventListener("click", () => {
      const willOpen = panel.hidden;
      // Removing hidden players stops any playback when a preview is closed.
      grid.querySelectorAll(".preview-panel").forEach((other) => {
        other.hidden = true;
        other.replaceChildren();
      });
      grid.querySelectorAll(".preview-button").forEach((button) => button.setAttribute("aria-expanded", "false"));
      if (willOpen) {
        const frame = element("iframe");
        frame.src = `https://open.spotify.com/embed/track/${song.spotifyId}?utm_source=generator&theme=0`;
        frame.title = `Listen to ${song.title} — ${song.version} on Spotify`;
        frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
        frame.allowFullscreen = true;
        const fallback = element("a", "", "Open in Spotify ↗");
        fallback.href = `https://open.spotify.com/track/${song.spotifyId}`;
        fallback.target = "_blank";
        fallback.rel = "noopener noreferrer";
        panel.append(frame, fallback);
        panel.hidden = false;
        preview.setAttribute("aria-expanded", "true");
      }
    });
    heading.append(title, preview);
    const products = element("div", "product-list");
    song.products.forEach((product) => products.append(renderProduct(song, product)));
    const enquiry = element("button", "song-enquiry", "Questions about this song? Get in touch ↗");
    enquiry.type = "button";
    enquiry.addEventListener("click", () => openPurchase(song, song.products[0]));
    content.append(heading, panel, products, enquiry);
    card.append(art, content);
    return card;
  }

  catalog.songs.forEach((song, index) => grid.append(renderSong(song, index)));
  document.getElementById("catalog-toolbar").hidden = false;
  document.getElementById("catalog-count").textContent = `${catalog.songs.length} songs · 2 ways to make them yours`;

  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      const type = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach((filter) => {
        filter.setAttribute("aria-pressed", String(filter === button));
      });
      grid.querySelectorAll("[data-product-type]").forEach((row) => {
        row.hidden = type !== "all" && row.dataset.productType !== type;
      });
      let visibleSongs = 0;
      grid.querySelectorAll(".song-card").forEach((card) => {
        card.hidden = !Array.from(card.querySelectorAll("[data-product-type]")).some((row) => !row.hidden);
        if (!card.hidden) visibleSongs += 1;
      });
      const label = type === "all" ? "2 ways to make them yours" : type === "download" ? "Digital downloads" : "Project stems";
      document.getElementById("catalog-count").textContent = `${visibleSongs} ${visibleSongs === 1 ? "song" : "songs"} · ${label}`;
    });
  });

  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
})();
