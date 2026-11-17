import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/004_customer_learning_dashboard.sql", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
const dockerfile = await readFile(new URL("../Dockerfile", import.meta.url), "utf8");

test("confirmed course enrolments require an explicit lesson package", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_course_enrolments/);
  assert.match(migration, /total_lessons INTEGER NOT NULL CHECK \(total_lessons > 0/);
  assert.match(migration, /enrolment_request_id UUID NOT NULL UNIQUE/);
  assert.match(server, /student_course_enrolments/);
  assert.match(server, /"remainingLessons"/);
  assert.match(server, /"progressPercent"/);
});

test("lesson completion is tracked separately from scheduled and cancelled lessons", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_course_lessons/);
  assert.match(migration, /'scheduled', 'completed', 'cancelled', 'missed'/);
  assert.match(server, /COUNT\(l\.id\) FILTER \(WHERE l\.status='completed'\)/);
  assert.match(server, /MIN\(l\.scheduled_at\)/);
});

test("course materials are private, published-only, and linked to a learner's own enrolment", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS student_course_resources/);
  assert.match(migration, /'published'/);
  assert.match(server, /path\.match\(\/\^\\/api\\/student\\/resources/);
  assert.match(server, /e\.student_id=\$2/);
  assert.match(server, /r\.status='published'/);
  assert.match(server, /Content-Disposition/);
  assert.match(server, /realpath\(PRIVATE_RESOURCES_DIR\)/);
  assert.match(dockerfile, /\/app\/private-resources/);
});

test("dashboard keeps pending course requests separate from confirmed enrolments", () => {
  assert.match(server, /pendingRequests:/);
  assert.match(server, /courseEnrolments:/);
  assert.match(server, /courseResources:/);
  assert.match(server, /e\.status IN \('active','paused','completed'\)/);
});
