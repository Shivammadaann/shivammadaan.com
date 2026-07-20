(function () {
  const GA_MEASUREMENT_ID = "G-E5VL2CDSG7";
  const GTM_CONTAINER_ID = "GTM-NF3HQMRN";
  const DEFAULT_FAVICON = "/favicon.png";

  const SITE_URL = "https://shivammadaan.com";
  const PERSON_ID = `${SITE_URL}/#person`;
  const WEBSITE_ID = `${SITE_URL}/#website`;

  // Keep every reference to the artist pointed at this one canonical entity.
  // This makes the official site, profile pages, and verified music/social
  // profiles easier for crawlers to reconcile as the same person.
  const person = {
    "@type": "Person",
    "@id": PERSON_ID,
    "name": "Shivam Madaan",
    "alternateName": [
      "Shivam Madaann",
      "Shivam_madaann"
    ],
    "url": SITE_URL,
    "mainEntityOfPage": {
      "@id": `${SITE_URL}/#webpage`
    },
    "image": {
      "@type": "ImageObject",
      "url": "https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=1024,h=573,fit=crop/fWR5aN6vjn1lOD1h/451541701_2282823998716557_4147927507148549891_n-7nhr78O2aFiuOi2R.png"
    },
    "sameAs": [
      "https://www.youtube.com/@Shivam.Madaann",
      "https://www.facebook.com/shivammadaannn",
      "https://open.spotify.com/artist/49EQh2zGjwjO1vQxhXQbwg",
      "https://music.apple.com/us/artist/shivam-madaan/1819794229",
      "https://www.linkedin.com/in/shivammadaann",
      "https://www.instagram.com/shivam_madaann",
      "https://www.wikidata.org/wiki/Q138820934"
    ],
    "identifier": {
      "@type": "PropertyValue",
      "propertyID": "Wikidata",
      "value": "Q138820934"
    },
    "jobTitle": "Singer-Songwriter",
    "hasOccupation": {
      "@type": "Occupation",
      "name": "Singer-Songwriter"
    },
    "nationality": {
      "@type": "Country",
      "name": "India"
    },
    "homeLocation": {
      "@type": "Place",
      "name": "Delhi, India"
    },
    "email": "official@shivammadaan.com",
    "telephone": "+91-84455-44920",
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "artist enquiries",
      "email": "official@shivammadaan.com",
      "telephone": "+91-84455-44920"
    },
    "knowsAbout": [
      "Singing",
      "Songwriting",
      "Fingerstyle Guitar",
      "Music Production",
      "Mixing and Mastering",
      "Indie Pop Music"
    ],
    "description": "Shivam Madaan is an Indian singer-songwriter, multi-instrumentalist, music producer, and mix/master engineer from Delhi, India, known for fingerstyle guitar and indie-pop releases.",
    "disambiguatingDescription": "Indian singer-songwriter and music producer from Delhi, India."
  };

  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  window.gtag = window.gtag || gtag;

  function appendScriptOnce(src, marker) {
    if (document.querySelector(`script[data-site-integration="${marker}"]`)) {
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    script.dataset.siteIntegration = marker;
    document.head.appendChild(script);
  }

  function installGoogleAnalytics() {
    appendScriptOnce(`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`, "ga4");
    window.gtag("js", new Date());
    window.gtag("config", GA_MEASUREMENT_ID, {
      page_path: window.location.pathname + window.location.search,
      page_title: document.title
    });
  }

  function installGoogleTagManager() {
    if (window.__shivamGtmLoaded) {
      return;
    }

    window.__shivamGtmLoaded = true;
    window.dataLayer.push({
      "gtm.start": new Date().getTime(),
      event: "gtm.js"
    });

    appendScriptOnce(`https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`, "gtm");
  }

  function installPersonSchema() {
    if (document.querySelector('script[type="application/ld+json"][data-site-schema="person"]')) {
      return;
    }

    const canonicalPath = window.location.pathname === "/" ? "/" : window.location.pathname.replace(/\/$/, "");
    const pageUrl = `${SITE_URL}${canonicalPath}`;
    const isArtistProfile = canonicalPath === "/" || canonicalPath === "/about";
    const page = {
      "@type": isArtistProfile ? "ProfilePage" : "WebPage",
      "@id": `${pageUrl}#webpage`,
      "url": pageUrl,
      "name": document.title,
      "isPartOf": { "@id": WEBSITE_ID },
      "about": { "@id": PERSON_ID }
    };

    if (isArtistProfile) {
      page.mainEntity = { "@id": PERSON_ID };
    }

    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          "@id": WEBSITE_ID,
          "url": SITE_URL,
          "name": "Shivam Madaan",
          "publisher": { "@id": PERSON_ID }
        },
        page,
        person
      ]
    };

    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.siteSchema = "person";
    schema.textContent = JSON.stringify(schemaData);
    document.head.appendChild(schema);
  }

  function installDefaultFavicon() {
    if (document.querySelector('link[rel~="icon"]')) {
      return;
    }

    const favicon = document.createElement("link");
    favicon.rel = "icon";
    favicon.type = "image/png";
    favicon.href = DEFAULT_FAVICON;
    document.head.appendChild(favicon);
  }

  installGoogleTagManager();
  installGoogleAnalytics();
  installPersonSchema();
  installDefaultFavicon();
})();
