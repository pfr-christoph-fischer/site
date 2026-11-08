import test from "node:test";
import assert from "node:assert/strict";
import {
  hasMissingMediaOptions,
  shouldAbortForMissingMedia,
  shouldRunFollowUp
} from "../scripts/lib/import-latest-sermon-flow.mjs";

test("detects when either local media option is missing", () => {
  assert.equal(hasMissingMediaOptions({ image: "/tmp/title.jpg", audio: "/tmp/sermon.mp3" }), false);
  assert.equal(hasMissingMediaOptions({ image: null, audio: "/tmp/sermon.mp3" }), true);
  assert.equal(hasMissingMediaOptions({ image: "/tmp/title.jpg", audio: null }), true);
});

test("recognizes affirmative answers for abort and follow-up prompts", () => {
  for (const answer of ["y", "Y", " yes ", "JA", "j"]) {
    assert.equal(shouldAbortForMissingMedia(answer), true);
    assert.equal(shouldRunFollowUp(answer), true);
  }
});

test("treats other answers as continuing or declining", () => {
  for (const answer of ["", "n", "nein", "no", "maybe"]) {
    assert.equal(shouldAbortForMissingMedia(answer), false);
    assert.equal(shouldRunFollowUp(answer), false);
  }
});
