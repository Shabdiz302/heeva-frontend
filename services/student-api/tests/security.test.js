import test from "node:test";
import assert from "node:assert/strict";
import {
  createSessionToken, hashPassword, hashSessionToken, isValidEmail,
  normalizeEmail, validatePassword, verifyPassword,
  createEmailVerificationCode, createEmailVerificationSalt,
  hashEmailVerificationCode, verifyEmailVerificationCode
} from "../src/security.js";
import catalog from "../data/courses.json" with { type: "json" };

test("normalizes email addresses", () => {
  assert.equal(normalizeEmail("  REZA@example.com "), "reza@example.com");
});

test("validates email addresses", () => {
  assert.equal(isValidEmail("student@example.com"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("x".repeat(250) + "@x.com"), false);
});

test("requires a strong password with a minimum length of eight characters", () => {
  assert.equal(validatePassword("StrongPassword123"), true);
  assert.equal(validatePassword("Strong1A"), true);
  assert.equal(validatePassword("short1A"), false);
  assert.equal(validatePassword("Strong1"), false);
  assert.equal(validatePassword("alllowercase123"), false);
  assert.equal(validatePassword("ALLUPPERCASE123"), false);
});

test("scrypt hashes verify only the original password", async () => {
  const hash = await hashPassword("StrongPassword123");
  assert.notEqual(hash, "StrongPassword123");
  assert.equal(await verifyPassword("StrongPassword123", hash), true);
  assert.equal(await verifyPassword("WrongPassword123", hash), false);
});

test("session tokens are random and stored as hashes", () => {
  const first = createSessionToken();
  const second = createSessionToken();
  assert.notEqual(first, second);
  assert.notEqual(first, hashSessionToken(first));
  assert.equal(hashSessionToken(first).length, 64);
});

test("catalogue has unique slugs and one free-lesson rule is supported separately", () => {
  assert.equal(catalog.length, 39);
  assert.equal(new Set(catalog.map((course) => course.slug)).size, 39);
  assert.ok(catalog.some((course) => course.slug === "piano"));
  assert.ok(catalog.some((course) => course.status === "coming-soon"));
});

test("email verification codes are six digits and stored as salted hashes", () => {
  const code = createEmailVerificationCode();
  const salt = createEmailVerificationSalt();
  const hash = hashEmailVerificationCode(code, salt);
  assert.match(code, /^\\d{6}$/);
  assert.notEqual(hash, code);
  assert.equal(verifyEmailVerificationCode(code, salt, hash), true);
  assert.equal(verifyEmailVerificationCode("000000", salt, hash), code === "000000");
  assert.equal(verifyEmailVerificationCode(code, createEmailVerificationSalt(), hash), false);
});
