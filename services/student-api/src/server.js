import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import {
  createSessionToken, hashPassword, hashSessionToken, isValidEmail,
  newId, normalizeEmail, validatePassword, verifyPassword,
  createEmailVerificationCode, createEmailVerificationSalt,
  hashEmailVerificationCode, verifyEmailVerificationCode
} from "./security.js";

const { Pool } = pg;
const here = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3100);
const SESSION_DAYS = Math.min(Math.max(Number(process.env.SESSION_TTL_DAYS || 30), 1), 30);
const COOKIE_NAME = "__Host-heeva_preview_session";
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

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const EMAIL_FROM = process.env.EMAIL_FROM || "";

function emailVerificationConfigured() {
  return RESEND_API_KEY.length > 0 && EMAIL_FROM.length > 0;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function sendVerificationEmail(email, firstName, code) {
  const safeName = escapeHtml(firstName || "there");
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [email],
        subject: "Your Heeva verification code",
        text: `Hello ${firstName || "there"}, your Heeva verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#243c35"><h2>Verify your Heeva email</h2><p>Hello ${safeName},</p><p>Use this code to verify your email address:</p><p style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:16px;background:#f2f0e7;text-align:center">${code}</p><p>This code expires in 10 minutes. Do not share it with anyone.</p><p>If you did not request this email, you can ignore it.</p></div>`
      }),
      signal: AbortSignal.timeout(12000)
    });
    if (!response.ok) {
      console.error("Verification email provider returned HTTP", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("Verification email delivery failed:", error.name || "Error");
    return false;
  }
}

async function storeVerificationCode(client, studentId) {
  const code = createEmailVerificationCode();
  const salt = createEmailVerificationSalt();
  const codeHash = hashEmailVerificationCode(code, salt);
  await client.query(
    `INSERT INTO student_email_verification_codes
       (student_id, code_salt, code_hash, expires_at, attempts, sent_count, last_sent_at)
     VALUES($1,$2,$3,NOW() + INTERVAL '10 minutes',0,1,NOW())
     ON CONFLICT(student_id) DO UPDATE SET
       code_salt=EXCLUDED.code_salt, code_hash=EXCLUDED.code_hash,
       expires_at=EXCLUDED.expires_at, attempts=0, sent_count=1,
       last_sent_at=NOW(), created_at=NOW()`,
    [studentId, salt, codeHash]
  );
  return code;
}

function publicStudent(row) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    preferredLanguage: row.preferred_language,
    accountType: row.account_type || "adult_learner",
    createdAt: row.created_at
  };
}

function publicLearner(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    ageBand: row.age_band,
    relationshipType: row.relationship_type,
    preferredLanguage: row.preferred_language,
    createdAt: row.created_at
  };
}

