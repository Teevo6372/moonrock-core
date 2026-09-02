import { describe, expect, it, vi } from "vitest";
import { verifyProductionRelease } from "./post-deploy-verification";

describe("post-deploy verification orchestration", () => {
  it("binds verification to the exact deployment URL", async () => {
    const verifier = {
      verify: vi.fn().mockResolvedValue({
        deploymentUrl: "https://reference.pages.dev",
        statusCode: 200,
        markerMatched: true as const,
      }),
    };

    await expect(
      verifyProductionRelease(
        {
          deploymentId: "deployment-800",
          deploymentUrl: "https://reference.pages.dev",
        },
        verifier,
        "Moonrock Reference Site",
      ),
    ).resolves.toEqual({
      release: {
        deploymentId: "deployment-800",
        deploymentUrl: "https://reference.pages.dev",
      },
      verification: {
        deploymentUrl: "https://reference.pages.dev",
        statusCode: 200,
        markerMatched: true,
      },
    });
  });

  it("rejects verification evidence returned for a different URL", async () => {
    const verifier = {
      verify: vi.fn().mockResolvedValue({
        deploymentUrl: "https://other.pages.dev",
        statusCode: 200,
        markerMatched: true as const,
      }),
    };

    await expect(
      verifyProductionRelease(
        {
          deploymentId: "deployment-800",
          deploymentUrl: "https://reference.pages.dev",
        },
        verifier,
        "Moonrock Reference Site",
      ),
    ).rejects.toThrow("production_verification_url_mismatch");
  });
});
