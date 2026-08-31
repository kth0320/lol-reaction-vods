export { isOpsProtectedPath, isOpsPublicPath, safeOpsNext } from "@/lib/ops-paths";

export const OPS_SESSION_COOKIE = "ops_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export function opsPassword(): string {
  return (process.env.OPS_PASSWORD ?? "").trim();
}

/** Empty password keeps local/dev /ops open. Set OPS_PASSWORD to require login. */
export function opsAuthEnabled(): boolean {
  return opsPassword().length > 0;
}

function secret(): string {
  return process.env.OPS_SECRET?.trim() || opsPassword();
}

function timingSafeEqualString(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function hmacHex(value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function signOpsSession(now = Date.now()): Promise<string> {
  const exp = String(now + SESSION_MS);
  return `${exp}.${await hmacHex(exp)}`;
}

export async function opsSessionValid(value: string | undefined, now = Date.now()): Promise<boolean> {
  if (!opsAuthEnabled()) return true;
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const exp = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d+$/.test(exp) || mac.length < 32) return false;
  const expected = await hmacHex(exp);
  if (!timingSafeEqualString(mac, expected)) return false;
  return Number(exp) > now;
}

export function passwordMatches(input: string): boolean {
  const expected = opsPassword();
  if (!expected) return true;
  return timingSafeEqualString(input, expected);
}
