import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/006_teacher_marketplace_profiles.sql", import.meta.url), "utf8");
const migrator = await readFile(new URL("../src/migrate.js", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");

test("marketplace profile migration is registered and tied to staff account", () => {
  assert.match(migrator, /006_teacher_marketplace_profiles/);
  assert.match(migration, /staff_user_id UUID NOT NULL UNIQUE REFERENCES staff_users\(id\)/);
  assert.match(migration, /review_status VARCHAR\(24\) NOT NULL DEFAULT 'draft'/);
  assert.match(migration, /proposed_rate_pence INTEGER CHECK/);
});

test("teacher draft API always identifies owner from authenticated session", () => {
  assert.match(server, /path === "\/api\/staff\/marketplace\/profile" && staff.role === "teacher"/);
  assert.match(server, /WHERE staff_user_id=\$1/);
  assert.match(server, /\[staff.id\]/);
  assert.match(server, /marketplace.profile.saved/);
  assert.match(server, /marketplace.profile.submitted/);
});

test("admin review requires admin role and pending status", () => {
  assert.match(server, /path === "\/api\/staff\/marketplace\/review" && staff.role === "admin"/);
  assert.match(server, /reviewMatch && method === "POST" && staff.role === "admin"/);
  assert.match(server, /WHERE id=\$1 AND review_status='pending_review'/);
  assert.match(server, /\["approved","changes_requested"\]/);
  assert.match(server, /marketplace.profile\."\+decision/);
});

test("marketplace drafts have no public route and no payment pathway", () => {
  assert.doesNotMatch(server, /\/api\/public\/marketplace/);
  assert.doesNotMatch(server, /\/api\/student\/marketplace/);
  assert.doesNotMatch(migration, /stripe_secret|payment_card/);
});

test("teacher prices are proposals, restricted to GBP and positive sensible bounds", () => {
  assert.match(migration, /currency CHAR\(3\) NOT NULL DEFAULT 'GBP' CHECK \(currency='GBP'\)/);
  assert.match(migration, /BETWEEN 100 AND 100000/);
  assert.match(server, /rate<100 \|\| rate>100000/);
});
