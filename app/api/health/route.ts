import { env } from "cloudflare:workers";
import { isAuthConfigured, publicConfig } from "@/lib/config";

export function GET() {
  return Response.json({
    ok: true,
    r2Bound: typeof env.UPLOADS?.put === "function",
    authConfigured: isAuthConfigured,
    spacetimedb: { uri: publicConfig.spacetimedbUri, database: publicConfig.spacetimedbDatabase },
  });
}
