import { describe, expect, it } from "vitest";
import { inspectHighLevelLocation } from "../src/ghl-location-inspector.js";

const response = (value: unknown) => new Response(JSON.stringify(value), { status: 200 });

describe("HighLevel location inspector", () => {
  it("collects location, fields, and pipelines", async () => {
    const fakeFetch = async (input: RequestInfo | URL): Promise<Response> => {
      const url = String(input);
      if (url.includes("customFields")) return response({ customFields: [{ id: "field-1", name: "Moonrock Path", fieldKey: "contact.moonrock_path", model: "contact" }] });
      if (url.includes("opportunities/pipelines")) return response({ pipelines: [{ id: "pipeline-1", name: "New Business", stages: [] }] });
      return response({ id: "location-1", name: "Moonrock" });
    };
    const result = await inspectHighLevelLocation({ locationId: "location-1", accessToken: "test-value" }, fakeFetch as typeof fetch);
    expect(result.customFields).toHaveLength(1);
    expect(result.pipelines).toHaveLength(1);
  });
});
