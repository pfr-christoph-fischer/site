import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "..");
const legacyPublic = path.join(repoRoot, "current", "public");
const meRoot = path.join(legacyPublic, "img", "me");

function toPublicUrl(filePath) {
  return filePath.replace(legacyPublic, "").split(path.sep).join("/");
}

function listImageFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((entry) => fs.statSync(path.join(dirPath, entry)).isFile() && /\.(png|jpe?g|webp|pdf)$/i.test(entry))
    .sort((a, b) => a.localeCompare(b, "de"));
}

function listDirectories(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((entry) => fs.statSync(path.join(dirPath, entry)).isDirectory())
    .sort((a, b) => a.localeCompare(b, "de"));
}

const artProjectDescriptions = {
  "2014 Kunstausstellung": "Mehrfach habe ich Ausstellungen organisiert, bei denen jeder aus der Gemeinde selbstgefertigte Kunst zur Schau stellen konnte.",
  "2017 Ostergarten": "Mehrere Jahre lang war ich Initiator und verantwortlicher Leiter des Ostergartens in Freudenstadt.",
  "2019 Josefs Modenschau": "Für den Religionsunterricht habe ich eine Reihe von Gewändern kreiert, die Josef in verschiedenen Stadien seiner Geschichte zeigen.",
  "2019 Lichternacht": "Bunte Lichtinstallation zur Illumination der Peterskirche bei der Lichternacht des Handels- und Gewerbevereins.",
  "2019 Osterkerze": "Als Symbol der Auferstehung habe ich aus den Trümmerstücken alter Kerzen eine neue Osterkerze für 2019 gegossen.",
  "2020 KonfiTüre": "Aufgrund der Corona-Pandemie musste die Konfirmation 2020 auf unbestimmte Zeit verschoben werden. Als kleinen Trost bekamen meine Konfis eine ganz spezielle KONFItüre.",
  "2020 Kreuzweg": "Mitten in der Coronazeit gestaltete ich gemeinsam mit Felix Sontheim einen Kreuzweg am Braunhardsberg. Die Bilder dazu trugen verschiedene Künstler:innen aus Tailfingen im Rahmen einer Challenge bei.",
  "2020 Osterstrauß": "Während der Ausgangssperre war die geöffnete Peterskirche einer der wenigen Orte, an denen Menschen in Tailfingen zu Gebet und Stille kommen konnten. Zu Ostern haben wir dort einen bunten Osterstrauß gestaltet, zu dem jede Person etwas beitragen konnte.",
  "2020 Tauben zu Pfingsten": "Zu Pfingsten 2020 haben viele unterschiedliche Beteiligte mit von mir gefertigten Schablonen Tauben auf die Gehwege im Wohngebiet Langenwand gesprüht. Zum Einsatz kam selbst hergestellte, umweltfreundliche und wasserlösliche Sprühkreide.",
  "2021 Kreuzweg": "Nach dem Erfolg von 2020 habe ich 2021 zum zweiten Mal einen Kreuzweg mit lokalen Künstler:innen initiiert. Ein Bild wurde später Opfer von Vandalismus und nach der Restaurierung selbst zu einem besonderen Sinnbild des Leidens Jesu.",
  "2021 Tauben zu Pfingsten": "Zu Pfingsten 2021 haben ganz viele Menschen aus Tailfingen Tauben gefaltet, die sich dann als Schwarm vom Kreuz in der Peterskirche her ausbreiteten.",
  "2023 Bibelhaus": "Für meine biblischen Erzählfiguren, die ich in der Grundschule verwende, habe ich ein entsprechend großes Haus aus der Zeit Jesu nachgebaut."
};

