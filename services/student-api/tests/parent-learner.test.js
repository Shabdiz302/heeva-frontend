import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/002_parent_learner_profiles.sql", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");

test("parent and learner profiles are stored separately from account holders", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS learner_profiles/);
  assert.match(migration, /account_id UUID NOT NULL REFERENCES students\(id\)/);
  assert.match(migration, /relationship_type IN \('self', 'child'\)/);
  assert.match(migration, /guardian_authority_confirmed_at IS NOT NULL/);
});

test("child profile model stores an age band, not a full date of birth", () => {
  assert.match(migration, /age_band VARCHAR\(20\)/);
  assert.doesNotMatch(migration, /date_of_birth|birth_date/i);
  assert.match(server, /guardianAuthorityConfirmed !== true/);
});

test("a parent can only retrieve and create learner profiles for their own account", () => {
  assert.match(server, /student\.account_type !== "parent_guardian"/);
  assert.match(server, /WHERE account_id=\$1 AND status='active'/);
  assert.match(server, /WHERE id=\$1 AND account_id=\$2 AND status='active'/);
});

test("course enrolments are attached to a learner and cannot be duplicated per learner", () => {
  assert.match(migration, /UNIQUE \(learner_id, course_slug\)/);
  assert.match(server, /ON CONFLICT\(learner_id, course_slug\) DO NOTHING/);
});

test("one introductory lesson is enforced per learner, not per parent account", () => {
  assert.match(migration, /PRIMARY KEY \(learner_id\)/);
  assert.match(server, /ON CONFLICT\(learner_id\) DO NOTHING/);
  assert.match(server, /One introductory lesson has already been requested for this learner/);
});
