import { NextResponse } from "next/server";
import { apiUser } from "@/lib/session";
import { usageFor } from "@/lib/usage";

export async function GET(req: Request) {
  const u = await apiUser(req);
  if (!u) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  return NextResponse.json(await usageFor(u.id), { headers: { "cache-control": "no-store" } });
}
