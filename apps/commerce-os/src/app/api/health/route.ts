import { checkDatabaseConnection } from "@/lib/db";
import { createHealthStatus } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const databaseReady = await checkDatabaseConnection();
  const body = {
    ...createHealthStatus(),
    dependencies: {
      database: databaseReady ? "ok" : "unavailable",
    },
  };

  return Response.json(body, { status: databaseReady ? 200 : 503 });
}
