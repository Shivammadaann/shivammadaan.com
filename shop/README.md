# Music shop

The `/shop` page lists the two songs with separate digital-download and project
stems products at INR 99 each. Both formats use Razorpay Standard Checkout.

- `assets/shop-catalog.js` is shared by the browser and backend. The backend
  determines prices from its own copy of this catalog.
- `assets/shop-config.js` selects the API origin. Leave it empty for a site
  served by Render; set the actual Render origin for a GitHub Pages frontend.
- `assets/shop-checkout.js` handles checkout, cancellation, failure, verification,
  and retrying a pending verification without creating a second order.
- `assets/shop.js` renders products, Spotify previews, and payment status.
- Covers are local files in `assets/shop/`, retrieved from the original Spotify
  tracks' oEmbed metadata.

Credentials belong only in the backend environment. The public key ID is returned
by the order endpoint; the secret is never sent to the browser.

Payment verification is implemented. File delivery remains manual until paid
audio and stems are supplied and private download delivery is implemented.

See [the deployment and testing guide](../README.md).
