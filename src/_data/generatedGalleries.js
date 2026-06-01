import legacyMedia from "./legacyMedia.js";

function slugify(input) {
  return String(input || "")
    .replace(/ä/gi, "ae")
    .replace(/ö/gi, "oe")
    .replace(/ü/gi, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const aboutGallery = {
  slug: "ueber-christoph",
  title: "Über Christoph in Bildern",
  summary: "Bildgalerie aus dem bisherigen Profilbereich.",
  images: legacyMedia.aboutGallery
};

const pressGallery = {
  slug: "presse",
  title: "Presse",
  summary: "Presseausschnitte und veröffentlichte Beiträge aus dem bisherigen Auftritt.",
  images: legacyMedia.press
};

const artGalleries = legacyMedia.artProjects.map((project) => ({
  slug: `kunst-${slugify(project.title)}`,
  title: project.title,
  summary: `Künstlerisches Projekt: ${project.title}.`,
  images: project.images
}));

export default [
  aboutGallery,
  pressGallery,
  ...artGalleries
];
