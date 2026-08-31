export function isOpsPublicPath(pathname: string): boolean {
  return pathname === "/ops/login" || pathname === "/api/ops/login" || pathname === "/api/ops/logout";
}

export function isOpsProtectedPath(pathname: string): boolean {
  return pathname === "/ops" || pathname.startsWith("/ops/") || pathname.startsWith("/api/ops");
}

export function safeOpsNext(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/ops") ||
    value.startsWith("//") ||
    value.includes("://") ||
    value.startsWith("/ops/login")
  ) {
    return "/ops";
  }
  return value;
}
