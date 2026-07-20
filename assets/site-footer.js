(function () {
  const scriptUrl = document.currentScript ? document.currentScript.src : "";
  const assetBase = scriptUrl ? new URL(".", scriptUrl).href : "/assets/";
  const iconBase = new URL("icons/", assetBase).href;

  const navLinks = [
    ["Home", "/"],
    ["About", "/about"],
    ["Releases", "/releases"],
    ["Contact", "/contact"]
  ];

  const supportLinks = [
    ["Privacy Policy", "/privacy-policy"],
    ["Terms of Use", "/terms-of-use"],
    ["Refund Policy", "/refund-policy"]
  ];

  const socials = [
    ["Spotify", "https://open.spotify.com/artist/49EQh2zGjwjO1vQxhXQbwg", `${iconBase}spotify.png`],
    ["YouTube", "https://www.youtube.com/@shivam.madaann", `${iconBase}youtube.svg`],
    ["Instagram", "https://www.instagram.com/Shivam_madaann", `${iconBase}instagram.svg`],
    ["Facebook", "https://www.facebook.com/shivammadaannn", `${iconBase}facebook.svg`]
  ];
  const badgeUrl = new URL("badge.png", assetBase).href;

  function installFooterStyles() {
    if (document.querySelector("style[data-site-footer-styles]")) {
      return;
    }

    const style = document.createElement("style");
    style.dataset.siteFooterStyles = "true";
    style.textContent = `
      .artist-footer {
        background: #000000;
        color: #ffffff;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        font-family: "Inter", Arial, sans-serif;
      }

      .artist-footer__shell {
        width: min(100%, 1180px);
        margin: 0 auto;
        padding: 48px 20px 30px;
      }

      .artist-footer__grid {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr 0.85fr;
        gap: 36px;
      }

      .artist-footer__brand {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin: 0;
        font-family: "Kalam", cursive;
        font-size: 2rem;
        font-weight: 700;
        line-height: 1;
      }

      .artist-footer__brand .name-badge {
        width: 22px;
        height: 22px;
        flex: 0 0 22px;
        object-fit: contain;
      }

      .artist-footer__copy {
        max-width: 380px;
        margin: 16px 0 0;
        color: #ffffff;
        font-size: 0.92rem;
        line-height: 1.75;
      }

      .artist-footer__contact,
      .artist-footer__links {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 11px;
      }

      .artist-footer__contact {
        margin-top: 20px;
      }

      .artist-footer__heading {
        margin: 0;
        color: #ffffff;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.16em;
        text-transform: uppercase;
      }

      .artist-footer__links {
        margin-top: 18px;
      }

      .footer-link {
        color: #ffffff;
        font-size: 0.92rem;
        font-weight: 700;
        text-decoration: none;
        transition: color 0.25s ease, transform 0.25s ease;
      }

      .footer-link:hover,
      .footer-link:focus-visible {
        color: #ffffff;
        transform: translateY(-1px);
        outline: none;
      }

      .artist-footer__bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
        margin-top: 40px;
        padding-top: 24px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .artist-footer__copyright {
        margin: 0;
        color: #ffffff;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .artist-footer__socials {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .footer-social {
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid rgba(255, 255, 255, 0.15);
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.05);
        transition: transform 0.25s ease, background 0.25s ease, border-color 0.25s ease;
      }

      .footer-social:hover,
      .footer-social:focus-visible {
        transform: translateY(-3px);
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(255, 255, 255, 0.35);
        outline: none;
      }

      .footer-icon {
        width: 20px;
        height: 20px;
        object-fit: contain;
      }

      .footer-icon--whatsapp {
        color: #ffffff;
      }

      @media (max-width: 760px) {
        .artist-footer__shell {
          padding: 42px 16px 28px;
        }

        .artist-footer__grid {
          grid-template-columns: 1fr;
          gap: 30px;
        }

        .artist-footer__bottom {
          flex-direction: column;
          align-items: flex-start;
        }

        .artist-footer__socials {
          flex-wrap: wrap;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function linksMarkup(links) {
    return links.map(([label, href]) => `<a class="footer-link" href="${href}">${label}</a>`).join("");
  }

  function socialMarkup() {
    const iconLinks = socials.map(([label, href, icon]) => `
      <a class="footer-social" href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}">
        <img class="footer-icon" src="${icon}" alt="" aria-hidden="true" />
      </a>
    `).join("");

    const whatsapp = `
      <a class="footer-social" href="https://wa.me/918445544920/" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
        <svg class="footer-icon footer-icon--whatsapp" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M20.52 3.48A11.86 11.86 0 0012.08 0C5.5 0 .16 5.34.16 11.92c0 2.1.55 4.15 1.6 5.95L0 24l6.28-1.64a11.9 11.9 0 005.8 1.48h.01C18.66 23.84 24 18.5 24 11.92c0-3.18-1.24-6.18-3.48-8.44zM12.09 21.82h-.01a9.86 9.86 0 01-5.03-1.38l-.36-.21-3.73.98 1-3.64-.24-.37a9.86 9.86 0 01-1.51-5.28c0-5.46 4.44-9.9 9.91-9.9a9.84 9.84 0 017 2.9 9.83 9.83 0 012.9 7c0 5.46-4.45 9.9-9.93 9.9zm5.43-7.42c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.39-1.47-.88-.78-1.48-1.75-1.65-2.05-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.87 1.22 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.27.5 1.7.64.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.3.17-1.42-.07-.13-.27-.2-.57-.35z"/>
        </svg>
      </a>
    `;

    return iconLinks + whatsapp;
  }

  function renderFooter() {
    installFooterStyles();

    const target = document.querySelector("[data-site-footer]") || document.querySelector("footer.site-footer");
    const footer = target || document.createElement("footer");
    footer.className = "artist-footer";
    footer.innerHTML = `
      <div class="artist-footer__shell">
        <div class="artist-footer__grid">
          <div>
            <h2 class="artist-footer__brand">
              <span>Shivam Madaan</span>
              <img class="name-badge" src="${badgeUrl}" alt="" aria-hidden="true" />
            </h2>
            <p class="artist-footer__copy">Official music, latest releases, updates, performances, and social links.</p>
            <div class="artist-footer__contact">
              <a class="footer-link" href="mailto:official@shivammadaan.com">official@shivammadaan.com</a>
              <a class="footer-link" href="tel:+918445544920">+91 84455 44920</a>
            </div>
          </div>

          <div>
            <h3 class="artist-footer__heading">Quick Links</h3>
            <div class="artist-footer__links">${linksMarkup(navLinks)}</div>
          </div>

          <div>
            <h3 class="artist-footer__heading">Support Links</h3>
            <div class="artist-footer__links">${linksMarkup(supportLinks)}</div>
          </div>
        </div>

        <div class="artist-footer__bottom">
          <p class="artist-footer__copyright">&copy; 2026 Shivam Madaan. All rights reserved.</p>
          <div class="artist-footer__socials">${socialMarkup()}</div>
        </div>
      </div>
    `;

    if (!target) {
      document.body.appendChild(footer);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderFooter, { once: true });
  } else {
    renderFooter();
  }
})();
