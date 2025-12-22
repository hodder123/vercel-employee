export const runtime = "nodejs";

export async function GET() {
  return Response.json({
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL_PREFIX: (process.env.DATABASE_URL || "").slice(0, 20),
    DATABASE_URL_HAS_FILE: (process.env.DATABASE_URL || "").includes("file:"),
  });
}
