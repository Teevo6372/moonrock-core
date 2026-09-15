import { afterEach, describe, expect, it, vi } from "vitest";
import { ElevenLabsVoiceSynthesizer } from "../src/elevenlabs-voice.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ElevenLabsVoiceSynthesizer", () => {
  it("returns the response body as base64", async () => {
    const bytes = new TextEncoder().encode("fake-mp3-bytes").buffer;
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
    vi.stubGlobal("fetch", fetchMock);

    const synthesizer = new ElevenLabsVoiceSynthesizer({ apiKey: "test-key", voiceId: "voice-123" });
    const result = await synthesizer.synthesize("Hello there");

    expect(result).toBe(Buffer.from(bytes).toString("base64"));
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.elevenlabs.io/v1/text-to-speech/voice-123");
    expect(init.headers["xi-api-key"]).toBe("test-key");
    expect(JSON.parse(init.body)).toEqual({ text: "Hello there", model_id: "eleven_flash_v2_5" });
  });

  it("throws when ElevenLabs responds with a non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 }));
    const synthesizer = new ElevenLabsVoiceSynthesizer({ apiKey: "bad-key", voiceId: "voice-123" });
    await expect(synthesizer.synthesize("Hello")).rejects.toThrow(/failed with 401/);
  });

  it("respects a custom baseUrl and modelId", async () => {
    const bytes = new ArrayBuffer(0);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => bytes });
    vi.stubGlobal("fetch", fetchMock);

    const synthesizer = new ElevenLabsVoiceSynthesizer({ apiKey: "k", voiceId: "v", baseUrl: "https://example.test/", modelId: "custom_model" });
    await synthesizer.synthesize("hi");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://example.test/v1/text-to-speech/v");
    expect(JSON.parse(init.body).model_id).toBe("custom_model");
  });
});
