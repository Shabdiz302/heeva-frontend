import { hashPassword, isValidEmail, normalizeEmail, validatePassword, newId } from "./security.js";
import pg from "pg";

const { Pool } = pg;
const [emailArg, nameArg, roleArg = "admin", teacherSlugArg = ""] = process.argv.slice(2);
const email = normalizeEmail(emailArg);
const displayName = String(nameArg || "").trim();
const role = roleArg;

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
if (!isValidEmail(email) || displayName.length < 2 || displayName.length > 120) {
  throw new Error("Usage: node src/create-staff-user.js <email> <display-name> <admin|teacher> [teacher-slug]");
}
if (!["admin", "teacher"].includes(role)) throw new Error("Role must be admin or teacher.");
if ((role === "teacher" && !teacherSlugArg) || (role === "admin" && teacherSlugArg)) {
  throw new Error("Teacher accounts require a teacher slug; admin accounts must not have one.");
}

const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const password = Buffer.concat(chunks).toString("utf8").replace(/[\r\n]+$/, "");
if (!validatePassword(password)) {
  throw new Error("Password must be at least 8 characters and include upper-case, lower-case and a number.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
try {
  const passwordHash = await hashPassword(password);
  const result = await pool.query(
    "INSERT INTO staff_users(id,email,display_name,password_hash,role,teacher_slug) VALUES($1,$2,$3,$4,$5,$6) " +
    "RETURNING id,email,display_name,role,teacher_slug",
    [newId(), email, displayName, passwordHash, role, teacherSlugArg || null]
  );
  console.log("Staff account created:", JSON.stringify(result.rows[0]));
} finally {
  await pool.end();
}
