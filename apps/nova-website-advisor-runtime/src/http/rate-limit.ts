export class InMemoryRateLimiter {
  readonly #entries = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly limit = 30,
    private readonly windowMs = 60_000,
  ) {}

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfter: number } {
    let entry = this.#entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.#entries.set(key, entry);
    }
    entry.count += 1;
    return {
      allowed: entry.count <= this.limit,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }
}
