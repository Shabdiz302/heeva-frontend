import { mkdir, readFile, realpath, unlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { scanTeacherPdf } from "./file-scanner.js";
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
const COOKIE_NAME = process.env.HEEVA_STUDENT_COOKIE_NAME || "__Host-heeva_preview_session";
const STAFF_COOKIE_NAME = process.env.HEEVA_STAFF_COOKIE_NAME || "__Host-heeva_staff_session";
const COOKIE_PATTERN = /^__Host-[A-Za-z0-9_-]{4,80}$/;
if (!COOKIE_PATTERN.test(COOKIE_NAME) || !COOKIE_PATTERN.test(STAFF_COOKIE_NAME) ||
    COOKIE_NAME === STAFF_COOKIE_NAME) {
  throw new Error("Invalid or overlapping Heeva session cookie names");
}
const STAFF_SESSION_HOURS = 8;
const APP_ORIGINS = new Set((process.env.APP_ORIGINS || "https://staging.heevacourses.com")
  .split(",").map((item) => item.trim()).filter(Boolean));
const DATABASE_URL = process.env.DATABASE_URL;
const PRIVATE_RESOURCES_DIR = resolve(process.env.PRIVATE_RESOURCES_DIR || "/app/private-resources");
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
const teacherCatalog = JSON.parse(await readFile(resolve(here, "../data/teachers.json"), "utf8"));
const teachersBySlug = new Map(teacherCatalog.map((teacher) => [teacher.slug, teacher]));
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
const EMAIL_REPLY_TO = process.env.EMAIL_REPLY_TO || "";

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
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "Heeva-Student-Platform/1.0"
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        ...(EMAIL_REPLY_TO ? { reply_to: [EMAIL_REPLY_TO] } : {}),
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


function setStaffSessionCookie(res, token, maxAgeSeconds) {
  res.setHeader("Set-Cookie", STAFF_COOKIE_NAME + "=" + token +
    "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + maxAgeSeconds);
}

function clearStaffSessionCookie(res) {
  res.setHeader("Set-Cookie", STAFF_COOKIE_NAME +
    "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
}

async function currentStaff(req) {
  const token = getCookie(req, STAFF_COOKIE_NAME);
  if (!token || token.length > 100) return null;
  const result = await pool.query(
    "SELECT u.id,u.email,u.display_name,u.role,u.teacher_slug,u.status,ss.id AS session_id, " +
    "(u.status='suspended' AND u.role='teacher' AND EXISTS (SELECT 1 FROM marketplace_teacher_applications a " +
    "WHERE a.staff_user_id=u.id AND a.email_verified_at IS NOT NULL AND a.status='pending_admin')) AS onboarding_only " +
    "FROM staff_sessions ss JOIN staff_users u ON u.id=ss.staff_user_id " +
    "WHERE ss.token_hash=$1 AND ss.expires_at>NOW() AND (u.status='active' OR " +
    "(u.status='suspended' AND u.role='teacher' AND EXISTS (SELECT 1 FROM marketplace_teacher_applications a " +
    "WHERE a.staff_user_id=u.id AND a.email_verified_at IS NOT NULL AND a.status='pending_admin'))) LIMIT 1",
    [hashSessionToken(token)]
  );
  return result.rows[0] || null;
}

async function createStaffSession(client, staffId, res) {
  const ttl = STAFF_SESSION_HOURS * 3600;
  const token = createSessionToken();
  await client.query(
    "INSERT INTO staff_sessions(id,staff_user_id,token_hash,expires_at) VALUES($1,$2,$3,$4)",
    [newId(),staffId,hashSessionToken(token),new Date(Date.now()+ttl*1000)]
  );
  setStaffSessionCookie(res,token,ttl);
}

async function auditStaffAction(client, staffId, action, entityType, entityId, details = {}) {
  await client.query(
    "INSERT INTO staff_audit_log(id,staff_user_id,action,entity_type,entity_id,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
    [newId(),staffId,action,entityType,entityId||null,JSON.stringify(details)]
  );
}

async function readBinary(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("File exceeds the upload size limit."),{status:413});
    chunks.push(chunk);
  }
  if (!size) throw Object.assign(new Error("The uploaded file is empty."),{status:400});
  return Buffer.concat(chunks);
}

function validResourceSignature(buffer, mimeType) {
  if (mimeType === "application/pdf") return buffer.subarray(0,5).toString("ascii") === "%PDF-";
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
      mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") {
    return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b &&
      [0x03,0x05,0x07].includes(buffer[2]) && [0x04,0x06,0x08].includes(buffer[3]);
  }
  if (mimeType === "text/plain") return !buffer.includes(0x00) &&
    new TextDecoder("utf-8",{fatal:true}).decode(buffer).length > 0;
  return false;
}

