import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profile } from "@/lib/db/schema";

/** Server components / layouts. Deduped per request. */
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));

export const getProfile = cache(async (userId: string) => {
  const [row] = await db.select().from(profile).where(eq(profile.userId, userId)).limit(1);
  return row ?? null;
});

export async function requireUser() {
  const s = await getSession();
  if (!s) redirect("/sign-in");
  return s.user;
}

/** Auth first, then onboarding. This is the gate in front of everything under /app. */
export async function requireOnboarded() {
  const user = await requireUser();
  const p = await getProfile(user.id);
  if (!p) redirect("/onboarding");
  return { user, profile: p };
}

/** Route handlers. */
export async function apiUser(req: Request) {
  const s = await auth.api.getSession({ headers: req.headers });
  return s?.user ?? null;
}
