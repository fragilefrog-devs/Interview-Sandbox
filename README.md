# Interviewer Practice Lab

Practice the interviewer, not the candidate. Next.js (App Router) app with accounts, onboarding, and an AI candidate service.

**Flow:** sign up → 3-step onboarding → practice (text or **voice**) against an AI candidate → grounded report.

## Run
```bash
npm install
cp .env.example .env.local     # set BETTER_AUTH_SECRET: openssl rand -base64 32
npm run db:push                # creates local.db (libSQL/SQLite)
npm run dev
```
Runs with no AI key on a built-in mock candidate. For a live candidate, put your Nine Router key in `.env.local`:
```
AI_PROVIDER=nine-router
AI_BASE_URL=https://9router-production-a99a.up.railway.app/v1
AI_API_KEY=sk-...
AI_MODEL=openrouter/openrouter/free
```
Then open **Settings → AI service → Test connection** to check it. Set `AI_PROVIDER=mock` to force the offline candidate.

## Dashboard

Everything under `/app` lives in one shell (`components/app-shell.tsx`): a fixed sidebar, a fixed top bar, a mobile drawer, a user menu, a light/dark toggle and a daily-usage meter. Press **N** anywhere to start a new session.

| Page | Route | What it does |
|---|---|---|
| Overview | `/app` | Resume an interview, key numbers, the one thing to work on next, recent sessions |
| New session | `/app/new` | Role, candidate type, difficulty. Redirects into the interview as soon as it is created. Accepts `?role=&archetype=&difficulty=` to pre-fill |
| Sessions | `/app/sessions` | Search, filter and delete every session |
| Interview / report | `/app/practice/[id]` | Live interview, then the report with transcript, notes, print and "practise this setup again" |
| Progress | `/app/progress` | Misses by skill, hidden facts found per session, trend |
| Playbook | `/app/playbook` | Reference: the disclosure ladder, probes, fair questions, notes, candidate types |
| Settings | `/app/settings` | Practice profile, account (name, password), theme, AI service status and connection test, data export and deletion |

Loading skeletons (`loading.tsx`), empty states, a route-change progress bar, a short page fade (`app/app/template.tsx`), toasts, confirm dialogs, error and not-found pages are all in place. Reduced-motion is respected.

## Architecture

| Layer | Where | Notes |
|---|---|---|
| Auth | `lib/auth.ts`, `app/api/auth/[...all]` | Better Auth, email + password, Drizzle adapter |
| Gate | `proxy.ts`, `lib/session.ts` | `proxy.ts` is an optimistic cookie check. `requireOnboarded()` in `app/app/layout.tsx` is the real gate: signed in, then onboarded. Every API route re-checks with `apiUser()`. |
| Onboarding | `app/onboarding`, `components/onboarding-wizard.tsx`, `/api/profile` | Experience, roles hired for, focus areas, difficulty. Re-editable at `/onboarding?edit=1`. |
| Data | `lib/db/schema.ts` | Better Auth tables + `profile` + `practice_session` (transcript, notes, dossier, report) |
| AI: provider | `lib/ai/provider.ts` | OpenAI-compatible `/chat/completions` client (Nine Router). Streams SSE, strips `<think>` blocks, falls back to the mock when no key is set. |
| AI: candidate | `lib/ai/dossier.ts`, `lib/ai/candidate.ts`, `lib/ai/prompts.ts` | Each session generates a hidden **dossier** (employers, projects, personal vs team role, decisions, metrics, and on hard mode a planted overstatement). The candidate follows a disclosure ladder: broad questions get broad answers, precise questions about personal decisions earn detail. |
| AI: evaluator | `lib/ai/evaluator.ts`, `lib/analysis.ts` | LLM evaluator with ground truth. Every quote must exist verbatim in the right speaker's words or the observation is dropped. Fairness-risk checks are deterministic and always run. Falls back to the heuristic evaluator on any failure. |

Security notes: the transcript is server-owned (the browser sends only the new question), the dossier never reaches the browser, sessions are scoped by `userId`, and there are caps of `MAX_SESSIONS_PER_DAY` and 40 questions per session.

## Voice (Vapi)

Voice is an adapter, not the architecture. The app depends on `VoiceInterviewProvider` (`lib/voice/types.ts`); `lib/voice/providers/vapi.ts` is the only vendor code. A LiveKit adapter can replace it without touching the rest.

```
Browser (@vapi-ai/web) ── mic/audio ──> Vapi (STT + TTS + turn-taking)
                                          │  custom-llm:  POST /api/voice/llm/<signed-token>/chat/completions
                                          ▼
                     our candidate service (dossier + disclosure ladder stay server-side)
Vapi ── webhook (end-of-call-report) ──> /api/voice/webhook ──> transcript_segment + voice_session (our DB)
                                                                  └─> evaluator ──> report + "How you sounded" metrics
```

- **Our DB is the source of truth.** Transcript segments and timing live in `transcript_segment` / `voice_session`; Vapi is transport. The report is generated from our copy.
- **The hidden dossier never reaches Vapi or the browser.** Vapi calls our OpenAI-compatible endpoint; the session is resolved from an HMAC-signed, 45-minute token in the URL.
- **Fallback:** if the webhook cannot reach you (local dev without a tunnel), the browser posts its captured transcript to `/api/sessions/[id]/voice/complete`. The webhook transcript wins when both exist.
- **Setup:** set the `VAPI_*` vars in `.env.example`. The Voice option is disabled until all three are present. Vapi must reach `APP_URL`; use a tunnel locally.
- **Behavior metrics:** talk share, interruptions, pause before replying, longest turn (`lib/voice/metrics.ts`). They coach the interviewer only.
- Objective (ownership, evidence, ...) chosen at session start is weighted first by the evaluator.

## Deploy (Vercel)
`file:local.db` does not persist on serverless. Create a [Turso](https://turso.tech) database and set `DATABASE_URL` (libsql://...) and `DATABASE_AUTH_TOKEN`, plus `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (your production URL), and `AI_API_KEY` (plus `AI_BASE_URL` / `AI_MODEL` if you change them). Run `npm run db:push` once against it.

## Not built yet
Voice analysis inside the LLM evaluator prompt (timing is shown as metrics only), per-segment timecodes in report quotes, LiveKit adapter, email verification, password reset and email change (need an email provider), OAuth, workspaces/roles/competency extraction, Stripe, Inngest, PostHog, Sentry. Moving to Postgres means swapping `sqliteTable` for `pgTable` in `lib/db/schema.ts` and the Drizzle client/adapter provider.
