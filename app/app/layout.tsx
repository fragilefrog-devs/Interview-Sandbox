import { AppShell } from "@/components/app-shell";
import { requireOnboarded } from "@/lib/session";
import { usageFor } from "@/lib/usage";

/** Gate for everything under /app: signed in, then onboarded. Then the dashboard chrome. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireOnboarded();
  const usage = await usageFor(user.id);
  return <AppShell user={{ name: user.name, email: user.email }} usage={usage}>{children}</AppShell>;
}
