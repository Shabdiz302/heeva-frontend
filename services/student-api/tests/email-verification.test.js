import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/003_email_verification.sql", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");

test("email verification is required before a new login session is issued", () => {
  assert.match(migration, /email_verified_at TIMESTAMPTZ/);
  assert.match(server, /EMAIL_NOT_VERIFIED/);
  assert.match(server, /if \(!student\.email_verified_at\)/);
  assert.match(server, /path === "\/api\/auth\/verify-email"/);
});

test("verification codes are stored as salted hashes with expiry and attempt limits", () => {
  assert.match(migration, /code_salt CHAR\(32\)/);
  assert.match(migration, /code_hash CHAR\(64\)/);
  assert.match(migration, /expires_at TIMESTAMPTZ NOT NULL/);
  assert.match(migration, /attempts BETWEEN 0 AND 5/);
  assert.match(server, /INTERVAL '10 minutes'/);
  assert.match(server, /attempts >= 5/);
  assert.doesNotMatch(server, /INSERT INTO student_email_verification_codes[^;]*\bcode\b/i);
});

test("verification email is sent only from backend configuration", () => {
  assert.match(server, /RESEND_API_KEY/);
  assert.match(server, /EMAIL_FROM/);
  assert.match(server, /EMAIL_REPLY_TO/);
  assert.match(server, /reply_to: \[EMAIL_REPLY_TO\]/);
  assert.match(server, /Authorization: `Bearer \$\{RESEND_API_KEY\}`/);
  assert.ok(server.includes('"User-Agent": "Heeva-Student-Platform/1.0"'));
  assert.ok(server.includes('"Accept": "application/json"'));
  assert.match(server, /https:\/\/api\.resend\.com\/emails/);
});

test("verification codes can be resent with time and daily limits", () => {
  assert.match(server, /path === "\/api\/auth\/resend-verification"/);
  assert.match(server, /at least one minute/);
  assert.match(server, /daily verification email limit/);
});
