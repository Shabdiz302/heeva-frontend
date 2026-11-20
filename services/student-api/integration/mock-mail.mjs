// Test-only Node import hook. Loaded via --import in a disposable CI process.
import { writeFile } from "node:fs/promises";
if (process.env.NODE_ENV !== "test" || !process.env.HEEVA_TEST_EMAIL_OUT) {
  throw new Error("Mock email transport is only permitted in isolated tests.");
}
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async (url, options) => {
  if (String(url) !== "https://api.resend.com/emails")
    return fetchOriginal(url, options);
  const payload = JSON.parse(options.body);
  const match = /verification code is ([0-9]{6})/.exec(payload.text || "");
  if (!match) throw new Error("Test verification email did not contain a code");
  await writeFile(process.env.HEEVA_TEST_EMAIL_OUT,
    JSON.stringify({ email:payload.to?.[0],code:match[1] }), {mode:0o600});
  return new Response("{}", {status:200,headers:{"Content-Type":"application/json"}});
};