const childAgeBands = new Set(["under_8", "8_12", "13_17"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function currentStudent(req) {
  const token = getCookie(req, COOKIE_NAME);
  if (!token || token.length > 100) return null;
  const result = await pool.query(
    `SELECT s.id, s.first_name, s.last_name, s.email, s.phone,
            s.preferred_language, s.account_type, s.email_verified_at, s.created_at, ss.id AS session_id
       FROM student_sessions ss
       JOIN students s ON s.id = ss.student_id
      WHERE ss.token_hash = $1 AND ss.expires_at > NOW() AND s.status = 'active'
        AND s.email_verified_at IS NOT NULL
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
    if (!emailVerificationConfigured()) {
      return json(res, 503, { error: "Email verification is not configured yet. Please try again later." });
    }
    const body = await readJson(req);
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = normalizeEmail(body.email);
    const password = body.password;
    const phone = String(body.phone || "").trim();
    const preferredLanguage = body.preferredLanguage === "fa" ? "fa" : "en";
    const accountType = body.accountType || "adult_learner";
    if (firstName.length < 1 || firstName.length > 80 || lastName.length < 1 || lastName.length > 80 ||
        !isValidEmail(email) || !validatePassword(password) || phone.length > 40 ||
        body.termsAccepted !== true || body.privacyAccepted !== true || body.adultAccountConfirmed !== true ||
        !["parent_guardian", "adult_learner"].includes(accountType)) {
      return json(res, 400, { error: "Check your details. Passwords must be at least 8 characters and include upper-case, lower-case and a number. Accept the privacy policy and terms, and confirm you are an adult account holder." });
    }
    if (!rateLimit(`register:${email}`, 4, 60 * 60 * 1000)) {
      return json(res, 429, { error: "Too many registration attempts. Please try again later." });
    }
    const passwordHash = await hashPassword(password);
    const client = await pool.connect();
    let insertedStudent;
    let verificationCode;
    try {
      await client.query("BEGIN");
      const inserted = await client.query(
        `INSERT INTO students(id, first_name, last_name, email, password_hash, phone, preferred_language, account_type, terms_accepted_at, privacy_accepted_at)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())
         RETURNING id, first_name, last_name, email, phone, preferred_language, account_type, created_at`,
        [newId(), firstName, lastName, email, passwordHash, phone || null, preferredLanguage, accountType]
      );
      insertedStudent = inserted.rows[0];
      if (accountType === "adult_learner") {
        await client.query(
          `INSERT INTO learner_profiles(id, account_id, display_name, age_band, relationship_type, preferred_language)
           VALUES($1,$2,$3,'adult','self',$4)`,
          [newId(), insertedStudent.id, firstName, preferredLanguage]
        );
      }
      verificationCode = await storeVerificationCode(client, insertedStudent.id);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error.code === "23505") return json(res, 409, { error: "An account with this email address already exists." });
      throw error;
    } finally {
      client.release();
    }

    const emailSent = await sendVerificationEmail(email, firstName, verificationCode);
    return json(res, 201, {
      requiresEmailVerification: true,
      emailSent,
      email,
      message: emailSent
        ? "A six-digit verification code has been sent to your email address. It expires in 10 minutes."
        : "Your account has been created, but the verification email could not be sent. Please use resend verification."
    });
  }

  if (method === "POST" && path === "/api/auth/resend-verification") {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    if (!isValidEmail(email)) return json(res, 400, { error: "Enter a valid email address." });
    if (!emailVerificationConfigured()) {
      return json(res, 503, { error: "Email verification is not configured yet." });
    }
    if (!rateLimit(`verify-resend:${email}`, 5, 24 * 60 * 60 * 1000)) {
      return json(res, 429, { error: "Too many verification emails requested. Try again later." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        `SELECT s.id, s.first_name, s.email, s.email_verified_at,
                v.sent_count, v.last_sent_at
           FROM students s
           LEFT JOIN student_email_verification_codes v ON v.student_id=s.id
          WHERE s.email=$1 LIMIT 1 FOR UPDATE OF s`,
        [email]
      );
      if (!found.rowCount || found.rows[0].email_verified_at) {
        await client.query("COMMIT");
        return json(res, 200, { ok: true, message: "If the account needs verification, a code will be sent." });
      }
      const row = found.rows[0];
      if (row.last_sent_at && Date.now() - new Date(row.last_sent_at).getTime() < 60_000) {
        await client.query("ROLLBACK");
        return json(res, 429, { error: "Please wait at least one minute before requesting another code." });
      }
      if (row.sent_count >= 5 && row.last_sent_at &&
          Date.now() - new Date(row.last_sent_at).getTime() < 24 * 60 * 60 * 1000) {
        await client.query("ROLLBACK");
        return json(res, 429, { error: "You have reached the daily verification email limit. Try again tomorrow." });
      }
      const code = createEmailVerificationCode();
      const salt = createEmailVerificationSalt();
      const hash = hashEmailVerificationCode(code, salt);
      await client.query(
        `INSERT INTO student_email_verification_codes
           (student_id,code_salt,code_hash,expires_at,attempts,sent_count,last_sent_at)
         VALUES($1,$2,$3,NOW()+INTERVAL '10 minutes',0,1,NOW())
         ON CONFLICT(student_id) DO UPDATE SET
           code_salt=EXCLUDED.code_salt, code_hash=EXCLUDED.code_hash,
           expires_at=EXCLUDED.expires_at, attempts=0,
           sent_count=CASE WHEN student_email_verification_codes.last_sent_at < NOW()-INTERVAL '24 hours'
                           THEN 1 ELSE student_email_verification_codes.sent_count+1 END,
           last_sent_at=NOW(), created_at=NOW()`,
        [row.id, salt, hash]
      );
      await client.query("COMMIT");
      const sent = await sendVerificationEmail(row.email, row.first_name, code);
      if (!sent) return json(res, 502, { error: "We could not send the verification email. Please try again later." });
      return json(res, 200, { ok: true, message: "A new verification code has been sent. It expires in 10 minutes." });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  if (method === "POST" && path === "/api/auth/verify-email") {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const code = String(body.code || "").trim();
    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      return json(res, 400, { error: "Enter the email address and six-digit verification code." });
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(
        `SELECT s.id, s.first_name, s.last_name, s.email, s.phone,
                s.preferred_language, s.account_type, s.created_at,
                v.code_salt, v.code_hash, v.expires_at, v.attempts
           FROM students s
           JOIN student_email_verification_codes v ON v.student_id=s.id
          WHERE s.email=$1 AND s.email_verified_at IS NULL
          FOR UPDATE OF s, v`,
        [email]
      );
      if (!found.rowCount) {
        await client.query("ROLLBACK");
        return json(res, 400, { error: "The code is invalid or has expired. Request a new code." });
      }
      const row = found.rows[0];
      if (row.attempts >= 5 || new Date(row.expires_at).getTime() <= Date.now()) {
        await client.query("ROLLBACK");
        return json(res, 400, { error: "The code has expired or the attempt limit was reached. Request a new code." });
      }
      if (!verifyEmailVerificationCode(code, row.code_salt, row.code_hash)) {
        await client.query(
          "UPDATE student_email_verification_codes SET attempts=attempts+1 WHERE student_id=$1",
          [row.id]
        );
        await client.query("COMMIT");
        return json(res, 400, { error: "That verification code is incorrect. Check the code and try again." });
      }
      await client.query(
        "UPDATE students SET email_verified_at=COALESCE(email_verified_at,NOW()) WHERE id=$1",
        [row.id]
      );
      await client.query("DELETE FROM student_email_verification_codes WHERE student_id=$1", [row.id]);
      await createSession(client, row.id, res);
      await client.query("COMMIT");
      return json(res, 200, { student: publicStudent(row), emailVerified: true });
    } catch (error) {
      await client.query("ROLLBACK");
      clearSessionCookie(res);
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
      "SELECT id, first_name, last_name, email, phone, preferred_language, account_type, email_verified_at, created_at, password_hash FROM students WHERE email = $1 AND status = 'active' LIMIT 1",
      [email]
    );
    const student = found.rows[0];
    if (!student || !(await verifyPassword(password, student.password_hash))) {
      return json(res, 401, { error: "Email or password is incorrect." });
    }
    if (!student.email_verified_at) {
      return json(res, 403, { code: "EMAIL_NOT_VERIFIED", error: "Please verify your email address before signing in. You can request a new verification code." });
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
       WHERE id=$5 RETURNING id, first_name, last_name, email, phone, preferred_language, account_type, created_at`,
      [firstName, lastName, phone || null, preferredLanguage, student.id]
    );
    if (student.account_type === "adult_learner") {
      await pool.query(
        `UPDATE learner_profiles
            SET display_name=$1, preferred_language=$2, updated_at=NOW()
          WHERE account_id=$3 AND relationship_type='self' AND status='active'`,
        [firstName, preferredLanguage, student.id]
      );
    }
    return json(res, 200, { profile: publicStudent(updated.rows[0]) });
  }

  if (method === "GET" && path === "/api/student/learners") {
    const result = await pool.query(
      `SELECT id, display_name, age_band, relationship_type, preferred_language, created_at
         FROM learner_profiles WHERE account_id=$1 AND status='active'
        ORDER BY created_at ASC`,
      [student.id]
    );
    return json(res, 200, { learners: result.rows.map(publicLearner) });
  }

  if (method === "POST" && path === "/api/student/learners") {
    const body = await readJson(req);
    if (student.account_type !== "parent_guardian") {
      return json(res, 403, { error: "Only a parent or guardian account can add a child learner profile." });
    }
    const displayName = String(body.displayName || "").trim();
    const ageBand = String(body.ageBand || "");
    const preferredLanguage = body.preferredLanguage === "fa" ? "fa" : "en";
    if (displayName.length < 1 || displayName.length > 80 ||
        !childAgeBands.has(ageBand) || body.guardianAuthorityConfirmed !== true) {
      return json(res, 400, { error: "Enter a learner name, select an age band and confirm that you have authority to create this learner profile." });
    }
    if (!rateLimit(`learner:${student.id}`, 12, 60 * 60 * 1000)) {
      return json(res, 429, { error: "Too many learner profiles have been created recently. Please try again later." });
    }
    const inserted = await pool.query(
      `INSERT INTO learner_profiles(
          id, account_id, display_name, age_band, relationship_type,
          preferred_language, guardian_authority_confirmed_at
        )
        VALUES($1,$2,$3,$4,'child',$5,NOW())
        RETURNING id, display_name, age_band, relationship_type, preferred_language, created_at`,
      [newId(), student.id, displayName, ageBand, preferredLanguage]
    );
    return json(res, 201, { learner: publicLearner(inserted.rows[0]) });
  }

  if (method === "GET" && path === "/api/student/enrolments") {
    const result = await pool.query(
      `SELECT e.id, e.learner_id AS "learnerId", lp.display_name AS "learnerName",
              e.course_slug AS "courseSlug", e.course_title_snapshot AS "courseTitle",
              e.status, e.created_at AS "createdAt"
         FROM student_enrolment_requests e
         JOIN learner_profiles lp ON lp.id=e.learner_id
        WHERE e.student_id=$1 ORDER BY e.created_at DESC`,
      [student.id]
    );
    return json(res, 200, { enrolments: result.rows });
  }

  if (method === "POST" && path === "/api/student/enrolments") {
    const body = await readJson(req);
    const course = coursesBySlug.get(String(body.courseSlug || ""));
    const learnerId = String(body.learnerId || "");
    if (!course) return json(res, 400, { error: "Please select a valid Heeva course." });
    if (course.status !== "available") return json(res, 409, { error: "This course is not currently confirmed as available for enrolment." });
    if (!UUID_PATTERN.test(learnerId)) return json(res, 400, { error: "Please select a valid learner profile." });
    const learner = await pool.query(
      "SELECT id FROM learner_profiles WHERE id=$1 AND account_id=$2 AND status='active'",
      [learnerId, student.id]
    );
    if (!learner.rowCount) return json(res, 404, { error: "Select a learner profile belonging to your account." });
    const inserted = await pool.query(
      `INSERT INTO student_enrolment_requests(id, student_id, learner_id, course_slug, course_title_snapshot)
       VALUES($1,$2,$3,$4,$5)
       ON CONFLICT(learner_id, course_slug) DO NOTHING
       RETURNING id, learner_id AS "learnerId", course_slug AS "courseSlug",
                 course_title_snapshot AS "courseTitle", status, created_at AS "createdAt"`,
      [newId(), student.id, learnerId, course.slug, course.title]
    );
    if (!inserted.rowCount) return json(res, 409, { error: "This learner has already requested this course." });
    return json(res, 201, { enrolment: inserted.rows[0] });
  }

  if (method === "GET" && path === "/api/student/trial-lesson") {
    const result = await pool.query(
      `SELECT t.learner_id AS "learnerId", lp.display_name AS "learnerName",
              t.course_slug AS "courseSlug", t.course_title_snapshot AS "courseTitle",
              t.status, t.requested_at AS "requestedAt", t.scheduled_at AS "scheduledAt"
         FROM student_trial_lesson_requests t
         JOIN learner_profiles lp ON lp.id=t.learner_id
        WHERE t.student_id=$1 ORDER BY t.requested_at DESC`,
      [student.id]
    );
    return json(res, 200, { trialLessons: result.rows });
  }

  if (method === "POST" && path === "/api/student/trial-lesson") {
    const body = await readJson(req);
    const course = coursesBySlug.get(String(body.courseSlug || ""));
    const learnerId = String(body.learnerId || "");
    if (!course) return json(res, 400, { error: "Please select an available course for your introductory lesson." });
    if (course.status !== "available") return json(res, 409, { error: "This course is not currently confirmed as available for an introductory lesson." });
    if (!UUID_PATTERN.test(learnerId)) return json(res, 400, { error: "Please select a valid learner profile." });
    const learner = await pool.query(
      "SELECT id FROM learner_profiles WHERE id=$1 AND account_id=$2 AND status='active'",
      [learnerId, student.id]
    );
    if (!learner.rowCount) return json(res, 404, { error: "Select a learner profile belonging to your account." });
    const inserted = await pool.query(
      `INSERT INTO student_trial_lesson_requests(student_id, learner_id, course_slug, course_title_snapshot)
       VALUES($1,$2,$3,$4) ON CONFLICT(learner_id) DO NOTHING
       RETURNING learner_id AS "learnerId", course_slug AS "courseSlug",
                 course_title_snapshot AS "courseTitle", status, requested_at AS "requestedAt"`,
      [student.id, learnerId, course.slug, course.title]
    );
    if (!inserted.rowCount) return json(res, 409, { error: "One introductory lesson has already been requested for this learner." });
    return json(res, 201, { trialLesson: inserted.rows[0] });
  }

  if (method === "GET" && path === "/api/student/dashboard") {
    const [learners, enrolments, trialLessons] = await Promise.all([
      pool.query(
        `SELECT id, display_name, age_band, relationship_type, preferred_language, created_at
           FROM learner_profiles WHERE account_id=$1 AND status='active' ORDER BY created_at ASC`,
        [student.id]
      ),
      pool.query(
        `SELECT e.id, e.learner_id AS "learnerId", lp.display_name AS "learnerName",
                e.course_slug AS "courseSlug", e.course_title_snapshot AS "courseTitle",
                e.status, e.created_at AS "createdAt"
           FROM student_enrolment_requests e
           JOIN learner_profiles lp ON lp.id=e.learner_id
          WHERE e.student_id=$1 ORDER BY e.created_at DESC`,
        [student.id]
      ),
      pool.query(
        `SELECT t.learner_id AS "learnerId", lp.display_name AS "learnerName",
                t.course_slug AS "courseSlug", t.course_title_snapshot AS "courseTitle",
                t.status, t.requested_at AS "requestedAt", t.scheduled_at AS "scheduledAt"
           FROM student_trial_lesson_requests t
           JOIN learner_profiles lp ON lp.id=t.learner_id
          WHERE t.student_id=$1 ORDER BY t.requested_at DESC`,
        [student.id]
      )
    ]);
    return json(res, 200, {
      student: publicStudent(student),
      learners: learners.rows.map(publicLearner),
      enrolments: enrolments.rows,
      trialLessons: trialLessons.rows
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
