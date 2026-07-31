export type DependencyState =
  | "healthy"
  | "degraded"
  | "disconnected"
  | "unavailable";

export interface DependencyStatus {
  name: string;
  state: DependencyState;
  critical: boolean;
  checkedAt: string;
  safeReasonCode: string;
}

export interface PlatformHealthSnapshot {
  ready: boolean;
  externalWritesEnabled: false;
  dependencies: DependencyStatus[];
  blockers: string[];
}

export class DependencyHealthRegistry {
  readonly #statuses = new Map<string, DependencyStatus>();

  update(status: DependencyStatus): void {
    this.#statuses.set(status.name, structuredClone(status));
  }

  snapshot(): PlatformHealthSnapshot {
    const dependencies = [...this.#statuses.values()]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((status) => structuredClone(status));
    const blockers = dependencies
      .filter((status) =>
        status.critical
        && status.state !== "healthy"
        && status.state !== "disconnected"
      )
      .map((status) => `${status.name}:${status.safeReasonCode}`);
    return {
      ready: blockers.length === 0,
      externalWritesEnabled: false,
      dependencies,
      blockers,
    };
  }
}
