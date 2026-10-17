# Music shop

The `/shop` route is a static page, matching the rest of this GitHub Pages site.
Song covers are stored locally in `assets/shop/` and the catalog lives in
`assets/shop-catalog.js`.

Each song has separate `download` and `stems` products, each priced at INR 99.
Until payment links are supplied, **Enquire to buy** opens a dialog with email
and WhatsApp links prefilled with the selected song, version, product, and
listed price. Opening the dialog does not send a message or place an order.

To enable a product's **Buy now** link:

1. Create a product with a payment provider that supports digital file delivery,
   and upload the purchased files through that provider.
2. Set `price` to the amount in major currency units in the catalog. Currency
   defaults to `INR`; update `currency` if needed.
3. Set that product's `checkoutUrl` to its public HTTPS checkout link.
4. Update the shop's purchase note, FAQ, and description to match the provider's
   actual checkout and delivery process once all products are connected.

Each product needs its own checkout link so the song and format cannot be
confused. Paid audio and stems are delivered by the payment provider, rather
than being placed in this public site repository. This page does not process
payments, verify orders, or grant file access itself.

Artwork was retrieved from the existing Spotify tracks' oEmbed metadata.
