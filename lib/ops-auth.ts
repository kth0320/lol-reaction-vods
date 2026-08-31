import { createHmac, timingSafeEqual } from "node:crypto";

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

export function signOpsSession(now = Date.now()): string {
  const exp = String(now + SESSION_MS);
  const mac = createHmac("sha256", secret()).update(exp).digest("hex");
  return `${exp}.${mac}`;
}

export function opsSessionValid(value: string | undefined, now = Date.now()): boolean {
  if (!opsAuthEnabled()) return true;
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot < 1) return false;
  const exp = value.slice(0, dot);
  const mac = value.slice(dot + 1);
  if (!/^\d+$/.test(exp) || mac.length < 32) return false;
  const expected = createHmac("sha256", secret()).update(exp).digest("hex");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  return Number(exp) > now;
}

export function passwordMatches(input: string): boolean {
  const expected = opsPassword();
  if (!expected) return true;
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
