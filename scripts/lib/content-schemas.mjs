function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isBoolean(value) {
  return typeof value === "boolean";
}

function isDateLike(value) {
  return value instanceof Date || isNonEmptyString(value);
}

function isArray(value) {
  return Array.isArray(value);
}

function isRelativePath(value) {
  return isNonEmptyString(value) && !value.startsWith("/") && !/^[a-z]+:\/\//i.test(value);
}

function validateStringArray(file, field, value, errors) {
  if (!isArray(value)) {
    errors.push(`${file}: ${field} must be an array`);
    return;
  }
  for (const entry of value) {
    if (!isNonEmptyString(entry)) {
      errors.push(`${file}: ${field} entries must be non-empty strings`);
    }
  }
}

function validateAssetField(file, field, value, errors) {
  if (value === undefined || value === null) return;
  if (!isRelativePath(value)) {
    errors.push(`${file}: ${field} must be a relative file path`);
  }
}

function validateObjectArray(file, field, value, requiredKeys, errors) {
  if (!isArray(value)) {
    errors.push(`${file}: ${field} must be an array`);
    return;
  }
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${file}: ${field}[${index}] must be an object`);
      continue;
    }
    for (const key of requiredKeys) {
      if (!isNonEmptyString(entry[key])) {
        errors.push(`${file}: ${field}[${index}].${key} is required`);
      }
    }
  }
}

function validateOptionalString(file, field, value, errors) {
  if (value === undefined || value === null) return;
  if (!isNonEmptyString(value)) {
    errors.push(`${file}: ${field} must be a non-empty string when provided`);
  }
}

function validateSourcesField(file, value, errors) {
  if (!isArray(value)) {
    errors.push(`${file}: sources must be an array`);
    return;
  }
  for (const [index, entry] of value.entries()) {
    if (isNonEmptyString(entry)) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${file}: sources[${index}] must be a string or object`);
      continue;
    }
    if (!isNonEmptyString(entry.title)) {
      errors.push(`${file}: sources[${index}].title is required`);
    }
    if ("url" in entry && entry.url !== null && !isNonEmptyString(entry.url)) {
      errors.push(`${file}: sources[${index}].url must be a non-empty string when provided`);
    }
    if ("note" in entry && entry.note !== null && !isNonEmptyString(entry.note)) {
      errors.push(`${file}: sources[${index}].note must be a non-empty string when provided`);
    }
  }
}

function validateGalleryMediaField(file, value, errors) {
  if (!isArray(value)) {
    errors.push(`${file}: gallery_images must be an array`);
    return;
  }
  for (const [index, entry] of value.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      errors.push(`${file}: gallery_images[${index}] must be an object`);
      continue;
    }
    const hasSrc = isNonEmptyString(entry.src);
    const hasYoutube = isNonEmptyString(entry.youtube);
    if (!hasSrc && !hasYoutube) {
      errors.push(`${file}: gallery_images[${index}] must define src or youtube`);
      continue;
    }
    if (hasSrc && hasYoutube) {
      errors.push(`${file}: gallery_images[${index}] must not define both src and youtube`);
    }
    if (hasSrc && !isRelativePath(entry.src) && !/^[a-z]+:\/\//i.test(entry.src) && !entry.src.startsWith("/")) {
      errors.push(`${file}: gallery_images[${index}].src must be a relative path, absolute path, or URL`);
    }
    if (hasSrc && !/\.pdf$/i.test(entry.src) && !isNonEmptyString(entry.alt)) {
      errors.push(`${file}: gallery_images[${index}].alt is required for non-PDF images`);
    }
    if (hasYoutube && !isNonEmptyString(entry.title)) {
      errors.push(`${file}: gallery_images[${index}].title is required for youtube embeds`);
    }
    if ("caption" in entry && entry.caption !== null && !isNonEmptyString(entry.caption)) {
      errors.push(`${file}: gallery_images[${index}].caption must be a non-empty string when provided`);
    }
  }
}

const commonOptionalBooleans = ["listed", "index", "federate", "draft"];

function validateCommonBooleans(file, data, errors) {
  for (const field of commonOptionalBooleans) {
    if (field in data && !isBoolean(data[field])) {
      errors.push(`${file}: ${field} must be boolean`);
    }
  }
}

