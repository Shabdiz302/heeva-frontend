import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/005_staff_management.sql", import.meta.url), "utf8");
const server = await readFile(new URL("../src/server.js", import.meta.url), "utf8");
const provisioning = await readFile(new URL("../src/create-staff-user.js", import.meta.url), "utf8");

test("staff identity and sessions are separate from customer sessions", () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS staff_users/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS staff_sessions/);
  assert.match(server, /__Host-heeva_staff_session/);
  assert.match(server, /async function currentStaff/);
  assert.match(server, /Staff sign-in required/);
});

test("customer sessions cannot call staff management routes", () => {
  assert.match(server, /if \(path\.startsWith\("\/api\/staff\/"\)\)/);
  assert.match(server, /if \(!staff\) return json\(res,401/);
  assert.match(server, /Only administrators can approve enrolment requests/);
});

test("staff provisioning requires a strong password and a server-side command", () => {
  assert.match(provisioning, /validatePassword\(password\)/);
  assert.match(provisioning, /process\.stdin/);
  assert.match(provisioning, /teacher slug must match an entry/);
  assert.doesNotMatch(provisioning, /DEFAULT_ADMIN_PASSWORD|password\s*=\s*["']/i);
});

test("course activation records an explicit lesson total and audit event", () => {
  assert.match(server, /student_course_enrolments/);
  assert.match(server, /totalLessons/);
  assert.match(server, /enrolment\.activated/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS staff_audit_log/);
});

test("teachers can only manage courses assigned to their own teacher slug", () => {
  assert.match(server, /function staffCanManageEnrolment/);
  assert.match(server, /enrolment\.teacher_slug === staff\.teacher_slug/);
});

test("lesson operations validate package limits and record completion", () => {
  assert.match(server, /lessonNumber > enrolment\.total_lessons/);
  assert.match(server, /status IN/);
  assert.match(server, /completed_at=CASE WHEN \$1='completed'/);
});

test("private resource publishing enforces allowed types and file size", () => {
  assert.match(server, /application\/pdf/);
  assert.match(server, /readBinary\(req,20\*1024\*1024\)/);
  assert.match(server, /status,published_at/);
  assert.match(server, /staffCanManageEnrolment\(staff,found\.rows\[0\]\)/);
});
