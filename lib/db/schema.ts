import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { Difficulty, Archetype, Dossier, FocusArea, Level, Message, Mode, Report, Seniority } from "@/lib/schemas";
import type { VoiceMetrics } from "@/lib/voice/types";

const ts = (name: string) => integer(name, { mode: "timestamp_ms" });
const now = () => new Date();

/* ---------- Better Auth core tables (keys must match Better Auth field names) ---------- */
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: ts("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: ts("access_token_expires_at"),
  refreshTokenExpiresAt: ts("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: ts("expires_at").notNull(),
  createdAt: ts("created_at").$defaultFn(now),
  updatedAt: ts("updated_at").$defaultFn(now),
});

/* ---------- App tables ---------- */
export const profile = sqliteTable("profile", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  level: text("level").$type<Level>().notNull(),
  hiringFocus: text("hiring_focus").notNull(),
  seniority: text("seniority").$type<Seniority>().notNull(),
  focusAreas: text("focus_areas", { mode: "json" }).$type<FocusArea[]>().notNull(),
  difficulty: text("difficulty").$type<Difficulty>().notNull(),
  onboardedAt: ts("onboarded_at").notNull().$defaultFn(now),
  updatedAt: ts("updated_at").notNull().$defaultFn(now),
});

export const practiceSession = sqliteTable("practice_session", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  archetype: text("archetype").$type<Archetype>().notNull(),
  difficulty: text("difficulty").$type<Difficulty>().notNull(),
  /** Hidden ground truth. Never sent to the browser. */
  dossier: text("dossier", { mode: "json" }).$type<Dossier>().notNull(),
  messages: text("messages", { mode: "json" }).$type<Message[]>().notNull().$defaultFn(() => []),
  notes: text("notes").notNull().default(""),
  report: text("report", { mode: "json" }).$type<Report | null>(),
  mode: text("mode").$type<Mode>().notNull().default("text"),
  objective: text("objective").$type<FocusArea>(),
  status: text("status").$type<"active" | "completed">().notNull().default("active"),
  promptVersion: text("prompt_version").notNull(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  endedAt: ts("ended_at"),
}, (t) => [index("practice_session_user_idx").on(t.userId, t.createdAt)]);

/* ---------- Voice (provider-agnostic; our DB is the source of truth) ---------- */
export const voiceSession = sqliteTable("voice_session", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => practiceSession.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  providerAssistantId: text("provider_assistant_id").notNull(),
  providerCallId: text("provider_call_id"),
  status: text("status").$type<"created" | "live" | "ended" | "failed">().notNull().default("created"),
  endedReason: text("ended_reason"),
  /** Where the canonical transcript came from: provider webhook, or the browser as a fallback. */
  source: text("source").$type<"webhook" | "client">(),
  metrics: text("metrics", { mode: "json" }).$type<VoiceMetrics | null>(),
  createdAt: ts("created_at").notNull().$defaultFn(now),
  endedAt: ts("ended_at"),
}, (t) => [index("voice_session_session_idx").on(t.sessionId), index("voice_session_assistant_idx").on(t.providerAssistantId)]);

export const transcriptSegment = sqliteTable("transcript_segment", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => practiceSession.id, { onDelete: "cascade" }),
  sequence: integer("sequence").notNull(),
  speaker: text("speaker").$type<"interviewer" | "candidate">().notNull(),
  content: text("content").notNull(),
  startMs: integer("start_ms").notNull(),
  endMs: integer("end_ms").notNull(),
}, (t) => [index("transcript_segment_idx").on(t.sessionId, t.sequence)]);
