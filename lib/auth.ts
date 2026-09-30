import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { practiceSession, profile } from "@/lib/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    // Turn on once an email provider is wired up (sendResetPassword / sendVerificationEmail).
    requireEmailVerification: false,
  },
  user: {
    deleteUser: {
      enabled: true,
      // Do not rely on FK cascades being enforced by the SQLite driver: remove app data explicitly.
      beforeDelete: async (u) => {
        await db.delete(practiceSession).where(eq(practiceSession.userId, u.id));
        await db.delete(profile).where(eq(profile.userId, u.id));
      },
    },
  },
  session: { cookieCache: { enabled: true, maxAge: 5 * 60 } },
  plugins: [nextCookies()], // must stay last
});
