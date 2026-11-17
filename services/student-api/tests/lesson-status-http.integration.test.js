import test from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { hashPassword } from "../src/security.js";

const enabled = process.env.HEEVA_HTTP_INTEGRATION_TEST === "true";

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function eventuallyHealthy(baseUrl, child) {
  for (let i = 0; i < 60; i++) {
    if (child.exitCode !== null) throw new Error("API exited before becoming healthy");
    try {
      const response = await fetch(baseUrl + "/api/health", { signal: AbortSignal.timeout(1000) });
      if (response.ok) return;
    } catch { /* startup not complete */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("Temporary API did not become healthy");
}

test("authenticated staff API completes a lesson and updates the remaining balance", {
  skip: !enabled && "Set HEEVA_HTTP_INTEGRATION_TEST=true for isolated HTTP testing",
  timeout: 30000,
}, async () => {
  assert.ok(process.env.DATABASE_URL, "DATABASE_URL must be provided");
  const databaseName = new URL(process.env.DATABASE_URL).pathname.slice(1);
  assert.equal(databaseName, "heeva_ci", "Refusing to insert fixtures outside the dedicated CI database");

  const { default: pg } = await import("pg");
  const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const id = {
    admin: randomUUID(),
    student: randomUUID(),
    learner: randomUUID(),
    request: randomUUID(),
    enrolment: randomUUID(),
    lesson: randomUUID(),
  };
  const email = "heeva-ci-" + id.admin + "@example.invalid";
  const password = "CiOnly-" + randomUUID() + "-A1";
  const origin = "https://staging.heevacourses.com";
  let child;
  try {
    const hash = await hashPassword(password);
    await db.query("BEGIN");
    await db.query(
      "INSERT INTO staff_users(id,email,display_name,password_hash,role) VALUES($1,$2,'CI Admin',$3,'admin')",
      [id.admin,email,hash]
    );
    await db.query(
      "INSERT INTO students(id,first_name,last_name,email,password_hash,terms_accepted_at,privacy_accepted_at) VALUES($1,'CI','Student',$2,$3,NOW(),NOW())",
      [id.student,"ci-" + id.student + "@example.invalid",hash]
    );
    await db.query(
      "INSERT INTO learner_profiles(id,account_id,display_name,age_band,relationship_type) VALUES($1,$2,'CI Learner','adult','self')",
      [id.learner,id.student]
    );
    await db.query(
      "INSERT INTO student_enrolment_requests(id,student_id,learner_id,course_slug,course_title_snapshot,status) VALUES($1,$2,$3,'piano','Piano','active')",
      [id.request,id.student,id.learner]
    );
    await db.query(
      "INSERT INTO student_course_enrolments(id,student_id,learner_id,enrolment_request_id,course_slug,course_title_snapshot,total_lessons,status) VALUES($1,$2,$3,$4,'piano','Piano',1,'active')",
      [id.enrolment,id.student,id.learner,id.request]
    );
    await db.query(
      "INSERT INTO student_course_lessons(id,course_enrolment_id,lesson_number,title,status,scheduled_at) VALUES($1,$2,1,'CI Piano Lesson','scheduled',NOW())",
      [id.lesson,id.enrolment]
    );
    await db.query("COMMIT");

    const port = await availablePort();
    const baseUrl = "http://127.0.0.1:" + port;
    child = spawn(process.execPath, ["src/server.js"], {
      cwd: new URL("..", import.meta.url).pathname,
      env: {
        ...process.env,
        PORT: String(port),
        COOKIE_SECURE: "true",
        APP_ORIGINS: origin,
      },
      stdio: "ignore",
    });
    await eventuallyHealthy(baseUrl, child);

    const unauthenticated = await fetch(baseUrl + "/api/staff/lessons/" + id.lesson, {
      method: "PUT",
      headers: { Origin:origin, "Content-Type":"application/json" },
      body: JSON.stringify({status:"completed"}),
    });
    assert.equal(unauthenticated.status, 401);

    const missingOrigin = await fetch(baseUrl + "/api/staff/auth/login", {
      method:"POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify({email,password}),
    });
    assert.equal(missingOrigin.status, 403);

    const login = await fetch(baseUrl + "/api/staff/auth/login", {
      method:"POST",
      headers: {Origin:origin, "Content-Type":"application/json"},
      body: JSON.stringify({email,password}),
    });
    assert.equal(login.status, 200, "Administrator login must succeed");
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.match(cookie || "", /^__Host-heeva_staff_session=/);

    const update = await fetch(baseUrl + "/api/staff/lessons/" + id.lesson, {
      method:"PUT",
      headers: {Origin:origin, Cookie:cookie, "Content-Type":"application/json"},
      body:JSON.stringify({status:"completed",tutorNote:"CI test"}),
    });
    assert.equal(update.status, 200, "Lesson completion API should return HTTP 200");
    const body = await update.json();
    assert.equal(body.lesson.status, "completed");
    assert.ok(body.lesson.completed_at);

    const lesson = await db.query(
      "SELECT status,completed_at FROM student_course_lessons WHERE id=$1",[id.lesson]
    );
    assert.equal(lesson.rows[0].status,"completed");
    assert.ok(lesson.rows[0].completed_at);

    const list = await fetch(baseUrl + "/api/staff/course-enrolments", {
      headers: {Cookie:cookie},
    });
    assert.equal(list.status, 200);
    const enrolments = (await list.json()).enrolments;
    const found = enrolments.find((item) => item.id === id.enrolment);
    assert.ok(found, "Test enrolment must be in staff listing");
    assert.equal(found.total_lessons,1);
    assert.equal(found.completed_lessons,1);
    assert.equal(found.total_lessons - found.completed_lessons,0);
  } finally {
    if (child) {
      child.kill("SIGTERM");
      await Promise.race([
        new Promise((resolve) => child.once("exit", resolve)),
        new Promise((resolve) => setTimeout(resolve, 1500)),
      ]);
      if (child.exitCode === null) child.kill("SIGKILL");
    }
    await db.query("ROLLBACK").catch(() => {});
    await db.query("DELETE FROM staff_users WHERE id=$1", [id.admin]).catch(() => {});
    await db.query("DELETE FROM students WHERE id=$1", [id.student]).catch(() => {});
    await db.end();
  }
});