export const schemas = {
  sermon(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if (!isNonEmptyString(data.slug)) errors.push(`${file}: slug is required`);
    if (data.cover !== undefined) validateAssetField(file, "cover", data.cover, errors);
    if (data.audio !== undefined) validateAssetField(file, "audio", data.audio, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
    if ("events" in data) validateObjectArray(file, "events", data.events, [], errors);
    if ("sources" in data) validateSourcesField(file, data.sources, errors);
    validateOptionalString(file, "additional_license_info", data.additional_license_info, errors);
  },
  post(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
    if ("galleries" in data) validateStringArray(file, "galleries", data.galleries, errors);
    if ("gallery_images" in data) validateGalleryMediaField(file, data.gallery_images, errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
    if ("sources" in data) validateSourcesField(file, data.sources, errors);
    validateOptionalString(file, "additional_license_info", data.additional_license_info, errors);
  },
  material(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if ("downloads" in data) validateObjectArray(file, "downloads", data.downloads, ["title", "file"], errors);
    if ("galleries" in data) validateStringArray(file, "galleries", data.galleries, errors);
    if ("gallery_images" in data) validateGalleryMediaField(file, data.gallery_images, errors);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
    if ("sources" in data) validateSourcesField(file, data.sources, errors);
    validateOptionalString(file, "additional_license_info", data.additional_license_info, errors);
  },
  gallery(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    validateObjectArray(file, "images", data.images, ["file", "alt"], errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
  },
  project(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if ("technologies" in data) validateStringArray(file, "technologies", data.technologies, errors);
    if ("screenshots" in data) validateObjectArray(file, "screenshots", data.screenshots, ["file", "alt"], errors);
    if ("gallery_images" in data) validateGalleryMediaField(file, data.gallery_images, errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
    if ("sources" in data) validateSourcesField(file, data.sources, errors);
    validateOptionalString(file, "additional_license_info", data.additional_license_info, errors);
  },
  podcast(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    const normalized = file.replace(/\\/g, "/");
    const isEpisode = /\/src\/content\/podcasts\/[^/]+\/[^/]+\/index\.md$/.test(normalized);
    const isSeries = /\/src\/content\/podcasts\/[^/]+\/index\.md$/.test(normalized);
    if (isEpisode) {
      if (!isNonEmptyString(data.audio)) errors.push(`${file}: audio is required`);
      validateAssetField(file, "audio", data.audio, errors);
    }
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
    if ("gallery_images" in data) validateGalleryMediaField(file, data.gallery_images, errors);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
    if ("subtitle" in data && data.subtitle !== null && !isNonEmptyString(data.subtitle)) errors.push(`${file}: subtitle must be a non-empty string when provided`);
    if ("audio_duration" in data && data.audio_duration !== null && !isNonEmptyString(data.audio_duration)) errors.push(`${file}: audio_duration must be a non-empty string when provided`);
    if ("episode_number" in data && !(Number.isInteger(data.episode_number) && data.episode_number > 0)) errors.push(`${file}: episode_number must be a positive integer when provided`);
    if ("season_number" in data && !(Number.isInteger(data.season_number) && data.season_number > 0)) errors.push(`${file}: season_number must be a positive integer when provided`);
    if (isSeries && "podcast_categories" in data) validateStringArray(file, "podcast_categories", data.podcast_categories, errors);
    if ("sources" in data) validateSourcesField(file, data.sources, errors);
    validateOptionalString(file, "additional_license_info", data.additional_license_info, errors);
  },
  page(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if ("summary" in data && data.summary !== null && !isNonEmptyString(data.summary)) {
      errors.push(`${file}: summary must be a non-empty string when provided`);
    }
  }
};

export function detectSchemaType(file) {
  const normalized = file.replace(/\\/g, "/");
  if (normalized.includes("/sermons/")) return "sermon";
  if (normalized.includes("/posts/")) return "post";
  if (normalized.includes("/materials/")) return "material";
  if (normalized.includes("/galleries/")) return "gallery";
  if (normalized.includes("/projects/")) return "project";
  if (normalized.includes("/podcasts/")) return "podcast";
  if (normalized.includes("/pages/")) return "page";
  return null;
}
