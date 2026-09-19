import { describe, expect, it, vi } from "vitest";

const verifyToken = vi.fn();
vi.mock("@clerk/backend", () => ({ verifyToken: (...args: unknown[]) => verifyToken(...args) }));

const { createClientRouter } = await import("../src/client-router.js");

describe("GET /v1/client/me", () => {
  it("reports 503 when no Clerk secret key is configured", async () => {
    const router = createClientRouter();
    const response = await router.request("/me");
    expect(response.status).toBe(503);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("AUTH_UNAVAILABLE");
    expect(verifyToken).not.toHaveBeenCalled();
  });

  it("reports 401 when no bearer token is supplied", async () => {
    const router = createClientRouter({ clerkSecretKey: "sk_test_dummy" });
    const response = await router.request("/me");
    expect(response.status).toBe(401);
    const body = await response.json() as { code: string };
    expect(body.code).toBe("UNAUTHORIZED");
  });

  it("reports 401 when the token fails verification", async () => {
    verifyToken.mockRejectedValueOnce(new Error("invalid token"));
    const router = createClientRouter({ clerkSecretKey: "sk_test_dummy" });
    const response = await router.request("/me", { headers: { authorization: "Bearer bad-token" } });
    expect(response.status).toBe(401);
  });

  it("returns the verified Clerk identity for a valid token", async () => {
    verifyToken.mockResolvedValueOnce({ sub: "user_123", sid: "sess_456" });
    const router = createClientRouter({ clerkSecretKey: "sk_test_dummy" });
    const response = await router.request("/me", { headers: { authorization: "Bearer good-token" } });
    expect(response.status).toBe(200);
    const body = await response.json() as { clerkUserId: string; sessionId: string };
    expect(body).toEqual({ clerkUserId: "user_123", sessionId: "sess_456" });
    expect(verifyToken).toHaveBeenCalledWith("good-token", { secretKey: "sk_test_dummy" });
  });
});
