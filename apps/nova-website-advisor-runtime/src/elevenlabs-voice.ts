export interface VoiceSynthesizer {
  synthesize(text: string): Promise<string>; // returns base64 mp3
}

export interface ElevenLabsVoiceOptions {
  apiKey: string;
  voiceId: string;
  modelId?: string; // default eleven_flash_v2_5
  timeoutMs?: number;
  baseUrl?: string;
}

export class ElevenLabsVoiceSynthesizer implements VoiceSynthesizer {
  private readonly modelId: string;
  private readonly timeoutMs: number;
  private readonly baseUrl: string;

  constructor(private readonly options: ElevenLabsVoiceOptions) {
    this.modelId = options.modelId ?? "eleven_flash_v2_5";
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.baseUrl = (options.baseUrl ?? "https://api.elevenlabs.io").replace(/\/$/, "");
  }

  async synthesize(text: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(
        `${this.baseUrl}/v1/text-to-speech/${this.options.voiceId}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": this.options.apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify({ text, model_id: this.modelId }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`ElevenLabs TTS failed with ${response.status}`);
      }
      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString("base64");
    } finally {
      clearTimeout(timeout);
    }
  }
}
