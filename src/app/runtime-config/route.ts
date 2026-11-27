import { connection } from "next/server";
import { runtimeConfigFromEnv } from "@/lib/runtime-config";

export async function GET() {
  await connection();
  return Response.json(runtimeConfigFromEnv(process.env), {
    headers: { "Cache-Control": "no-store" },
  });
}