function staffCanManageEnrolment(staff, enrolment) {
  return staff.role === "admin" ||
    (staff.role === "teacher" && staff.teacher_slug && enrolment.teacher_slug === staff.teacher_slug);
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

  // Public directory exposes only a reviewed snapshot. Private applications and documents never leave the staff API.
  if (method === "GET" && path === "/api/public/educators") {
    const rows = await pool.query(
      "SELECT slug,display_name,headline,biography,subjects,languages,published_at " +
      "FROM marketplace_public_educators WHERE published=TRUE ORDER BY published_at DESC,slug ASC LIMIT 200");
    return json(res,200,{educators:rows.rows});
  }
  const publicEducator = path.match(/^\\/api\\/public\\/educators\\/([0-9a-f-]{36})$/i);
  if (method === "GET" && publicEducator) {
    const row = await pool.query(
      "SELECT slug,display_name,headline,biography,subjects,languages,published_at " +
      "FROM marketplace_public_educators WHERE slug=$1 AND published=TRUE LIMIT 1",
      [publicEducator[1]]);
    return row.rowCount ? json(res,200,{educator:row.rows[0]}) : json(res,404,{error:"Educator profile not found."});
  }

  if (method === "GET" && path === "/api/courses") {
    return json(res, 200, { courses: catalog.map(({ slug, title, status }) => ({
      slug, title, status, enrolmentOpen: status === "available"
    })) });
  }


  // Teacher self-registration: never grants staff access without email + admin approval.
  if (method === "POST" && path === "/api/teacher-applications/register") {
    if (!emailVerificationConfigured()) return json(res,503,{error:"Teacher email verification is unavailable."});
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const displayName = String(body.displayName||"").trim();
    const password = body.password;
    if(!isValidEmail(email) || displayName.length<2 || displayName.length>120 ||
       !validatePassword(password) || body.termsAccepted!==true ||
       body.privacyAccepted!==true || body.adultConfirmed!==true) {
      return json(res,400,{error:"Enter your name, email and strong password, and confirm terms, privacy and adult status."});
    }
    if(!rateLimit("teacher-register:"+email,3,60*60*1000))
      return json(res,429,{error:"Too many registration attempts. Try again later."});
    const hash=await hashPassword(password);
    const code=createEmailVerificationCode();
    const salt=createEmailVerificationSalt();
    const digest=hashEmailVerificationCode(code,salt);
    const staffId=newId();
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      await client.query(
        "INSERT INTO staff_users(id,email,display_name,password_hash,role,status) VALUES($1,$2,$3,$4,'teacher','suspended')",
        [staffId,email,displayName,hash]);
      await client.query(
        "INSERT INTO marketplace_teacher_applications(staff_user_id,terms_accepted_at,privacy_accepted_at,adult_confirmed_at,code_salt,code_hash,code_expires_at) " +
        "VALUES($1,NOW(),NOW(),NOW(),$2,$3,NOW()+INTERVAL '10 minutes')",
        [staffId,salt,digest]);
      await client.query("COMMIT");
    }catch(error){
      await client.query("ROLLBACK");
      if(error.code==="23505")return json(res,409,{error:"An account already exists for this email. Contact Heeva support if you need help."});
      throw error;
    }finally{client.release();}
    const emailSent=await sendVerificationEmail(email,displayName,code);
    return json(res,201,{ok:true,requiresEmailVerification:true,emailSent,
      message:emailSent?"Check your email for a six-digit verification code.":"Registration saved, but email delivery failed. Contact Heeva support."});
  }


  if(method === "POST" && path === "/api/teacher-applications/resend-code"){
    if(!emailVerificationConfigured())return json(res,503,{error:"Email delivery is unavailable."});
    const body=await readJson(req);
    const email=normalizeEmail(body.email);
    if(!isValidEmail(email))return json(res,400,{error:"Enter a valid email address."});
    if(!rateLimit("teacher-resend:"+email,3,60*60*1000))
      return json(res,429,{error:"Too many resend requests. Please try again later."});
    const client=await pool.connect();
    let code=null;
    let displayName="";
    try{
      await client.query("BEGIN");
      const found=await client.query(
        "SELECT a.staff_user_id,u.display_name FROM marketplace_teacher_applications a " +
        "JOIN staff_users u ON u.id=a.staff_user_id " +
        "WHERE u.email=$1 AND a.status='pending_email' AND a.last_code_sent_at<NOW()-INTERVAL '60 seconds' FOR UPDATE OF a",
        [email]);
      if(found.rowCount){
        const salt=createEmailVerificationSalt();
        code=createEmailVerificationCode();
        const digest=hashEmailVerificationCode(code,salt);
        displayName=found.rows[0].display_name;
        await client.query(
          "UPDATE marketplace_teacher_applications SET code_salt=$2,code_hash=$3,code_expires_at=NOW()+INTERVAL '10 minutes',code_attempts=0,last_code_sent_at=NOW() WHERE staff_user_id=$1",
          [found.rows[0].staff_user_id,salt,digest]);
      }
      await client.query("COMMIT");
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    if(code)await sendVerificationEmail(email,displayName,code);
    return json(res,200,{ok:true,message:"If the application is awaiting verification, a fresh code will be sent when eligible."});
  }

  if (method === "POST" && path === "/api/teacher-applications/verify-email") {
    const body=await readJson(req);
    const email=normalizeEmail(body.email);
    const code=String(body.code||"").trim();
    if(!isValidEmail(email)||!/^[0-9]{6}$/.test(code))return json(res,400,{error:"Enter a valid email and six-digit code."});
    if(!rateLimit("teacher-verify:"+email,12,60*60*1000))return json(res,429,{error:"Too many attempts. Try again later."});
    const client=await pool.connect();
    try{
      await client.query("BEGIN");
      const found=await client.query(
        "SELECT a.staff_user_id,a.code_salt,a.code_hash,a.code_expires_at,a.code_attempts " +
        "FROM marketplace_teacher_applications a JOIN staff_users u ON u.id=a.staff_user_id " +
        "WHERE u.email=$1 AND a.status='pending_email' FOR UPDATE OF a",[email]);
      if(!found.rowCount){await client.query("ROLLBACK");return json(res,400,{error:"Code invalid or expired."});}
      const row=found.rows[0];
      if(row.code_attempts>=5 || new Date(row.code_expires_at).getTime()<=Date.now()){
        await client.query("ROLLBACK");return json(res,400,{error:"Code expired or maximum attempts reached. Contact Heeva support."});
      }
      if(!verifyEmailVerificationCode(code,row.code_salt,row.code_hash)){
        await client.query("UPDATE marketplace_teacher_applications SET code_attempts=code_attempts+1 WHERE staff_user_id=$1",[row.staff_user_id]);
        await client.query("COMMIT");
        return json(res,400,{error:"Code incorrect."});
      }
      await client.query("UPDATE marketplace_teacher_applications SET status='pending_admin',email_verified_at=NOW(),code_salt='',code_hash='' WHERE staff_user_id=$1",[row.staff_user_id]);
      await client.query("COMMIT");
      return json(res,200,{ok:true,message:"Email verified. Your application is awaiting Heeva approval."});
    }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
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

  // Staff endpoints use their own staff_sessions cookie and must not be
  // blocked by the customer-session gate. Staff routes still authenticate
  // independently in the /api/staff/* handler below.
  const isStaffRoute = path.startsWith("/api/staff/");
  const student = isStaffRoute ? null : await currentStudent(req);
  if (!student && !isStaffRoute) return json(res, 401, { error: "Please sign in." });

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


  if (method === "POST" && path === "/api/staff/auth/login") {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    if (!isValidEmail(email) || !password || password.length > 128) {
      return json(res,400,{error:"Enter your staff email and password."});
    }
    if (!rateLimit("staff-login:"+email,8,15*60*1000)) {
      return json(res,429,{error:"Too many staff sign-in attempts. Please wait and try again."});
    }
    const found = await pool.query(
      "SELECT u.id,u.email,u.display_name,u.password_hash,u.role,u.teacher_slug,u.status, " +
        "(u.status='suspended' AND u.role='teacher' AND a.status='pending_admin' AND a.email_verified_at IS NOT NULL) AS onboarding_only " +
        "FROM staff_users u LEFT JOIN marketplace_teacher_applications a ON a.staff_user_id=u.id " +
        "WHERE u.email=$1 AND (u.status='active' OR (u.status='suspended' AND u.role='teacher' " +
        "AND a.status='pending_admin' AND a.email_verified_at IS NOT NULL)) LIMIT 1",
      [email]
    );
    const staff = found.rows[0];
    if (!staff || !(await verifyPassword(password,staff.password_hash))) {
      return json(res,401,{error:"Staff email or password is incorrect."});
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("DELETE FROM staff_sessions WHERE staff_user_id=$1 AND expires_at<NOW()",[staff.id]);
      await createStaffSession(client,staff.id,res);
      await client.query("UPDATE staff_users SET last_login_at=NOW() WHERE id=$1",[staff.id]);
      await auditStaffAction(client,staff.id,"staff.login","staff_user",staff.id);
      await client.query("COMMIT");
      return json(res,200,{staff:{id:staff.id,email:staff.email,displayName:staff.display_name,role:staff.role,teacherSlug:staff.teacher_slug,onboardingOnly:staff.onboarding_only===true}});
    } catch(error) {
      await client.query("ROLLBACK");
      clearStaffSessionCookie(res);
      throw error;
    } finally { client.release(); }
  }

  if (method === "POST" && path === "/api/staff/auth/logout") {
    const token = getCookie(req,STAFF_COOKIE_NAME);
    if (token) await pool.query("DELETE FROM staff_sessions WHERE token_hash=$1",[hashSessionToken(token)]);
    clearStaffSessionCookie(res);
    return json(res,200,{ok:true});
  }

  if (path.startsWith("/api/staff/")) {
    const staff = await currentStaff(req);
    if (!staff) return json(res,401,{error:"Staff sign-in required."});

    // Verified applicants may access only their own onboarding resources before approval.
    // Do not grant students, lessons, course administration, offer publishing, or other staff capabilities.
    if (staff.onboarding_only) {
      const allowed = new Set(["/api/staff/auth/me", "/api/staff/marketplace/profile",
        "/api/staff/marketplace/portrait", "/api/staff/marketplace/cv", "/api/staff/marketplace/submit"]);
      if (!allowed.has(path)) return json(res,403,{error:"Finish your private educator profile and await Heeva approval."});
    }

    if (method === "GET" && path === "/api/staff/auth/me") {
      return json(res,200,{staff:{id:staff.id,email:staff.email,displayName:staff.display_name,role:staff.role,teacherSlug:staff.teacher_slug,onboardingOnly:staff.onboarding_only===true}});
    }


    // Portrait uploads are quarantined in private storage; never served publicly.
    const ownPortrait = path === "/api/staff/marketplace/portrait" && staff.role === "teacher";
    const reviewPortraitMatch = staff.role === "admin"
      ? path.match(/^\/api\/staff\/marketplace\/review\/([0-9a-f-]{36})\/portrait$/i)
      : null;
    if (method === "GET" && (ownPortrait || reviewPortraitMatch)) {
      const result = reviewPortraitMatch
        ? await pool.query("SELECT photo_storage_key,photo_mime_type,photo_size_bytes FROM marketplace_teacher_profiles WHERE id=$1", [reviewPortraitMatch[1]])
        : await pool.query("SELECT photo_storage_key,photo_mime_type,photo_size_bytes FROM marketplace_teacher_profiles WHERE staff_user_id=$1", [staff.id]);
      const portrait = result.rows[0];
      if (!portrait?.photo_storage_key) return json(res,404,{error:"No portrait uploaded."});
      const storageKey = String(portrait.photo_storage_key);
      if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(storageKey)) return json(res,409,{error:"Invalid portrait storage reference."});
      const storagePath = resolve(PRIVATE_RESOURCES_DIR,"teacher-portraits",storageKey);
      const file = await readFile(storagePath).catch((error)=>{
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (!file || file.length !== portrait.photo_size_bytes) return json(res,404,{error:"Portrait unavailable."});
      res.writeHead(200, {
        "Content-Type":portrait.photo_mime_type,"Content-Length":file.length,
        "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
        "Content-Security-Policy":"default-src 'none'; sandbox",
        "Referrer-Policy":"no-referrer","X-Frame-Options":"DENY"
      });
      return res.end(file);
    }
    if (method === "POST" && ownPortrait) {
      const mime = String(req.headers["content-type"] || "").toLowerCase().split(";")[0].trim();
      const extensions = {"image/jpeg":".jpg","image/png":".png","image/webp":".webp"};
      if (!extensions[mime]) return json(res,415,{error:"Upload a JPEG, PNG or WebP portrait."});
      const bytes = await readBinary(req,5*1024*1024);
      const signatureOk = mime === "image/jpeg"
        ? bytes.length>3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff
        : mime === "image/png"
          ? bytes.length>24 && bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
          : bytes.length>16 && bytes.toString("ascii",0,4)==="RIFF" && bytes.toString("ascii",8,12)==="WEBP";
      if (!signatureOk) return json(res,415,{error:"The portrait content does not match the image type."});
      const client = await pool.connect();
      let newPath = null;
      try {
        await client.query("BEGIN");
        const current = await client.query(
          "SELECT id,photo_storage_key,review_status FROM marketplace_teacher_profiles WHERE staff_user_id=$1 FOR UPDATE",[staff.id]);
        if (!current.rowCount) {await client.query("ROLLBACK");return json(res,409,{error:"Save your teacher profile draft before uploading a portrait."});}
        if (current.rows[0].review_status === "pending_review") {await client.query("ROLLBACK");return json(res,409,{error:"Your profile is currently under review."});}
        const key = newId()+extensions[mime];
        const dir = resolve(PRIVATE_RESOURCES_DIR,"teacher-portraits");
        await mkdir(dir,{recursive:true,mode:0o700});
        newPath = resolve(dir,key);
        await writeFile(newPath,bytes,{flag:"wx",mode:0o600});
        await client.query(
          "UPDATE marketplace_teacher_profiles SET photo_storage_key=$2,photo_mime_type=$3,photo_size_bytes=$4,photo_uploaded_at=NOW(),review_status='draft',admin_feedback='',updated_at=NOW() WHERE staff_user_id=$1",
          [staff.id,key,mime,bytes.length]);
        await auditStaffAction(client,staff.id,"marketplace.portrait.uploaded","marketplace_teacher_profile",current.rows[0].id,{mime,size:bytes.length});
        await client.query("COMMIT");
        // Old files may be retained until a secure orphan-cleanup job is added.
        return json(res,201,{ok:true,message:"Portrait saved privately for review."});
      }catch(error){
        await client.query("ROLLBACK").catch(()=>{});
        if (newPath) await unlink(newPath).catch(()=>{});
        throw error;
      }finally{client.release();}
    }


    // Teacher CV files require an external malware scanner before they can be stored.
    // No direct public endpoints exist for these documents.
    const ownCv = path === "/api/staff/marketplace/cv" && staff.role === "teacher";
    const reviewCvMatch = staff.role === "admin"
      ? path.match(/^\/api\/staff\/marketplace\/review\/([0-9a-f-]{36})\/cv$/i)
      : null;
    if (method === "GET" && (ownCv || reviewCvMatch)) {
      const found = reviewCvMatch
        ? await pool.query("SELECT cv_storage_key,cv_original_filename,cv_size_bytes FROM marketplace_teacher_profiles WHERE id=$1",[reviewCvMatch[1]])
        : await pool.query("SELECT cv_storage_key,cv_original_filename,cv_size_bytes FROM marketplace_teacher_profiles WHERE staff_user_id=$1",[staff.id]);
      const doc = found.rows[0];
      if (!doc?.cv_storage_key) return json(res,404,{error:"No CV uploaded."});
      const key=String(doc.cv_storage_key);
      if (!/^[0-9a-f-]{36}\.pdf$/.test(key)) return json(res,409,{error:"Invalid CV storage key."});
      const file = await readFile(resolve(PRIVATE_RESOURCES_DIR,"teacher-cvs",key)).catch(e=>{
        if(e.code==="ENOENT")return null;throw e;
      });
      if (!file || file.length !== doc.cv_size_bytes) return json(res,404,{error:"CV unavailable."});
      const filename = String(doc.cv_original_filename||"Teacher-CV.pdf").replace(/[\r\n"\\/]/g,"_");
      res.writeHead(200,{
        "Content-Type":"application/pdf","Content-Length":file.length,
        "Content-Disposition":'attachment; filename="Teacher-CV.pdf"; filename*=UTF-8\'\''+encodeURIComponent(filename),
        "Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff",
        "Referrer-Policy":"no-referrer","Content-Security-Policy":"default-src 'none'; sandbox",
        "X-Frame-Options":"DENY"
      });
      return res.end(file);
    }
    if (method === "POST" && ownCv) {
      if (String(req.headers["content-type"]||"").toLowerCase().split(";")[0].trim()!=="application/pdf")
        return json(res,415,{error:"Only PDF CV documents are accepted."});
      const file = await readBinary(req,5*1024*1024);
      if (!file.subarray(0,5).equals(Buffer.from("%PDF-")))
        return json(res,415,{error:"The uploaded CV is not a PDF file."});
      let filename = "Teacher-CV.pdf";
      try{filename=decodeURIComponent(String(req.headers["x-file-name"]||filename));}
      catch{return json(res,400,{error:"Invalid filename."});}
      filename=filename.trim();
      if(!filename || filename.length>160 || !filename.toLowerCase().endsWith(".pdf") || /[\r\n\\/]/.test(filename))
        return json(res,400,{error:"Choose a PDF filename of 160 characters or less."});

      const client=await pool.connect();
      let storagePath=null;
      try{
        await client.query("BEGIN");
        const profile=await client.query(
          "SELECT id,review_status FROM marketplace_teacher_profiles WHERE staff_user_id=$1 FOR UPDATE",[staff.id]);
        if(!profile.rowCount){await client.query("ROLLBACK");return json(res,409,{error:"Save your teacher profile draft first."});}
        if(profile.rows[0].review_status==="pending_review"){
          await client.query("ROLLBACK");return json(res,409,{error:"Your profile is awaiting review."});
        }
        const dir=resolve(PRIVATE_RESOURCES_DIR,"teacher-cvs");
        await mkdir(dir,{recursive:true,mode:0o700});
        const key=newId()+".pdf";
        storagePath=resolve(dir,key);
        await writeFile(storagePath,file,{flag:"wx",mode:0o600});
        const scan=await scanTeacherPdf(storagePath);
        if(!scan.clean){
          await client.query("ROLLBACK");
          await unlink(storagePath).catch(()=>{});
          return json(res,scan.reason==="infected"?415:503,{
            error:scan.reason==="infected"?"The CV did not pass security scanning.":"CV scanning is temporarily unavailable. No file was accepted."
          });
        }
        await client.query(
          "UPDATE marketplace_teacher_profiles SET cv_storage_key=$2,cv_original_filename=$3,cv_size_bytes=$4,cv_uploaded_at=NOW(),review_status='draft',admin_feedback='',updated_at=NOW() WHERE staff_user_id=$1",
          [staff.id,key,filename,file.length]);
        await auditStaffAction(client,staff.id,"marketplace.cv.uploaded","marketplace_teacher_profile",profile.rows[0].id,{size:file.length});
        await client.query("COMMIT");
        return json(res,201,{ok:true,message:"Your private CV passed scanning and was saved for review."});
      }catch(error){
        await client.query("ROLLBACK").catch(()=>{});
        if(storagePath) await unlink(storagePath).catch(()=>{});
        throw error;
      }finally{client.release();}
    }

    // Marketplace teacher drafts are private and owned by the authenticated teacher.
    // Approval here is internal only: no public directory publishing or payment processing.
    if (path === "/api/staff/marketplace/profile" && staff.role === "teacher") {
      if (method === "GET") {
        const result = await pool.query(
          "SELECT display_name,headline,biography,subjects,languages,qualifications_summary,teaching_experience,currency,proposed_rate_pence,lesson_duration_minutes,review_status,admin_feedback,(photo_storage_key IS NOT NULL) AS has_portrait,(cv_storage_key IS NOT NULL) AS has_cv,updated_at " +
          "FROM marketplace_teacher_profiles WHERE staff_user_id=$1", [staff.id]);
        return json(res,200,{profile:result.rows[0] || null});
      }
      if (method === "PUT") {
        const body = await readJson(req);
        const value = (name,max) => typeof body[name] === "string" ? body[name].trim().slice(0,max+1) : "";
        const displayName = value("displayName",120);
        const headline = value("headline",160);
        const biography = value("biography",4000);
        const qualifications = value("qualificationsSummary",2500);
        const experience = value("teachingExperience",2500);
        const subjectList = body.subjects;
        const languageList = body.languages;
        const listValid = (list) => Array.isArray(list) && list.length <= 12 &&
          list.every(x => typeof x === "string" && x.trim().length >= 1 && x.trim().length <= 60);
        const duration = Number(body.lessonDurationMinutes);
        const rate = body.proposedRatePence === null || body.proposedRatePence === "" ? null : Number(body.proposedRatePence);
        if (!displayName || [displayName.length>120,headline.length>160,biography.length>4000,
          qualifications.length>2500,experience.length>2500].some(Boolean) ||
          !listValid(subjectList) || !listValid(languageList) ||
          ![30,45,60,90].includes(duration) ||
          (rate !== null && (!Number.isInteger(rate) || rate<100 || rate>100000))) {
          return json(res,400,{error:"Check your profile fields, subjects, languages, lesson duration and tutor rate."});
        }
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const current = await client.query(
            "SELECT review_status FROM marketplace_teacher_profiles WHERE staff_user_id=$1 FOR UPDATE", [staff.id]);
          if (current.rows[0]?.review_status === "pending_review")
            {await client.query("ROLLBACK"); return json(res,409,{error:"Your profile is awaiting review. Ask Heeva for changes."});}
          const saved = await client.query(
            "INSERT INTO marketplace_teacher_profiles(id,staff_user_id,display_name,headline,biography,subjects,languages,qualifications_summary,teaching_experience,proposed_rate_pence,lesson_duration_minutes,review_status,admin_feedback) " +
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft','') " +
            "ON CONFLICT(staff_user_id) DO UPDATE SET display_name=EXCLUDED.display_name,headline=EXCLUDED.headline,biography=EXCLUDED.biography,subjects=EXCLUDED.subjects,languages=EXCLUDED.languages,qualifications_summary=EXCLUDED.qualifications_summary,teaching_experience=EXCLUDED.teaching_experience,proposed_rate_pence=EXCLUDED.proposed_rate_pence,lesson_duration_minutes=EXCLUDED.lesson_duration_minutes,review_status='draft',admin_feedback='',updated_at=NOW() " +
            "RETURNING id", [newId(),staff.id,displayName,headline,biography,subjectList.map(x=>x.trim()),
              languageList.map(x=>x.trim()),qualifications,experience,rate,duration]);
          await auditStaffAction(client,staff.id,"marketplace.profile.saved","marketplace_teacher_profile",saved.rows[0].id);
          await client.query("COMMIT");
          return json(res,200,{ok:true});
        } catch(error) {await client.query("ROLLBACK"); throw error;} finally {client.release();}
      }
    }

    if (method === "POST" && path === "/api/staff/marketplace/submit" && staff.role === "teacher") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const changed = await client.query(
          "UPDATE marketplace_teacher_profiles SET review_status='pending_review',submitted_at=NOW(),admin_feedback='',updated_at=NOW() " +
          "WHERE staff_user_id=$1 AND review_status IN ('draft','changes_requested') AND headline<>'' AND biography<>'' " +
          "AND cardinality(subjects)>0 AND cardinality(languages)>0 AND proposed_rate_pence IS NOT NULL RETURNING id", [staff.id]);
        if (!changed.rowCount) {await client.query("ROLLBACK");return json(res,409,{error:"Save a complete draft with subject, language and tutor rate first."});}
        await auditStaffAction(client,staff.id,"marketplace.profile.submitted","marketplace_teacher_profile",changed.rows[0].id);
        await client.query("COMMIT");
        return json(res,200,{ok:true});
      } catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    }

    if (path === "/api/staff/marketplace/review" && staff.role === "admin" && method === "GET") {
      const result = await pool.query(
        "SELECT p.id,p.display_name,p.headline,p.biography,p.subjects,p.languages,p.qualifications_summary,p.teaching_experience,p.proposed_rate_pence,p.lesson_duration_minutes,p.review_status,p.admin_feedback,(p.photo_storage_key IS NOT NULL) AS has_portrait,(p.cv_storage_key IS NOT NULL) AS has_cv,p.submitted_at,p.updated_at,u.email " +
        "FROM marketplace_teacher_profiles p JOIN staff_users u ON u.id=p.staff_user_id ORDER BY p.updated_at DESC LIMIT 100"
      );
      return json(res,200,{profiles:result.rows});
    }

    const reviewMatch = path.match(/^\/api\/staff\/marketplace\/review\/([0-9a-f-]{36})$/i);
    if (reviewMatch && method === "POST" && staff.role === "admin") {
      const body = await readJson(req);
      const decision = String(body.decision || "");
      const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
      if (!["approved","changes_requested"].includes(decision) || feedback.length>1200 ||
          (decision==="changes_requested" && !feedback)) return json(res,400,{error:"Choose a valid review decision and provide feedback if requesting changes."});
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const changed = await client.query(
          "UPDATE marketplace_teacher_profiles SET review_status=$2,admin_feedback=$3,reviewed_at=NOW(),reviewed_by=$4,updated_at=NOW() " +
          "WHERE id=$1 AND review_status='pending_review' RETURNING id",
          [reviewMatch[1],decision,feedback,staff.id]);
        if (!changed.rowCount){await client.query("ROLLBACK");return json(res,409,{error:"Profile no longer awaiting review."});}
        await auditStaffAction(client,staff.id,"marketplace.profile."+decision,"marketplace_teacher_profile",changed.rows[0].id);
        await client.query("COMMIT");
        return json(res,200,{ok:true});
      }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    }


    // Course offers remain private until a separate public directory release.
    if (path === "/api/staff/marketplace/offers" && staff.role === "teacher") {
      if (method === "GET") {
        const rows = await pool.query(
          "SELECT id,course_slug,offer_title,offer_description,lesson_duration_minutes,proposed_tutor_rate_pence," +
          "review_status,admin_feedback,approved_tutor_rate_pence,approved_customer_price_pence,approved_margin_basis_points,updated_at " +
          "FROM marketplace_teacher_offers WHERE staff_user_id=$1 ORDER BY updated_at DESC LIMIT 100",[staff.id]);
        return json(res,200,{offers:rows.rows});
      }
      if (method === "POST") {
        const body = await readJson(req);
        const slug = String(body.courseSlug || "").trim();
        const title = String(body.offerTitle || "").trim();
        const description = String(body.offerDescription || "").trim();
        const duration = Number(body.lessonDurationMinutes);
        const rate = Number(body.proposedTutorRatePence);
        if (!coursesBySlug.has(slug) || title.length<3 || title.length>180 ||
            description.length>2500 || ![30,45,60,90].includes(duration) ||
            !Number.isInteger(rate) || rate<100 || rate>100000) {
          return json(res,400,{error:"Choose a listed course, title, lesson duration and valid tutor rate."});
        }
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const profile = await client.query(
            "SELECT id FROM marketplace_teacher_profiles WHERE staff_user_id=$1 AND review_status='approved'",[staff.id]);
          if (!profile.rowCount) {
            await client.query("ROLLBACK");
            return json(res,409,{error:"Your teaching profile must be approved by Heeva before proposing courses."});
          }
          const id = newId();
          await client.query(
            "INSERT INTO marketplace_teacher_offers(id,staff_user_id,profile_id,course_slug,offer_title,offer_description,lesson_duration_minutes,proposed_tutor_rate_pence) " +
            "VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
            [id,staff.id,profile.rows[0].id,slug,title,description,duration,rate]);
          await auditStaffAction(client,staff.id,"marketplace.offer.created","marketplace_teacher_offer",id,{courseSlug:slug});
          await client.query("COMMIT");
          return json(res,201,{ok:true,offerId:id});
        }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
      }
    }
    const offerSubmitMatch = path.match(/^\/api\/staff\/marketplace\/offers\/([0-9a-f-]{36})\/submit$/i);
    if (method === "POST" && offerSubmitMatch && staff.role === "teacher") {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const changed = await client.query(
          "UPDATE marketplace_teacher_offers SET review_status='pending_review',submitted_at=NOW(),admin_feedback='',updated_at=NOW() " +
          "WHERE id=$1 AND staff_user_id=$2 AND review_status IN ('draft','changes_requested') RETURNING id",
          [offerSubmitMatch[1],staff.id]);
        if(!changed.rowCount){await client.query("ROLLBACK");return json(res,409,{error:"Offer not available for submission."});}
        await auditStaffAction(client,staff.id,"marketplace.offer.submitted","marketplace_teacher_offer",changed.rows[0].id);
        await client.query("COMMIT");
        return json(res,200,{ok:true});
      }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    }
    if (method === "GET" && path === "/api/staff/marketplace/offer-review" && staff.role === "admin") {
      const rows = await pool.query(
        "SELECT o.id,o.course_slug,o.offer_title,o.offer_description,o.lesson_duration_minutes,o.proposed_tutor_rate_pence,o.review_status," +
        "o.admin_feedback,o.approved_tutor_rate_pence,o.approved_customer_price_pence,o.approved_margin_basis_points,o.submitted_at," +
        "p.display_name AS tutor_name,u.email FROM marketplace_teacher_offers o " +
        "JOIN marketplace_teacher_profiles p ON p.id=o.profile_id JOIN staff_users u ON u.id=o.staff_user_id " +
        "ORDER BY o.updated_at DESC LIMIT 100");
      return json(res,200,{offers:rows.rows});
    }
    const offerReviewMatch = path.match(/^\/api\/staff\/marketplace\/offer-review\/([0-9a-f-]{36})$/i);
    if (method === "POST" && offerReviewMatch && staff.role === "admin") {
      const body = await readJson(req);
      const decision = String(body.decision || "");
      const feedback = typeof body.feedback === "string" ? body.feedback.trim() : "";
      const marginBps = Number(body.marginBasisPoints);
      if (!["approved","changes_requested"].includes(decision) || feedback.length>1200 ||
          (decision==="changes_requested" && !feedback) ||
          (decision==="approved" && (!Number.isInteger(marginBps) || marginBps<0 || marginBps>5000))) {
        return json(res,400,{error:"Choose a valid offer decision and margin from 0% to 50%."});
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const current = await client.query(
          "SELECT id,proposed_tutor_rate_pence FROM marketplace_teacher_offers WHERE id=$1 AND review_status='pending_review' FOR UPDATE",
          [offerReviewMatch[1]]);
        if(!current.rowCount){await client.query("ROLLBACK");return json(res,409,{error:"Offer is no longer awaiting review."});}
        const tutorRate = current.rows[0].proposed_tutor_rate_pence;
        // Margin (not markup) on the final selling price. Round UP to whole pence.
        const retail = decision === "approved" ? Math.ceil(tutorRate * 10000 / (10000-marginBps)) : null;
        if (retail !== null && retail>200000) {await client.query("ROLLBACK");return json(res,400,{error:"Approved selling price exceeds the permitted limit."});}
        await client.query(
          "UPDATE marketplace_teacher_offers SET review_status=$2,admin_feedback=$3," +
          "approved_tutor_rate_pence=$4,approved_customer_price_pence=$5,approved_margin_basis_points=$6," +
          "reviewed_by=$7,reviewed_at=NOW(),updated_at=NOW() WHERE id=$1",
          [offerReviewMatch[1],decision,feedback,
            decision==="approved"?tutorRate:null,retail,decision==="approved"?marginBps:null,staff.id]);
        await auditStaffAction(client,staff.id,"marketplace.offer."+decision,"marketplace_teacher_offer",offerReviewMatch[1],{
          approvedTutorRatePence:decision==="approved"?tutorRate:null,
          approvedCustomerPricePence:retail,marginBasisPoints:decision==="approved"?marginBps:null
        });
        await client.query("COMMIT");
        return json(res,200,{ok:true,approvedCustomerPricePence:retail});
      }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    }


    // Administrators can remove a previously approved public profile immediately.
    const unpublish = path.match(/^\\/api\\/staff\\/marketplace\\/public-educators\\/([0-9a-f-]{36})\\/unpublish$/i);
    if (method==="POST" && unpublish && staff.role==="admin") {
      const client=await pool.connect();
      try {
        await client.query("BEGIN");
        const updated=await client.query(
          "UPDATE marketplace_public_educators SET published=FALSE,updated_at=NOW() " +
          "WHERE profile_id=$1 AND published=TRUE RETURNING profile_id",[unpublish[1]]);
        if (!updated.rowCount) {await client.query("ROLLBACK");return json(res,404,{error:"Published educator not found."});}
        await auditStaffAction(client,staff.id,"marketplace.educator.unpublished","marketplace_teacher_profile",unpublish[1]);
        await client.query("COMMIT");
        return json(res,200,{ok:true});
      } catch(error) {await client.query("ROLLBACK");throw error;}finally{client.release();}
    }

    if (method === "GET" && path === "/api/staff/marketplace/applications" && staff.role === "admin") {
      const applications=await pool.query(
        "SELECT a.staff_user_id AS id,a.status,a.email_verified_at,a.created_at,a.reviewer_feedback," +
        "u.email,u.display_name FROM marketplace_teacher_applications a " +
        "JOIN staff_users u ON u.id=a.staff_user_id ORDER BY a.created_at DESC LIMIT 100");
      return json(res,200,{applications:applications.rows});
    }
    const teacherApplicationDecision=path.match(/^\/api\/staff\/marketplace\/applications\/([0-9a-f-]{36})\/decision$/i);
    if(method==="POST" && teacherApplicationDecision && staff.role==="admin"){
      const body=await readJson(req);
      const decision=String(body.decision||"");
      const feedback=typeof body.feedback==="string"?body.feedback.trim():"";
      if(!["approved","rejected"].includes(decision)||feedback.length>1200||
         (decision==="approved" && body.confirmSafeguarding!==true)||
        (decision==="rejected"&&!feedback))return json(res,400,{error:"Choose approve or reject, with a reason for rejection."});
      const client=await pool.connect();
      try{
        await client.query("BEGIN");
        const changed=await client.query(
          "UPDATE marketplace_teacher_applications SET status=$2,reviewed_by=$3,reviewed_at=NOW(),reviewer_feedback=$4 " +
          "WHERE staff_user_id=$1 AND status='pending_admin' AND ($2<>'approved' OR EXISTS (" +
          "SELECT 1 FROM marketplace_teacher_profiles p WHERE p.staff_user_id=$1 AND p.review_status='approved')) RETURNING staff_user_id",
          [teacherApplicationDecision[1],decision,staff.id,feedback]);
        if(!changed.rowCount){await client.query("ROLLBACK");return json(res,409,{error:"Application is not awaiting review."});}
        if (decision==="approved") {
          await client.query(
            "UPDATE staff_users SET status='active',updated_at=NOW() WHERE id=$1 AND role='teacher' AND status='suspended'",
            [teacherApplicationDecision[1]]);
          // Publishing is a reviewed snapshot; later drafts cannot silently alter the public page.
          await client.query(
            "INSERT INTO marketplace_public_educators(profile_id,slug,display_name,headline,biography,subjects,languages,published,published_at) " +
            "SELECT p.id,p.id::text,p.display_name,p.headline,p.biography,p.subjects,p.languages,TRUE,NOW() " +
            "FROM marketplace_teacher_profiles p WHERE p.staff_user_id=$1 AND p.review_status='approved' " +
            "ON CONFLICT(profile_id) DO UPDATE SET display_name=EXCLUDED.display_name,headline=EXCLUDED.headline," +
            "biography=EXCLUDED.biography,subjects=EXCLUDED.subjects,languages=EXCLUDED.languages," +
            "published=TRUE,published_at=NOW(),updated_at=NOW()",
            [teacherApplicationDecision[1]]);
        }
        await auditStaffAction(client,staff.id,"marketplace.application."+decision,"staff_user",teacherApplicationDecision[1]);
        await client.query("COMMIT");
        return json(res,200,{ok:true});
      }catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}
    }

    if (method === "GET" && path === "/api/staff/teachers") {
      return json(res,200,{teachers:teacherCatalog});
    }

    if (method === "GET" && path === "/api/staff/dashboard") {
      const teacherArgs = staff.role === "teacher" ? [staff.teacher_slug] : [];
      const teacherWhere = staff.role === "teacher" ? " AND e.teacher_slug=$1" : "";
      const [requests,enrolments,upcoming,resources] = await Promise.all([
        staff.role === "admin"
          ? pool.query("SELECT COUNT(*)::int AS count FROM student_enrolment_requests WHERE status IN ('requested','approved','payment_pending')")
          : pool.query("SELECT COUNT(*)::int AS count FROM student_course_enrolments e WHERE e.teacher_slug=$1 AND e.status IN ('active','paused')",teacherArgs),
        pool.query("SELECT COUNT(*)::int AS count FROM student_course_enrolments e WHERE e.status IN ('active','paused')"+teacherWhere,teacherArgs),
        staff.role === "admin"
          ? pool.query("SELECT COUNT(*)::int AS count FROM student_course_lessons WHERE status='scheduled' AND scheduled_at>=NOW()")
          : pool.query("SELECT COUNT(*)::int AS count FROM student_course_lessons l JOIN student_course_enrolments e ON e.id=l.course_enrolment_id WHERE l.status='scheduled' AND l.scheduled_at>=NOW() AND e.teacher_slug=$1",teacherArgs),
        staff.role === "admin"
          ? pool.query("SELECT COUNT(*)::int AS count FROM student_course_resources WHERE status='published'")
          : pool.query("SELECT COUNT(*)::int AS count FROM student_course_resources r JOIN student_course_enrolments e ON e.id=r.course_enrolment_id WHERE r.status='published' AND e.teacher_slug=$1",teacherArgs)
      ]);
      return json(res,200,{counts:{
        pendingRequests:requests.rows[0].count,
        activeEnrolments:enrolments.rows[0].count,
        upcomingLessons:upcoming.rows[0].count,
        publishedResources:resources.rows[0].count
      }});
    }

    if (method === "GET" && path === "/api/staff/enrolment-requests") {
      if (staff.role !== "admin") return json(res,403,{error:"Only administrators can approve enrolment requests."});
      const result = await pool.query(
        "SELECT e.id,e.student_id AS student_id,s.first_name AS account_first_name,s.last_name AS account_last_name,s.email,"+
        "lp.id AS learner_id,lp.display_name AS learner_name,e.course_slug AS course_slug,"+
        "e.course_title_snapshot AS course_title,e.status,e.created_at AS created_at "+
        "FROM student_enrolment_requests e JOIN students s ON s.id=e.student_id "+
        "JOIN learner_profiles lp ON lp.id=e.learner_id "+
        "WHERE e.status IN ('requested','approved','payment_pending') ORDER BY e.created_at ASC"
      );
      return json(res,200,{requests:result.rows});
    }

    if (method === "GET" && path === "/api/staff/course-enrolments") {
      const result = await pool.query(
        "SELECT e.id,e.learner_id AS learner_id,lp.display_name AS learner_name,s.email,"+
        "e.course_slug AS course_slug,e.course_title_snapshot AS course_title,"+
        "e.total_lessons AS total_lessons,e.teacher_slug AS teacher_slug,e.status,"+
        "e.started_at AS started_at,COUNT(l.id) FILTER (WHERE l.status='completed')::int AS completed_lessons "+
        "FROM student_course_enrolments e JOIN learner_profiles lp ON lp.id=e.learner_id "+
        "JOIN students s ON s.id=e.student_id LEFT JOIN student_course_lessons l ON l.course_enrolment_id=e.id "+
        "WHERE e.status IN ('active','paused')"+
        (staff.role === "teacher" ? " AND e.teacher_slug=$1" : "")+
        " GROUP BY e.id,lp.display_name,s.email ORDER BY e.started_at DESC",
        staff.role === "teacher" ? [staff.teacher_slug] : []
      );
      return json(res,200,{enrolments:result.rows});
    }

    const activateMatch = path.match(/^\/api\/staff\/enrolment-requests\/([0-9a-f-]{36})\/activate$/i);
    if (method === "POST" && activateMatch) {
      if (staff.role !== "admin") return json(res,403,{error:"Only administrators can activate enrolments."});
      const requestId = activateMatch[1];
      const body = await readJson(req);
      const totalLessons = Number(body.totalLessons);
      const teacherSlug = body.teacherSlug ? String(body.teacherSlug) : null;
      if (!Number.isInteger(totalLessons) || totalLessons < 1 || totalLessons > 500) {
        return json(res,400,{error:"Enter a lesson package between 1 and 500 lessons."});
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query(
          "SELECT e.*,lp.display_name AS learner_name FROM student_enrolment_requests e "+
          "JOIN learner_profiles lp ON lp.id=e.learner_id WHERE e.id=$1 FOR UPDATE OF e",
          [requestId]
        );
        if (!found.rowCount) { await client.query("ROLLBACK"); return json(res,404,{error:"Enrolment request not found."}); }
        const request = found.rows[0];
        if (!["requested","approved","payment_pending"].includes(request.status)) {
          await client.query("ROLLBACK");
          return json(res,409,{error:"This request is not awaiting activation."});
        }
        if (teacherSlug) {
          const teacher = teachersBySlug.get(teacherSlug);
          if (!teacher || !teacher.courseSlugs.includes(request.course_slug)) {
            await client.query("ROLLBACK");
            return json(res,400,{error:"The selected teacher is not listed for this course."});
          }
        }
        const inserted = await client.query(
          "INSERT INTO student_course_enrolments(id,student_id,learner_id,enrolment_request_id,course_slug,course_title_snapshot,total_lessons,teacher_slug,status) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7,$8,'active') RETURNING id",
          [newId(),request.student_id,request.learner_id,request.id,request.course_slug,request.course_title_snapshot,totalLessons,teacherSlug]
        );
        await client.query("UPDATE student_enrolment_requests SET status='active',updated_at=NOW() WHERE id=$1",[request.id]);
        await auditStaffAction(client,staff.id,"enrolment.activated","course_enrolment",inserted.rows[0].id,{
          requestId:request.id,learnerName:request.learner_name,totalLessons,teacherSlug
        });
        await client.query("COMMIT");
        return json(res,201,{ok:true,courseEnrolmentId:inserted.rows[0].id});
      } catch(error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") return json(res,409,{error:"This enrolment request has already been activated."});
        throw error;
      } finally { client.release(); }
    }

    const lessonsCollection = path.match(/^\/api\/staff\/course-enrolments\/([0-9a-f-]{36})\/lessons$/i);
    if (method === "POST" && lessonsCollection) {
      const enrolmentId = lessonsCollection[1];
      const body = await readJson(req);
      const title = String(body.title || "").trim();
      const lessonNumber = Number(body.lessonNumber);
      const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
      if (!title || title.length > 180 || !Number.isInteger(lessonNumber) || (scheduledAt && Number.isNaN(scheduledAt.getTime()))) {
        return json(res,400,{error:"Enter a lesson title, valid lesson number and optional valid date/time."});
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query("SELECT id,teacher_slug,total_lessons FROM student_course_enrolments WHERE id=$1 FOR UPDATE",[enrolmentId]);
        if (!found.rowCount) { await client.query("ROLLBACK"); return json(res,404,{error:"Course enrolment not found."}); }
        const enrolment = found.rows[0];
        if (!staffCanManageEnrolment(staff,enrolment)) { await client.query("ROLLBACK"); return json(res,403,{error:"You cannot manage lessons for this course."}); }
        if (lessonNumber < 1 || lessonNumber > enrolment.total_lessons) { await client.query("ROLLBACK"); return json(res,400,{error:"Lesson number must be within the purchased lesson package."}); }
        const inserted = await client.query(
          "INSERT INTO student_course_lessons(id,course_enrolment_id,lesson_number,title,scheduled_at) "+
          "VALUES($1,$2,$3,$4,$5) RETURNING id,lesson_number AS lesson_number,title,status,scheduled_at AS scheduled_at",
          [newId(),enrolmentId,lessonNumber,title,scheduledAt]
        );
        await auditStaffAction(client,staff.id,"lesson.scheduled","course_lesson",inserted.rows[0].id,{enrolmentId,lessonNumber});
        await client.query("COMMIT");
        return json(res,201,{lesson:inserted.rows[0]});
      } catch(error) {
        await client.query("ROLLBACK");
        if (error.code === "23505") return json(res,409,{error:"That lesson number already exists for this course."});
        throw error;
      } finally { client.release(); }
    }

    const lessonsList = path.match(/^\/api\/staff\/course-enrolments\/([0-9a-f-]{36})\/lessons$/i);
    if (method === "GET" && lessonsList) {
      const enrolmentId = lessonsList[1];
      const enrolment = await pool.query("SELECT id,teacher_slug FROM student_course_enrolments WHERE id=$1",[enrolmentId]);
      if (!enrolment.rowCount) return json(res,404,{error:"Course enrolment not found."});
      if (!staffCanManageEnrolment(staff,enrolment.rows[0])) return json(res,403,{error:"You cannot view lessons for this course."});
      const result = await pool.query(
        "SELECT id,lesson_number AS lesson_number,title,status,scheduled_at AS scheduled_at,completed_at AS completed_at,tutor_note AS tutor_note "+
        "FROM student_course_lessons WHERE course_enrolment_id=$1 ORDER BY lesson_number",
        [enrolmentId]
      );
      return json(res,200,{lessons:result.rows});
    }

    const lessonUpdate = path.match(/^\/api\/staff\/lessons\/([0-9a-f-]{36})$/i);
    if (method === "PUT" && lessonUpdate) {
      const lessonId = lessonUpdate[1];
      const body = await readJson(req);
      const status = String(body.status || "");
      const note = String(body.tutorNote || "").trim();
      if (!["scheduled","completed","cancelled","missed"].includes(status) || note.length > 2000) {
        return json(res,400,{error:"Select a valid lesson status and keep notes under 2,000 characters."});
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const found = await client.query(
          "SELECT l.id,l.course_enrolment_id,e.teacher_slug FROM student_course_lessons l "+
          "JOIN student_course_enrolments e ON e.id=l.course_enrolment_id WHERE l.id=$1 FOR UPDATE OF l",
          [lessonId]
        );
        if (!found.rowCount) { await client.query("ROLLBACK"); return json(res,404,{error:"Lesson not found."}); }
        if (!staffCanManageEnrolment(staff,found.rows[0])) { await client.query("ROLLBACK"); return json(res,403,{error:"You cannot update this lesson."}); }
        const updated = await client.query(
          "UPDATE student_course_lessons SET status=$1,completed_at=CASE WHEN $1='completed' THEN COALESCE(completed_at,NOW()) ELSE NULL END,"+
          "tutor_note=$2,updated_at=NOW() WHERE id=$3 RETURNING id,status,completed_at AS completed_at",
          [status,note || null,lessonId]
        );
        await auditStaffAction(client,staff.id,"lesson.updated","course_lesson",lessonId,{status});
        await client.query("COMMIT");
        return json(res,200,{lesson:updated.rows[0]});
      } catch(error) { await client.query("ROLLBACK"); throw error; }
      finally { client.release(); }
    }

    const resourceUpload = path.match(/^\/api\/staff\/course-enrolments\/([0-9a-f-]{36})\/resources$/i);
    if (method === "POST" && resourceUpload) {
      const enrolmentId = resourceUpload[1];
      const mimeType = String(req.headers["content-type"] || "").toLowerCase().split(";")[0].trim();
      const extensions = {
        "application/pdf":".pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document":".docx",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation":".pptx",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":".xlsx",
        "text/plain":".txt"
      };
      if (!extensions[mimeType]) return json(res,415,{error:"Only PDF, DOCX, PPTX, XLSX and TXT files are accepted."});
      let filename;
      try { filename = decodeURIComponent(String(req.headers["x-file-name"] || "lesson-material")).replace(/[\\\/\r\n"]/g,"_"); }
      catch { return json(res,400,{error:"Invalid file name."}); }
      if (!filename || filename.length > 240 || !filename.toLowerCase().endsWith(extensions[mimeType])) {
        return json(res,400,{error:"File name must match the selected file type."});
      }
      let title;
      let description;
      try {
        title = decodeURIComponent(String(req.headers["x-resource-title"] || filename)).trim();
        description = decodeURIComponent(String(req.headers["x-resource-description"] || "")).trim();
      } catch {
        return json(res,400,{error:"Document title or description contains invalid encoding."});
      }
      if (!title || title.length > 180 || description.length > 500) return json(res,400,{error:"Enter a valid document title and description."});
      const lessonId = req.headers["x-lesson-id"] ? String(req.headers["x-lesson-id"]) : null;
      const client = await pool.connect();
      let storagePath = null;
      try {
        await client.query("BEGIN");
        const found = await client.query("SELECT id,teacher_slug FROM student_course_enrolments WHERE id=$1 FOR UPDATE",[enrolmentId]);
        if (!found.rowCount) { await client.query("ROLLBACK"); return json(res,404,{error:"Course enrolment not found."}); }
        if (!staffCanManageEnrolment(staff,found.rows[0])) { await client.query("ROLLBACK"); return json(res,403,{error:"You cannot upload materials to this course."}); }
        if (lessonId) {
          const lesson = await client.query("SELECT id FROM student_course_lessons WHERE id=$1 AND course_enrolment_id=$2",[lessonId,enrolmentId]);
          if (!lesson.rowCount) { await client.query("ROLLBACK"); return json(res,400,{error:"The selected lesson does not belong to this course."}); }
        }
        const file = await readBinary(req,20*1024*1024);
        let signatureValid = false;
        try { signatureValid = validResourceSignature(file,mimeType); } catch { signatureValid = false; }
        if (!signatureValid) {
          await client.query("ROLLBACK");
          return json(res,415,{error:"The file contents do not match the selected document type."});
        }
        await mkdir(PRIVATE_RESOURCES_DIR,{recursive:true,mode:0o700});
        const resourceId = newId();
        const storageKey = resourceId + extensions[mimeType];
        storagePath = resolve(PRIVATE_RESOURCES_DIR,storageKey);
        await writeFile(storagePath,file,{flag:"wx",mode:0o600});
        const inserted = await client.query(
          "INSERT INTO student_course_resources(id,course_enrolment_id,lesson_id,title,description,original_filename,storage_key,mime_type,file_size_bytes,status,published_at) "+
          "VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'published',NOW()) RETURNING id,title,original_filename AS filename,file_size_bytes AS file_size_bytes",
          [resourceId,enrolmentId,lessonId,title,description || null,filename,storageKey,mimeType,file.length]
        );
        await auditStaffAction(client,staff.id,"resource.published","course_resource",resourceId,{enrolmentId,filename,mimeType});
        await client.query("COMMIT");
        return json(res,201,{resource:inserted.rows[0]});
      } catch(error) {
        await client.query("ROLLBACK");
        if (storagePath) await unlink(storagePath).catch(()=>{});
        throw error;
      } finally { client.release(); }
    }

    return json(res,404,{error:"Staff route not found."});
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

  const resourceDownloadMatch = path.match(/^\/api\/student\/resources\/([0-9a-f-]{36})\/download$/i);
  if (method === "GET" && resourceDownloadMatch) {
    const resourceId = resourceDownloadMatch[1];
    const result = await pool.query(
      `SELECT r.original_filename, r.storage_key, r.mime_type, r.file_size_bytes
         FROM student_course_resources r
         JOIN student_course_enrolments e ON e.id=r.course_enrolment_id
        WHERE r.id=$1 AND e.student_id=$2
          AND e.status IN ('active', 'completed')
          AND r.status='published'`,
      [resourceId, student.id]
    );
    if (!result.rowCount) return json(res, 404, { error: "Lesson resource not found." });

    const resource = result.rows[0];
    const storageKey = String(resource.storage_key || "");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]{0,239}$/.test(storageKey) ||
        storageKey.split("/").some((part) => !part || part === "." || part === "..")) {
      console.error("Rejected unsafe resource storage key.");
      return json(res, 404, { error: "Lesson resource not found." });
    }
    const filePath = resolve(PRIVATE_RESOURCES_DIR, storageKey);
    if (!filePath.startsWith(PRIVATE_RESOURCES_DIR + sep)) {
      return json(res, 404, { error: "Lesson resource not found." });
    }
    let file;
    try {
      const [privateRoot, actualFile] = await Promise.all([
        realpath(PRIVATE_RESOURCES_DIR),
        realpath(filePath)
      ]);
      if (!actualFile.startsWith(privateRoot + sep)) {
        return json(res, 404, { error: "Lesson resource not found." });
      }
      file = await readFile(actualFile);
    } catch (error) {
      if (error.code === "ENOENT" || error.code === "ENOTDIR") {
        return json(res, 404, { error: "The lesson file is not available yet." });
      }
      throw error;
    }
    if (file.length !== Number(resource.file_size_bytes)) {
      console.error("Private lesson resource size did not match its catalogue record.");
      return json(res, 409, { error: "The lesson file is being updated. Please try again later." });
    }
    const safeFilename = String(resource.original_filename).replace(/[\\r\\n"]/g, "_");
    res.writeHead(200, {
      "Content-Type": resource.mime_type,
      "Content-Length": file.length,
      "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${encodeURIComponent(resource.original_filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY"
    });
    return res.end(file);
  }

  if (method === "GET" && path === "/api/student/dashboard") {
    const [learners, enrolments, trialLessons, courseEnrolments, courseResources, pendingRequests] = await Promise.all([
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
      ),
      pool.query(
        `SELECT e.id, e.learner_id AS "learnerId", lp.display_name AS "learnerName",
                e.course_slug AS "courseSlug", e.course_title_snapshot AS "courseTitle",
                e.total_lessons AS "totalLessons", e.teacher_slug AS "teacherSlug",
                e.status, e.started_at AS "startedAt",
                COUNT(l.id) FILTER (WHERE l.status='completed')::int AS "completedLessons",
                GREATEST(e.total_lessons - COUNT(l.id) FILTER (WHERE l.status='completed'), 0)::int AS "remainingLessons",
                CASE WHEN e.total_lessons > 0
                  THEN LEAST(100, ROUND(100.0 * COUNT(l.id) FILTER (WHERE l.status='completed') / e.total_lessons))::int
                  ELSE 0 END AS "progressPercent",
                MIN(l.scheduled_at) FILTER (
                  WHERE l.status='scheduled' AND l.scheduled_at >= NOW()
                ) AS "nextLessonAt"
           FROM student_course_enrolments e
           JOIN learner_profiles lp ON lp.id=e.learner_id
           LEFT JOIN student_course_lessons l ON l.course_enrolment_id=e.id
          WHERE e.student_id=$1 AND e.status IN ('active','paused','completed')
          GROUP BY e.id, lp.display_name
          ORDER BY e.started_at DESC`,
        [student.id]
      ),
      pool.query(
        `SELECT r.id, r.course_enrolment_id AS "courseEnrolmentId",
                e.learner_id AS "learnerId", lp.display_name AS "learnerName",
                e.course_slug AS "courseSlug", e.course_title_snapshot AS "courseTitle",
                r.lesson_id AS "lessonId", r.title, r.description,
                r.original_filename AS "filename", r.mime_type AS "mimeType",
                r.file_size_bytes AS "fileSizeBytes", r.created_at AS "createdAt"
           FROM student_course_resources r
           JOIN student_course_enrolments e ON e.id=r.course_enrolment_id
           JOIN learner_profiles lp ON lp.id=e.learner_id
          WHERE e.student_id=$1 AND e.status IN ('active','completed')
            AND r.status='published'
          ORDER BY e.course_title_snapshot, r.created_at DESC`,
        [student.id]
      ),
      pool.query(
        `SELECT e.id, e.learner_id AS "learnerId", lp.display_name AS "learnerName",
                e.course_slug AS "courseSlug", e.course_title_snapshot AS "courseTitle",
                e.status, e.created_at AS "createdAt"
           FROM student_enrolment_requests e
           JOIN learner_profiles lp ON lp.id=e.learner_id
          WHERE e.student_id=$1 AND e.status IN ('requested','approved','payment_pending')
          ORDER BY e.created_at DESC`,
        [student.id]
      )
    ]);
    return json(res, 200, {
      student: publicStudent(student),
      learners: learners.rows.map(publicLearner),
      enrolments: enrolments.rows,
      pendingRequests: pendingRequests.rows,
      trialLessons: trialLessons.rows,
      courseEnrolments: courseEnrolments.rows,
      courseResources: courseResources.rows.map((resource) => ({
        ...resource,
        downloadUrl: `/student-preview-api/api/student/resources/${resource.id}/download`
      }))
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
