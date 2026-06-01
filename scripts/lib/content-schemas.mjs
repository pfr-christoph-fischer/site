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
  },
  post(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
    if ("galleries" in data) validateStringArray(file, "galleries", data.galleries, errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
  },
  material(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if ("downloads" in data) validateObjectArray(file, "downloads", data.downloads, ["title", "file"], errors);
    if ("galleries" in data) validateStringArray(file, "galleries", data.galleries, errors);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
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
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
  },
  podcast(file, data, errors) {
    validateCommonBooleans(file, data, errors);
    if (!isNonEmptyString(data.title)) errors.push(`${file}: title is required`);
    if (!isNonEmptyString(data.summary)) errors.push(`${file}: summary is required`);
    if (!isDateLike(data.date)) errors.push(`${file}: date is required`);
    if (!isNonEmptyString(data.audio)) errors.push(`${file}: audio is required`);
    validateAssetField(file, "audio", data.audio, errors);
    if ("cover" in data) validateAssetField(file, "cover", data.cover, errors);
    if ("cover" in data && !isNonEmptyString(data.cover_alt)) errors.push(`${file}: cover_alt is required when cover is set`);
    if ("tags" in data) validateStringArray(file, "tags", data.tags, errors);
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
