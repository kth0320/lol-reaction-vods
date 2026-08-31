import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isOpsPublicPath, opsAuthEnabled, opsSessionValid, passwordMatches, safeOpsNext, signOpsSession } from "./ops-auth";

describe("ops auth", () => {
  it("treats login routes as public and everything else under /ops as protected", () => {
    assert.equal(isOpsPublicPath("/ops/login"), true);
    assert.equal(isOpsPublicPath("/api/ops/login"), true);
    assert.equal(isOpsPublicPath("/api/ops/logout"), true);
    assert.equal(isOpsPublicPath("/ops"), false);
    assert.equal(safeOpsNext("/ops/matches/abc"), "/ops/matches/abc");
    assert.equal(safeOpsNext("https://evil.example/ops"), "/ops");
  });

  it("skips auth when the password is empty", async () => {
    const prev = process.env.OPS_PASSWORD;
    delete process.env.OPS_PASSWORD;
    try {
      assert.equal(opsAuthEnabled(), false);
      assert.equal(await opsSessionValid(undefined), true);
    } finally {
      if (prev == null) delete process.env.OPS_PASSWORD;
      else process.env.OPS_PASSWORD = prev;
    }
  });

  it("round-trips a signed session when a password is set", async () => {
    const prev = process.env.OPS_PASSWORD;
    process.env.OPS_PASSWORD = "test-ops";
    try {
      const token = await signOpsSession(1_000);
      assert.equal(await opsSessionValid(token, 1_000), true);
      assert.equal(await opsSessionValid(token, 1_000 + 8 * 24 * 60 * 60 * 1000), false);
      assert.equal(await opsSessionValid("nope", 1_000), false);
      assert.equal(passwordMatches("test-ops"), true);
      assert.equal(passwordMatches("other"), false);
    } finally {
      if (prev == null) delete process.env.OPS_PASSWORD;
      else process.env.OPS_PASSWORD = prev;
    }
  });
});
