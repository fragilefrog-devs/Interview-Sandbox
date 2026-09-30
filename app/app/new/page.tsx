import { Page } from "@/components/page";
import { StartForm } from "@/components/start-form";
import { archetypes, difficulties } from "@/lib/schemas";
import { requireOnboarded } from "@/lib/session";
import { sessionsInLastDay } from "@/lib/usage";
import { maxSessionsPerDay } from "@/lib/limits";
import { getVoiceProvider } from "@/lib/voice/provider";

export const metadata = { title: "New session" };

export default async function NewSession({ searchParams }: { searchParams: Promise<{ role?: string; archetype?: string; difficulty?: string }> }) {
  const { user, profile } = await requireOnboarded();
  const q = await searchParams;
  const used = await sessionsInLastDay(user.id);
  const defaultRole = (q.role ?? profile.hiringFocus.split(",")[0] ?? "").trim().slice(0, 120);
  const archetype = archetypes.find((a) => a === q.archetype);
  const difficulty = difficulties.find((d) => d === q.difficulty) ?? profile.difficulty;

  return (
    <Page title="New practice session" description="Pick a role and a candidate style. Aim for 10 to 15 minutes, then review where you missed evidence." width="max-w-4xl">
      <StartForm defaultRole={defaultRole} defaultArchetype={archetype} defaultDifficulty={difficulty} voiceEnabled={getVoiceProvider().configured} focusAreas={profile.focusAreas} blocked={used >= maxSessionsPerDay()} />
    </Page>
  );
}
