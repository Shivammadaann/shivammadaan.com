// Prices are in major currency units. Add each product's hosted checkout URL
// when ready. The payment provider must handle payment and digital-file delivery.
// Products without a checkout URL accept purchase enquiries at the listed price.
window.SHOP_CATALOG = {
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
        { type: "download", label: "Digital download", price: 99, checkoutUrl: "" },
        { type: "stems", label: "Project stems", price: 99, checkoutUrl: "" }
      ]
    },
    {
      id: "mann-bharrya",
      title: "Mann Bharrya",
      version: "Unplugged Version",
      artwork: "/assets/shop/mann-bharrya.jpg",
      spotifyId: "2bvi3R68LT1OlhdqVyw2Q5",
      products: [
        { type: "download", label: "Digital download", price: 99, checkoutUrl: "" },
        { type: "stems", label: "Project stems", price: 99, checkoutUrl: "" }
      ]
    }
  ]
};
