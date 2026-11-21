import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migration = await readFile(new URL("../migrations/006_teacher_marketplace_profiles.sql", import.meta.url), "utf8");
const migrator = await readFile(new URL("../src/migrate.js", import.meta.url), "utf8");
const offersMigration = await readFile(new URL("../migrations/007_teacher_marketplace_offers.sql", import.meta.url), "utf8");
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

test("portraits are private, size-limited and only available through staff authentication", () => {
  assert.match(migration, /photo_storage_key VARCHAR/);
  assert.match(migration, /photo_size_bytes INTEGER CHECK/);
  assert.match(server, /const ownPortrait = path === "\/api\/staff\/marketplace\/portrait" && staff.role === "teacher"/);
  assert.match(server, /reviewPortraitMatch = staff.role === "admin"/);
  assert.match(server, /readBinary\(req,5\*1024\*1024\)/);
  assert.match(server, /"image\/jpeg":".jpg","image\/png":".png","image\/webp":".webp"/);
  assert.match(server, /"Cache-Control":"private, no-store"/);
  assert.match(server, /marketplace.portrait.uploaded/);
});

test("course offers are teacher-owned and approved retail rates are immutable snapshots",()=>{
  assert.match(migrator,/007_teacher_marketplace_offers/);
  assert.match(offersMigration,/staff_user_id UUID NOT NULL REFERENCES staff_users/);
  assert.match(offersMigration,/approved_tutor_rate_pence INTEGER/);
  assert.match(offersMigration,/approved_customer_price_pence INTEGER/);
  assert.match(offersMigration,/approved_margin_basis_points INTEGER/);
  assert.match(offersMigration,/review_status='approved'/);
});
test("teacher course proposals and pricing approvals are role-scoped",()=>{
  assert.match(server,/path === "\/api\/staff\/marketplace\/offers" && staff.role === "teacher"/);
  // Educator course proposals may be drafted before approval, but are never publicly bookable.
  assert.match(server,/SELECT id FROM marketplace_teacher_profiles WHERE staff_user_id=\$1/);
  assert.match(server,/offerSubmitMatch && staff.role === "teacher"/);
  assert.match(server,/offerReviewMatch && staff.role === "admin"/);
  assert.match(server,/marketplace.offer.approved|marketplace.offer\."\+decision/);
  assert.match(server,/Math\.ceil\(tutorRate \* 10000 \/ \(10000-marginBps\)\)/);
});

test("teacher self-registration stays suspended before email and admin review",()=>{
  assert.match(migrator,/008_teacher_applications/);
  assert.match(server,/path === "\/api\/teacher-applications\/register"/);
  assert.match(server,/role,status\) VALUES\(\$1,\$2,\$3,\$4,'teacher','suspended'\)/);
  assert.match(server,/path === "\/api\/teacher-applications\/verify-email"/);
  assert.match(server,/verifyEmailVerificationCode\(code,row\.code_salt,row\.code_hash\)/);
  assert.match(server,/status='pending_admin',email_verified_at=NOW\(\)/);
  assert.match(server,/teacherApplicationDecision && staff.role==="admin"/);
  assert.match(server,/UPDATE staff_users SET status='active',updated_at=NOW\(\)/);
});

test("verified but unapproved educators have private onboarding access only",()=>{
  assert.match(server,/a\.email_verified_at IS NOT NULL AND a\.status='pending_admin'/);
  assert.match(server,/if \(staff\.onboarding_only\)/);
  assert.match(server,/Finish your private educator profile and await Heeva approval/);
  assert.match(server,/staff\.onboarding_only===true/);
  assert.match(server,/p\.review_status='approved'/);
});

test("CV upload fails closed and is restricted to authenticated teacher and admin",()=>{
  assert.match(migrator,/009_teacher_cv_documents/);
  assert.match(server,/const ownCv = path === "\/api\/staff\/marketplace\/cv" && staff.role === "teacher"/);
  assert.match(server,/reviewCvMatch = staff.role === "admin"/);
  assert.match(server,/scanTeacherPdf\(storagePath\)/);
  assert.match(server,/scan.reason==="infected"\?415:503/);
  assert.match(server,/marketplace.cv.uploaded/);
  assert.match(server,/Content-Disposition/);
});
