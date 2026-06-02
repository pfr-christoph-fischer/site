export default {
  year: new Date().getFullYear(),
  overview: [
    { label: "Startseite", url: "/" },
    { label: "Predigten", url: "/predigten/" },
    { label: "Live", url: "/live/" },
    { label: "Podcasts", url: "/podcasts/" },
    { label: "Open Source", url: "/open-source/" }
  ],
  social: [
    { label: "Facebook", url: "https://www.facebook.com/christoph.fischer", rel: "me" },
    { label: "Instagram", url: "https://www.instagram.com/pfarrer.christoph", rel: "me" },
    { label: "Mastodon", url: "https://kirche.social/@christoph", rel: "me" },
    { label: "Spotify", url: "https://open.spotify.com/show/0N42Mwfq7xXTPQrD4HrRBp", rel: "me" },
    { label: "Pixelfed", url: "https://pixelfed.de/@pfr.christoph", rel: "me" }
  ],
  dev: [
    { label: "GitHub", url: "https://www.github.com/potofcoffee", rel: "me" },
    { label: "Codeberg", url: "https://www.codeberg.org/peregrinus", rel: "me" },
    { label: "Pfarrplaner", url: "https://www.pfarrplaner.de/" }
  ],
  school: [
    { label: "Material", url: "/material/schule/" }
  ],
  christoph: [
    { label: "Über Christoph", url: "/ueber-mich/" },
    { label: "Vita", url: "/vita/" },
    { label: "Presse", url: "/presse/" },
    { label: "Kunstprojekte", url: "/kunstprojekte/" },
    { label: "Kontakt", url: "/gefunden/" }
  ],
  legal: [
    { label: "Impressum", url: "/impressum/" },
    { label: "Datenschutz", url: "/datenschutz/" }
  ]
};
