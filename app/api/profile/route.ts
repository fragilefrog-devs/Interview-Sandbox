import { NextResponse } from "next/server";
import { profileInput } from "@/lib/schemas";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";

export async function PUT(req: Request) {
  const user = await apiUser(req);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const parsed = profileInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check your answers and try again." }, { status: 400 });

  const values = { ...parsed.data, focusAreas: [...new Set(parsed.data.focusAreas)] };
  await db.insert(profile).values({ userId: user.id, ...values })
    .onConflictDoUpdate({ target: profile.userId, set: { ...values, updatedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
