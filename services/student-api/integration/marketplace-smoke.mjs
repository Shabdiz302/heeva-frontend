// Run ONLY against a disposable database: DATABASE_URL=... node tests/marketplace-integration.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { hashPassword, newId } from "../src/security.js";

const { Pool } = pg;
const PORT = 3147;
const BASE = `http://127.0.0.1:${PORT}`;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !databaseUrl.includes("heeva_marketplace_test")) {
  throw new Error("Refusing to run marketplace integration against a database without the isolated test name.");
}
const pool = new Pool({ connectionString: databaseUrl });
const privateDir = await mkdtemp(join(tmpdir(), "heeva-marketplace-private-"));
const server = spawn(process.execPath, ["src/server.js"], {
  cwd: new URL("../", import.meta.url).pathname,
  env: {
    ...process.env,
    PORT: String(PORT),
    APP_ORIGINS: BASE,
    COOKIE_SECURE: "true",
    PRIVATE_RESOURCES_DIR: privateDir,
    RESEND_API_KEY: "",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let stderr = "";
server.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

async function call(path, method = "GET", cookie = "", body = null, contentType = "application/json") {
  const headers = { Origin: BASE };
  if (cookie) headers.Cookie = cookie;
  if (body !== null) headers["Content-Type"] = contentType;
  const response = await fetch(BASE + path, { method, headers, body: body === null ? undefined
    : contentType === "application/json" ? JSON.stringify(body) : body });
  const type = response.headers.get("content-type") || "";
  const payload = type.includes("application/json") ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, data: payload };
}
async function login(email) {
  const r = await call("/api/staff/auth/login", "POST", "", { email, password: "OnlyForTesting123!" });
  assert.equal(r.response.status, 200, JSON.stringify(r.data));
  const cookie = r.response.headers.get("set-cookie")?.split(";")[0];
  assert.ok(cookie?.startsWith("__Host-heeva_staff_session="));
  return cookie;
}
async function ready() {
  for (let i = 0; i < 80; i++) {
    try { const r = await call("/api/health"); if (r.response.status === 200) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error("Marketplace integration API did not start. " + stderr.slice(-800));
}
try {
  const hashed = await hashPassword("OnlyForTesting123!");
  for (const [email, role] of [
    ["market-admin@example.invalid","admin"],
    ["market-tutor-one@example.invalid","teacher"],
    ["market-tutor-two@example.invalid","teacher"],
  ]) {
    await pool.query(
      "INSERT INTO staff_users(id,email,display_name,password_hash,role,status) VALUES($1,$2,$3,$4,$5,'active')",
      [newId(),email, email.split("@")[0],hashed,role]
    );
  }
  const applicantId = newId();
  await pool.query(
    "INSERT INTO staff_users(id,email,display_name,password_hash,role,status) VALUES($1,$2,$3,$4,'teacher','suspended')",
    [applicantId,"market-applicant@example.invalid","Market Applicant",hashed]
  );
  await pool.query(
    "INSERT INTO marketplace_teacher_applications(staff_user_id,status,terms_accepted_at,privacy_accepted_at,adult_confirmed_at,email_verified_at,code_salt,code_hash,code_expires_at) " +
    "VALUES($1,'pending_admin',NOW(),NOW(),NOW(),NOW(),'test','test',NOW())",[applicantId]
  );
  await ready();
  const blockedLogin = await call("/api/staff/auth/login","POST","",{
    email:"market-applicant@example.invalid",password:"OnlyForTesting123!"
  });
  assert.equal(blockedLogin.response.status,401);
  const admin = await login("market-admin@example.invalid");
  const requests = (await call("/api/staff/marketplace/applications","GET",admin)).data.applications;
  assert.ok(requests.find(a=>a.id===applicantId&&a.status==="pending_admin"));
  const accepted=await call("/api/staff/marketplace/applications/"+applicantId+"/decision",
    "POST",admin,{decision:"approved",feedback:"Test approval"});
  assert.equal(accepted.response.status,200,JSON.stringify(accepted.data));
  const applicant=await login("market-applicant@example.invalid");
  assert.ok(applicant);
  assert.equal((await call("/api/staff/marketplace/applications","GET",applicant)).response.status,404);
  const tutorOne = await login("market-tutor-one@example.invalid");
  const tutorTwo = await login("market-tutor-two@example.invalid");

  const fields = (name) => ({
    displayName:name, headline:"Online piano tutor", biography:"Friendly individual piano instruction.",
    subjects:["Piano"], languages:["English"], qualificationsSummary:"Music training",
    teachingExperience:"Several years teaching.", proposedRatePence:2000,lessonDurationMinutes:60
  });
  const save = await call("/api/staff/marketplace/profile","PUT",tutorOne,fields("Tutor One"));
  assert.equal(save.response.status,200,JSON.stringify(save.data));
  assert.equal((await call("/api/staff/marketplace/profile","GET",tutorTwo)).data.profile,null);

  const fakeJpeg = Buffer.from([0xff,0xd8,0xff,0xe0,0x00,0x10,0x4a,0x46,0x49,0x46]);
  const photo = await call("/api/staff/marketplace/portrait","POST",tutorOne,fakeJpeg,"image/jpeg");
  assert.equal(photo.response.status,201,JSON.stringify(photo.data));
  assert.equal((await call("/api/staff/marketplace/portrait","GET",tutorOne)).response.status,200);
  assert.equal((await call("/api/staff/marketplace/portrait","GET",tutorTwo)).response.status,404);

  assert.equal((await call("/api/staff/marketplace/submit","POST",tutorOne,{})).response.status,200);
  const profiles = (await call("/api/staff/marketplace/review","GET",admin)).data.profiles;
  const profile = profiles.find(p => p.email === "market-tutor-one@example.invalid");
  assert.ok(profile?.id);
  assert.equal((await call("/api/staff/marketplace/review/"+profile.id,"POST",tutorOne,{decision:"approved"})).response.status,404); // Deliberately do not disclose admin-only endpoint
  const approval = await call("/api/staff/marketplace/review/"+profile.id,"POST",admin,{decision:"approved",feedback:"Approved for isolated testing"});
  assert.equal(approval.response.status,200,JSON.stringify(approval.data));

  const catalogue = (await call("/api/courses","GET")).data;
  const listed = Array.isArray(catalogue) ? catalogue : catalogue.courses;
  assert.ok(Array.isArray(listed)&&listed.length>0);
  const courseSlug = listed[0].slug;
  const proposal = await call("/api/staff/marketplace/offers","POST",tutorOne,{
    courseSlug, offerTitle:"Private beginner piano tutoring", offerDescription:"A guided course.",
    lessonDurationMinutes:60, proposedTutorRatePence:2000
  });
  assert.equal(proposal.response.status,201,JSON.stringify(proposal.data));
  const offerId = proposal.data.offerId;
  assert.equal((await call("/api/staff/marketplace/offers/"+offerId+"/submit","POST",tutorTwo,{})).response.status,409);
  assert.equal((await call("/api/staff/marketplace/offers/"+offerId+"/submit","POST",tutorOne,{})).response.status,200);
  const reviewed = await call("/api/staff/marketplace/offer-review/"+offerId,"POST",admin,{
    decision:"approved",marginBasisPoints:2500,feedback:"Approved for integration test"
  });
  assert.equal(reviewed.response.status,200,JSON.stringify(reviewed.data));
  assert.equal(reviewed.data.approvedCustomerPricePence,2667);
  const own = (await call("/api/staff/marketplace/offers","GET",tutorOne)).data.offers;
  assert.equal(own.find(x => x.id === offerId)?.approved_customer_price_pence,2667);
  assert.equal((await call("/api/staff/marketplace/offers","GET",tutorTwo)).data.offers.length,0);
  console.log("PASS: isolated marketplace drafts, photo scoping, admin approvals and £20/25% margin -> £26.67.");
} finally {
  server.kill("SIGTERM");
  await pool.end();
  await rm(privateDir,{recursive:true,force:true});
}
