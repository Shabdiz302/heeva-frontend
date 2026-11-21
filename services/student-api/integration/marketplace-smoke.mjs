// Run ONLY against a disposable database: DATABASE_URL=... node tests/marketplace-integration.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import pg from "pg";
import { hashPassword, newId } from "../src/security.js";
import { scanTeacherPdf } from "../src/file-scanner.js";

const { Pool } = pg;
const PORT = 3147;
const BASE = `http://127.0.0.1:${PORT}`;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl || !databaseUrl.includes("heeva_marketplace_test")) {
  throw new Error("Refusing to run marketplace integration against a database without the isolated test name.");
}
const pool = new Pool({ connectionString: databaseUrl });
const privateDir = await mkdtemp(join(tmpdir(), "heeva-marketplace-private-"));
const emailOut = join(privateDir, 'verification-email.json');
const scannerPath = join(privateDir, 'mock-clamscan');
await writeFile(scannerPath, '#!/bin/sh\nexit 0\n', {mode:0o700});
delete process.env.HEEVA_CLAMSCAN_PATH;
assert.equal((await scanTeacherPdf('/nonexistent/path')).reason,'unavailable');
const server = spawn(process.execPath, ["src/server.js"], {
  cwd: new URL("../", import.meta.url).pathname,
  env: {
    ...process.env,
    PORT: String(PORT),
    APP_ORIGINS: BASE,
    COOKIE_SECURE: "true",
    PRIVATE_RESOURCES_DIR: privateDir,
    RESEND_API_KEY: "integration-test-only",
    EMAIL_FROM: "Teacher Testing <test@example.invalid>",
    NODE_ENV: "test",
    HEEVA_TEST_EMAIL_OUT: emailOut,
    HEEVA_STUDENT_COOKIE_NAME: "__Host-heeva_marketplace_student",
    HEEVA_STAFF_COOKIE_NAME: "__Host-heeva_marketplace_staff",
    HEEVA_CLAMSCAN_PATH: scannerPath,
    NODE_OPTIONS: "--import=" + new URL("./mock-mail.mjs",import.meta.url).href,
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
  assert.ok(cookie?.startsWith("__Host-heeva_marketplace_staff="));
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
  await ready();
  const applicationSignup=await call("/api/teacher-applications/register","POST","",{
    displayName:"Market Applicant",email:"market-applicant@example.invalid",
    password:"OnlyForTesting123!",termsAccepted:true,privacyAccepted:true,adultConfirmed:true
  });
  assert.equal(applicationSignup.response.status,201,JSON.stringify(applicationSignup.data));
  const email = JSON.parse(await readFile(emailOut,"utf8"));
  assert.equal(email.email,"market-applicant@example.invalid");
  assert.match(email.code,/^[0-9]{6}$/);
  assert.equal((await call("/api/teacher-applications/verify-email","POST","",{
    email:email.email,code:"000000" === email.code?"999999":"000000"
  })).response.status,400);
  const verified=await call("/api/teacher-applications/verify-email","POST","",{
    email:email.email,code:email.code
  });
  assert.equal(verified.response.status,200,JSON.stringify(verified.data));
  const privateApplicant=await login("market-applicant@example.invalid");
  const applicantSession=await call("/api/staff/auth/me","GET",privateApplicant);
  assert.equal(applicantSession.data.staff.onboardingOnly,true);
  assert.equal((await call("/api/staff/dashboard","GET",privateApplicant)).response.status,403);
  assert.equal((await call("/api/staff/marketplace/applications","GET",privateApplicant)).response.status,403);
  assert.equal((await call("/api/staff/marketplace/profile","PUT",privateApplicant,{
    displayName:"Market Applicant",headline:"Online beginner music educator",
    biography:"I offer individual music lessons online.",subjects:["Music"],languages:["English"],
    qualificationsSummary:"",teachingExperience:"Online teaching",proposedRatePence:2000,lessonDurationMinutes:60
  })).response.status,200);
  assert.equal((await call("/api/staff/marketplace/submit","POST",privateApplicant,{})).response.status,200);
  const admin = await login("market-admin@example.invalid");
  const requests = (await call("/api/staff/marketplace/applications","GET",admin)).data.applications;
  const pending = requests.find(a=>a.email==="market-applicant@example.invalid");
  assert.ok(pending?.id&&pending.status==="pending_admin"&&pending.email_verified_at);
  const applicantId=pending.id;
  const premature=await call("/api/staff/marketplace/applications/"+applicantId+"/decision",
    "POST",admin,{decision:"approved",feedback:"Too early"});
  assert.equal(premature.response.status,409);
  const pendingProfiles=(await call("/api/staff/marketplace/review","GET",admin)).data.profiles;
  const pendingProfile=pendingProfiles.find(p=>p.email==="market-applicant@example.invalid");
  assert.ok(pendingProfile?.id);
  assert.equal((await call("/api/staff/marketplace/review/"+pendingProfile.id,"POST",admin,{
    decision:"approved",feedback:"Reviewed complete profile"
  })).response.status,200);
  const accepted=await call("/api/staff/marketplace/applications/"+applicantId+"/decision",
    "POST",admin,{decision:"approved",feedback:"Test approval",confirmSafeguarding:true});
  assert.equal(accepted.response.status,200,JSON.stringify(accepted.data));
  const live=(await call("/api/public/educators")).data.educators;
  const published=live.find(p=>p.slug===pendingProfile.id);
  assert.ok(published&&published.display_name==="Market Applicant");
  assert.ok(!JSON.stringify(published).includes("market-applicant@example.invalid"));
  assert.equal((await call("/api/public/educators/"+pendingProfile.id)).response.status,200);
  assert.equal((await call("/api/staff/marketplace/public-educators/"+pendingProfile.id+"/unpublish","POST",admin,{})).response.status,200);
  assert.equal((await call("/api/public/educators/"+pendingProfile.id)).response.status,404);

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
  const fakePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF\n');
  const cv=await call("/api/staff/marketplace/cv","POST",tutorOne,fakePdf,"application/pdf");
  assert.equal(cv.response.status,201,JSON.stringify(cv.data));
  const ownCv=await call("/api/staff/marketplace/cv","GET",tutorOne);
  assert.equal(ownCv.response.status,200);
  assert.match(ownCv.response.headers.get("content-disposition"),/attachment/);
  assert.equal((await call("/api/staff/marketplace/cv","GET",tutorTwo)).response.status,404);

  assert.equal((await call("/api/staff/marketplace/submit","POST",tutorOne,{})).response.status,200);
  const profiles = (await call("/api/staff/marketplace/review","GET",admin)).data.profiles;
  const profile = profiles.find(p => p.email === "market-tutor-one@example.invalid");
  assert.ok(profile?.id);
  assert.equal(profile.has_cv,true);
  assert.equal((await call("/api/staff/marketplace/review/"+profile.id+"/cv","GET",admin)).response.status,200);
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
