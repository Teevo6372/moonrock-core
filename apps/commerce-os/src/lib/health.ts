export type HealthStatus = {
  status: "ok";
  service: string;
  environment: string;
  timestamp: string;
};

export function createHealthStatus(now = new Date()): HealthStatus {
  return {
    status: "ok",
    service: process.env.APP_NAME ?? "Moonrock Commerce OS",
    environment: process.env.APP_ENV ?? "development",
    timestamp: now.toISOString(),
  };
}
