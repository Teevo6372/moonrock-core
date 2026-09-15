import { describe, expect, it, vi } from "vitest";
import type { NovaConversationTurn } from "../src/dynamic-conversation-engine.js";
import type { VoiceSynthesizer } from "../src/elevenlabs-voice.js";
import { createMoonrock2App } from "../src/http/moonrock2-app.js";

function mockConversationEngine(answer = "Here's what I'd suggest.") {
  return { respond: (): Promise<NovaConversationTurn> => Promise.resolve({ mode: "grounded_fallback" as const, intent: "pause_discovery" as const, answer }) };
}

async function post(app: ReturnType<typeof createMoonrock2App>["app"], path: string, body: unknown) {
  const response = await app.request(`http://localhost${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, json: (await response.json()) as any };
}

describe("voice synthesis wiring in discovery-router", () => {
  it("attaches audio to a /conversation reply when voiceInput is true and voice is configured", async () => {
    const voiceSynthesizer: VoiceSynthesizer = { synthesize: vi.fn().mockResolvedValue("ZmFrZS1tcDM=") };
    const { app } = createMoonrock2App({ conversationEngine: mockConversationEngine(), voiceSynthesizer });
    const sessionId = "voice-test-conversation";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });

    const result = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "What's included?", voiceInput: true });
    expect(result.status).toBe(200);
    expect(result.json.audio).toBe("ZmFrZS1tcDM=");
    expect(voiceSynthesizer.synthesize).toHaveBeenCalledWith("Here's what I'd suggest.");
  });

  it("does not synthesize audio for a typed (non-voice) turn, even with voice configured", async () => {
    const voiceSynthesizer: VoiceSynthesizer = { synthesize: vi.fn().mockResolvedValue("ZmFrZS1tcDM=") };
    const { app } = createMoonrock2App({ conversationEngine: mockConversationEngine(), voiceSynthesizer });
    const sessionId = "voice-test-typed";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });

    const result = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "What's included?" });
    expect(result.status).toBe(200);
    expect(result.json.audio).toBeUndefined();
    expect(voiceSynthesizer.synthesize).not.toHaveBeenCalled();
  });

  it("does not attach audio when voice is not configured at all, even if voiceInput is true", async () => {
    const { app } = createMoonrock2App({ conversationEngine: mockConversationEngine() });
    const sessionId = "voice-test-unconfigured";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });

    const result = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "What's included?", voiceInput: true });
    expect(result.status).toBe(200);
    expect(result.json.audio).toBeUndefined();
  });

  it("degrades to text-only (still 200, no audio) when synthesis throws - never fails the turn", async () => {
    const voiceSynthesizer: VoiceSynthesizer = { synthesize: vi.fn().mockRejectedValue(new Error("ElevenLabs TTS failed with 401")) };
    const { app } = createMoonrock2App({ conversationEngine: mockConversationEngine("The plan is ready."), voiceSynthesizer });
    const sessionId = "voice-test-failure";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });

    const result = await post(app, `/v1/discovery/${sessionId}/conversation`, { question: "What's included?", voiceInput: true });
    expect(result.status).toBe(200);
    expect(result.json.answer).toBe("The plan is ready.");
    expect(result.json.audio).toBeUndefined();
  });

  it("attaches audio on the /answers route too when voiceInput is true", async () => {
    const voiceSynthesizer: VoiceSynthesizer = { synthesize: vi.fn().mockResolvedValue("YW5zd2Vycy1hdWRpbw==") };
    const { app } = createMoonrock2App({ conversationEngine: mockConversationEngine(), voiceSynthesizer });
    const sessionId = "voice-test-answers";
    await post(app, `/v1/discovery/${sessionId}/start`, { path: "existing_business" });

    const result = await post(app, `/v1/discovery/${sessionId}/answers`, { field: "industry", value: "retail", voiceInput: true });
    expect(result.status).toBe(200);
    expect(result.json.conversationTurn.audio).toBe("YW5zd2Vycy1hdWRpbw==");
  });
});
