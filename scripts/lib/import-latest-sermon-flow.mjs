function isAffirmative(answer) {
  return /^(?:y|yes|j|ja)$/i.test(String(answer).trim());
}

export function hasMissingMediaOptions(overrides) {
  return !overrides?.image || !overrides?.audio;
}

export function shouldAbortForMissingMedia(answer) {
  return isAffirmative(answer);
}

export function shouldRunFollowUp(answer) {
  return isAffirmative(answer);
}
