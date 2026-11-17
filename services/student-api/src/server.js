import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  createSessionToken, hashPassword, hashSessionToken, isValidEmail,
  newId, normalizeEmail, validatePassword, verifyPassword
} from "./security.js";

const { Pool } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3100);
const SESSION_DAYS = Math.min(Math.max(Number(process.env.SESSION_TTL_DAYS || 30), 1), 30);
const COOKIE_NAME = "__Host-heeva_session";
const APP_ORIGINS = new Set((process.env.APP_ORIGINS || "https://staging.heevacourses.com")
  .split(",").map((item) => item.trim()).filter(Boolean));
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is required");
if (process.env.COOKIE_SECURE !== "true") {
  throw new Error("COOKIE_SECURE=true is required; student authentication must only run behind HTTPS");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 8,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 10000
});
pool.on("error", (error) => console.error("Unexpected database pool error:", error.message));

const catalog = JSON.parse(await readFile(resolve(here, "../data/courses.json"), "utf8"));
const coursesBySlug = new Map(catalog.map((course) => [course.slug, course]));
const attempts = new Map();

function json(res, status, body, extraHeaders = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    ...extraHeaders
  });
  res.end(payload);
}

function setSessionCookie(res, token, maxAgeSeconds) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAgeSeconds}`);
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    if (part.slice(0, index).trim() === name) return part.slice(index + 1).trim();
  }
  return null;
}

function checkOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || !APP_ORIGINS.has(origin)) return false;
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  return true;
}

async function readJson(req) {
  const contentType = String(req.headers["content-type"] || "").toLowerCase();
  if (!contentType.startsWith("application/json")) throw Object.assign(new Error("JSON body required"), { status: 415 });
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 16384) throw Object.assign(new Error("Request body too large"), { status: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw Object.assign(new Error("Invalid JSON"), { status: 400 });
  }
}

function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  const old = attempts.get(key);
  if (!old || now - old.start >= windowMs) {
    attempts.set(key, { start: now, count: 1 });
    return true;
  }
  old.count += 1;
  return old.count <= limit;
}
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of attempts) if (now - value.start > 60 * 60 * 1000) attempts.delete(key);
}, 10 * 60 * 1000).unref();

function publicStudent(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    preferredLanguage: row.preferred_language,
    createdAt: row.created_at
  };
}

async function currentStudent(req) {
  const token = getCookie(req, COOKIE_NAME);
  if (!token || token.length > 100) return null;
  const result = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.email, s.phone,
            s.preferred_language, s.created_at, ss.id AS session_id
       FROM student_sessions ss
       JOIN students s ON s.id = ss.student_id
      WHERE ss.token_hash = $1 AND ss.expires_at > NOW() AND s.status = 'active'
      LIMIT 1`,
    [hashSessionToken(token)]
  );
  return result.rows[0] || null;
}

async function createSession(client, studentId, res) {
  const token = createSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await client.query(
    "INSERT INTO student_sessions(id, student_id, token_hash, expires_at) VALUES($1,$2,$3,$4)",
    [newId(), studentId, hashSessionToken(token), expiresAt]
  );
  setSessionCookie(res, token, SESSION_DAYS * 24 * 60 * 60);
}