function normalizeCaption(fileName) {
  return fileName
    .replace(path.extname(fileName), "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parsePressEntry(fileName) {
  const base = fileName.replace(path.extname(fileName), "");
  const dateChunk = base.slice(0, 8);
  const rest = base.slice(8).trim();
  if (!/^\d{8}$/.test(dateChunk)) {
    return {
      title: base,
      publication: "",
      article: base,
      page: "",
      dateIso: null,
      sort: base
    };
  }

  const parts = rest.split(/\s+/).filter(Boolean);
  let publication = "";
  let article = "";
  let page = "";

  for (const part of parts) {
    if (/^\d/.test(part) && !page) {
      page = part;
      continue;
    }
    if (!page) {
      publication = `${publication} ${part}`.trim();
    } else {
      article = `${article} ${part}`.trim();
    }
  }

  const publicationMap = [
    [/^Schwabo(?:\s+ALB|\s+Albstadt)?$/i, "Schwarzwälder Bote"],
    [/^SWP ZA$/i, "Südwest Presse Zollernalbkreis"],
    [/^ZAK$/i, "Zollern-Alb-Kurier"],
    [/^FDS$/i, "Freudenstadt"],
    [/^ALB$/i, "Albstadt"],
    [/^NC$/i, "Neckar-Chronik"],
    [/^GB$/i, "Gäubote"],
    [/^KRZBB$/i, "Kreiszeitung/Böblinger Bote"],
    [/^EvGemBl$/i, "Evangelisches Gemeindeblatt"],
    [/^MB Gäufelden$/i, "Mitteilungsblatt Gäufelden"]
  ];

  for (const [pattern, replacement] of publicationMap) {
    if (pattern.test(publication)) {
      publication = publication.replace(pattern, replacement);
      break;
    }
  }

  article = article
    .replace(/[„“»«]/g, "\"")
    .replace(/_-/g, ":")
    .replace(/__/g, "?")
    .replace(/_/g, "\"")
    .trim();

  const dateLabel = `${dateChunk.slice(6, 8)}.${dateChunk.slice(4, 6)}.${dateChunk.slice(0, 4)}`;
  const title = `${article ? `"${article}", ` : ""}${publication}${page ? `, S.${page}` : ""}${publication || page ? ", " : ""}${dateLabel}`;

  return {
    title,
    publication,
    article,
    page,
    dateIso: `${dateChunk.slice(0, 4)}-${dateChunk.slice(4, 6)}-${dateChunk.slice(6, 8)}`,
    sort: dateChunk
  };
}

function buildArtProjects() {
  const artRoot = path.join(meRoot, "art");
  const allKeys = new Set([
    ...Object.keys(artProjectDescriptions),
    ...listDirectories(artRoot)
  ]);

  return [...allKeys].sort((a, b) => b.localeCompare(a, "de")).map((directoryName) => {
    const dirPath = path.join(artRoot, directoryName);
    const hasFolder = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    return {
      slug: directoryName
        .toLowerCase()
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, ""),
      title: directoryName,
      description: artProjectDescriptions[directoryName] || "",
      images: hasFolder ? listImageFiles(dirPath).map((fileName) => ({
        src: toPublicUrl(path.join(dirPath, fileName)),
        alt: `${directoryName}: ${normalizeCaption(fileName)}`,
        title: normalizeCaption(fileName)
      })) : [],
      hasArchive: hasFolder
    };
  });
}

const officialRoot = path.join(meRoot, "official");
const mePicsRoot = path.join(meRoot, "me-pics");
const pressRoot = path.join(meRoot, "press");
const portraits = listImageFiles(officialRoot);

export default {
  portrait: portraits[0] ? toPublicUrl(path.join(officialRoot, portraits[0])) : null,
  aboutGallery: listImageFiles(mePicsRoot).map((fileName) => ({
    src: toPublicUrl(path.join(mePicsRoot, fileName)),
    alt: `Christoph Fischer: ${normalizeCaption(fileName)}`,
    title: normalizeCaption(fileName)
  })),
  press: listImageFiles(pressRoot)
    .map((fileName) => {
      const parsed = parsePressEntry(fileName);
      return {
        src: toPublicUrl(path.join(pressRoot, fileName)),
        alt: `Presseausschnitt: ${parsed.title}`,
        title: parsed.title,
        caption: [parsed.publication, parsed.article, parsed.page ? `Seite ${parsed.page}` : null, parsed.dateIso].filter(Boolean).join(" · "),
        date: parsed.dateIso,
        publication: parsed.publication,
        article: parsed.article,
        page: parsed.page,
        sort: parsed.sort,
        kind: path.extname(fileName).toLowerCase() === ".pdf" ? "pdf" : "press"
      };
    })
    .sort((a, b) => String(b.sort).localeCompare(String(a.sort), "de")),
  artProjects: buildArtProjects()
};
