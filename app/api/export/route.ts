import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { practiceSession, profile, user as userTable } from "@/lib/db/schema";
import { apiUser } from "@/lib/session";

/** Everything the user owns, as a JSON download. The hidden dossier of unfinished sessions is deliberately left out. */
export async function GET(req: Request) {
  const u = await apiUser(req);
  if (!u) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const [[acct], [prof], sessions] = await Promise.all([
    db.select({ name: userTable.name, email: userTable.email, createdAt: userTable.createdAt }).from(userTable).where(eq(userTable.id, u.id)).limit(1),
    db.select().from(profile).where(eq(profile.userId, u.id)).limit(1),
    db.select().from(practiceSession).where(eq(practiceSession.userId, u.id)).orderBy(desc(practiceSession.createdAt)),
  ]);
  const body = {
    exportedAt: new Date().toISOString(),
    account: acct ?? null,
    profile: prof ?? null,
    sessions: sessions.map(({ dossier, ...s }) => ({ ...s, dossier: s.status === "completed" ? dossier : undefined })),
  };
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="practice-lab-export-${new Date().toISOString().slice(0, 10)}.json"`,
      "cache-control": "no-store",
    },
  });
}
