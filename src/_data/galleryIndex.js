import generatedGalleries from "./generatedGalleries.js";

export default Object.fromEntries(
  generatedGalleries.map((gallery) => [gallery.slug, gallery])
);
