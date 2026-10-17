// Shared by the browser and Node backend. Prices are in major currency units;
// the server reads this catalog directly rather than trusting a browser amount.
const catalog = {
  currency: "INR",
  email: "official@shivammadaan.com",
  whatsapp: "918445544920",
  songs: [
    {
      id: "the-night-we-met",
      title: "The Night We Met",
      version: "Acoustic Instrumental",
      artwork: "/assets/shop/the-night-we-met.jpg",
      spotifyId: "05J1czArtu71FxK7RnXxHY",
      products: [
        { type: "download", label: "Digital download", price: 99 },
        { type: "stems", label: "Project stems", price: 99 }
      ]
    },
    {
      id: "mann-bharrya",
      title: "Mann Bharrya",
      version: "Unplugged Version",
      artwork: "/assets/shop/mann-bharrya.jpg",
      spotifyId: "2bvi3R68LT1OlhdqVyw2Q5",
      products: [
        { type: "download", label: "Digital download", price: 99 },
        { type: "stems", label: "Project stems", price: 99 }
      ]
    }
  ]
};
if (typeof module !== "undefined" && module.exports) {
  module.exports = catalog;
} else {
  window.SHOP_CATALOG = catalog;
}
