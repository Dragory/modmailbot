// Initialize i18next for translations
const fs = require("fs");
const path = require("path");
const i18next = require("i18next")
const Backend = require("i18next-fs-backend")

i18next
  .use(Backend)
  .init({
    initImmediate: false,
    lng: "fr",
    fallbackLng: "en",
    preload: ["en", "fr"],
    ns: ["translation"],
    defaultNS: "translation",
    backend: {
      loadPath: "locales/{{lng}}/{{ns}}.json"
    }
  })

module.exports = i18next;
