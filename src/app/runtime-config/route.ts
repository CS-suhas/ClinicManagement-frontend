import { connection } from "next/server";
import { runtimeConfigFromEnv } from "@/lib/runtime-config";

/**
 * GET /runtime-config: per-deployment settings for the browser (Keycloak URL,
 * realm and client, public pages). Read from the environment on every request,
 * never inlined at build time, so one image runs on any host.
 */
export async function GET() {
  // Opt out of prerendering: the values must come from the running container.
  await connection();
  return Response.json(runtimeConfigFromEnv(process.env), {
    headers: { "Cache-Control": "no-store" },
  });
}