async function handle(req, res) {
  const url = new URL(req.url || "/", "http://localhost");
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const method = req.method || "GET";

  if (method !== "GET" && method !== "HEAD" && !checkOrigin(req)) {
    return json(res, 403, { error: "Request origin was not accepted." });
  }

  if (method === "GET" && path === "/api/health") {
    try {
      await pool.query("SELECT 1");
      return json(res, 200, { status: "ok", database: "connected" });
    } catch {
      return json(res, 503, { status: "unavailable" });
    }
  }

  if (method === "GET" && path === "/api/courses") {
    return json(res, 200, { courses: catalog.map(({ slug, title, status }) => ({
      slug, title, status, enrolmentOpen: status === "available"
    })) });
  }

  if (method === "POST" && path === "/api/auth/register") {
    const body = await readJson(req);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = normalizeEmail(body.email);
    const password = body.password;
    const phone = String(body.phone || "").trim();
    const preferredLanguage = body.preferredLanguage === "fa" ? "fa" : "en";
    if (firstName.length < 1 || firstName.length > 80 || lastName.length < 1 || lastName.length > 80 ||
        !isValidEmail(email) || !validatePassword(password) || phone.length > 40 ||
        body.termsAccepted !== true || body.privacyAccepted !== true || body.adultAccountConfirmed !== true) {
      return json(res, 400, { error: "Please check your details. Use a password of at least 12 characters with upper-case, lower-case and numeric characters, and accept the privacy policy and terms, and confirm you are an adult account holder." });
    }
    if (!rateLimit(`register:${email}`, 4, 60 * 60 * 1000)) {
      return json(res, 429, { error: "Too many registration attempts. Please try again later." });
    }
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO students(id, first_name, last_name, email, password_hash, phone, preferred_language, terms_accepted_at, privacy_accepted_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,NOW(),NOW())
         RETURNING id, first_name, last_name, email, phone, preferred_language, created_at`,
        [newId(), firstName, lastName, email, passwordHash, phone || null, preferredLanguage]
      );
      await createSession(client, inserted.rows[0].id, res);
      await client.query("COMMIT");
      return json(res, 201, { student: publicStudent(inserted.rows[0]) });
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") return json(res, 409, { error: "An account with this email address already exists." });
      throw error;
    } finally {
      client.release();
    }
  }

  if (method === "POST" && path === "/api/auth/login") {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!isValidEmail(email) || password.length > 128 || password.length < 1) {
      return json(res, 400, { error: "Enter your email address and password." });
    }
    if (!rateLimit(`login:${email}`, 8, 15 * 60 * 1000)) {
      return json(res, 429, { error: "Too many sign-in attempts. Please wait and try again." });
    }
    const found = await pool.query(
      "SELECT id, first_name, last_name, email, phone, preferred_language, created_at, password_hash FROM students WHERE email = $1 AND status = 'active' LIMIT 1",
      [email]
    );
    const student = found.rows[0];
    if (!student || !(await verifyPassword(password, student.password_hash))) {
      return json(res, 401, { error: "Email or password is incorrect." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM student_sessions WHERE student_id = $1 AND expires_at < NOW()", [student.id]);
      await createSession(client, student.id, res);
      await client.query("UPDATE students SET last_login_at = NOW() WHERE id = $1", [student.id]);
      await client.query("COMMIT");
      return json(res, 200, { student: publicStudent(student) });
    } catch (error) {
      await client.query("ROLLBACK");
      clearSessionCookie(res);
      throw error;
    } finally {
      client.release();
    }
  }

  if (method === "POST" && path === "/api/auth/logout") {
    const token = getCookie(req, COOKIE_NAME);
    if (token) await pool.query("DELETE FROM student_sessions WHERE token_hash = $1", [hashSessionToken(token)]);
    clearSessionCookie(res);
    return json(res, 200, { ok: true });
  }

  if (method === "GET" && path === "/api/auth/me") {
    const student = await currentStudent(req);
    if (!student) return json(res, 401, { error: "Please sign in." });
    return json(res, 200, { student: publicStudent(student) });
  }

  const student = await currentStudent(req);
  if (!student) return json(res, 401, { error: "Please sign in." });

  if (method === "GET" && path === "/api/student/profile") {
    return json(res, 200, { profile: publicStudent(student) });
  }

  if (method === "PUT" && path === "/api/student/profile") {
    const body = await readJson(req);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const phone = String(body.phone || "").trim();
    const preferredLanguage = body.preferredLanguage === "fa" ? "fa" : "en";
    if (firstName.length < 1 || firstName.length > 80 || lastName.length < 1 || lastName.length > 80 || phone.length > 40) {
      return json(res, 400, { error: "Please check your profile details." });
    }
    const updated = await pool.query(
      `UPDATE students SET first_name=$1, last_name=$2, phone=$3, preferred_language=$4, updated_at=NOW()
       WHERE id=$5 RETURNING id, first_name, last_name, email, phone, preferred_language, created_at`,
      [firstName, lastName, phone || null, preferredLanguage, student.id]
    );
    return json(res, 200, { profile: publicStudent(updated.rows[0]) });
  }

  if (method === "GET" && path === "/api/student/enrolments") {
    const result = await pool.query(
      `SELECT id, course_slug AS "courseSlug", course_title_snapshot AS "courseTitle",
              status, created_at AS "createdAt"
         FROM student_enrolment_requests WHERE student_id=$1 ORDER BY created_at DESC`,
      [student.id]
    );
    return json(res, 200, { enrolments: result.rows });
  }

  if (method === "POST" && path === "/api/student/enrolments") {
    const body = await readJson(req);
    const course = coursesBySlug.get(String(body.courseSlug || ""));
    if (!course) return json(res, 400, { error: "Please select a valid Heeva course." });
    if (course.status !== "available") return json(res, 409, { error: "This course is not currently confirmed as available for enrolment." });
    const inserted = await pool.query(
      `INSERT INTO student_enrolment_requests(id, student_id, course_slug, course_title_snapshot)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(student_id, course_slug) DO NOTHING
       RETURNING id, course_slug AS "courseSlug", course_title_snapshot AS "courseTitle", status, created_at AS "createdAt"`,
      [newId(), student.id, course.slug, course.title]
    );
    if (!inserted.rowCount) return json(res, 409, { error: "You have already requested this course." });
    return json(res, 201, { enrolment: inserted.rows[0] });
  }

  if (method === "GET" && path === "/api/student/trial-lesson") {
    const result = await pool.query(
      `SELECT course_slug AS "courseSlug", course_title_snapshot AS "courseTitle",
              status, requested_at AS "requestedAt", scheduled_at AS "scheduledAt"
         FROM student_trial_lesson_requests WHERE student_id=$1`,
      [student.id]
    );
    return json(res, 200, { trialLesson: result.rows[0] || null });
  }

  if (method === "POST" && path === "/api/student/trial-lesson") {
    const body = await readJson(req);
    const course = coursesBySlug.get(String(body.courseSlug || ""));
    if (!course) return json(res, 400, { error: "Please select an available course for your introductory lesson." });
    if (course.status !== "available") return json(res, 409, { error: "This course is not currently confirmed as available for an introductory lesson." });
    const inserted = await pool.query(
      `INSERT INTO student_trial_lesson_requests(student_id, course_slug, course_title_snapshot)
       VALUES($1,$2,$3) ON CONFLICT(student_id) DO NOTHING
       RETURNING course_slug AS "courseSlug", course_title_snapshot AS "courseTitle", status, requested_at AS "requestedAt"`,
      [student.id, course.slug, course.title]
    );
    if (!inserted.rowCount) return json(res, 409, { error: "One introductory lesson has already been requested for this account." });
    return json(res, 201, { trialLesson: inserted.rows[0] });
  }

  if (method === "GET" && path === "/api/student/dashboard") {
    const [enrolments, trial] = await Promise.all([
      pool.query(`SELECT id, course_slug AS "courseSlug", course_title_snapshot AS "courseTitle", status, created_at AS "createdAt"
                    FROM student_enrolment_requests WHERE student_id=$1 ORDER BY created_at DESC`, [student.id]),
      pool.query(`SELECT course_slug AS "courseSlug", course_title_snapshot AS "courseTitle", status, requested_at AS "requestedAt", scheduled_at AS "scheduledAt"
                    FROM student_trial_lesson_requests WHERE student_id=$1`, [student.id])
    ]);
    return json(res, 200, {
      student: publicStudent(student),
      enrolments: enrolments.rows,
      trialLesson: trial.rows[0] || null
    });
  }

  return json(res, 404, { error: "Not found." });
}

const server = createServer(async (req, res) => {
  try {
    await handle(req, res);
  } catch (error) {
    if (res.headersSent) return res.destroy();
    console.error("API request failed:", error.code || error.name || "Error", error.message);
    json(res, Number.isInteger(error.status) ? error.status : 500, {
      error: Number.isInteger(error.status) ? error.message : "The service could not complete the request."
    });
  }
});

server.listen(PORT, "0.0.0.0", () => console.log(`Heeva Student API listening on ${PORT}`));

async function shutdown(signal) {
  console.log(`Received ${signal}; shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
