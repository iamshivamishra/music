import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { UnauthorizedError } from "@/lib/errors";
import { authorizeCron } from "./cron-auth";
import type { NextRequest } from "next/server";

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/cron/founding", {
    method: "GET",
    headers,
  }) as unknown as NextRequest;
}

describe("authorizeCron", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = "cron-test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("rejects a missing bearer token", () => {
    expect(() => authorizeCron(makeRequest())).toThrow(UnauthorizedError);
  });

  it("rejects a mismatched secret", () => {
    expect(() => authorizeCron(makeRequest("Bearer wrong"))).toThrow(
      UnauthorizedError
    );
  });

  it("accepts a matching bearer secret", () => {
    expect(() => authorizeCron(makeRequest("Bearer cron-test-secret"))).not.toThrow();
  });
});
