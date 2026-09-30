import { redirect } from "next/navigation";
import Link from "next/link";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { brand } from "@/components/ui";
import { getProfile, requireUser } from "@/lib/session";

export const metadata = { title: "Set up | Interviewer Practice Lab" };

export default async function Onboarding({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const user = await requireUser();
  const p = await getProfile(user.id);
  const editing = (await searchParams).edit === "1";
  if (p && !editing) redirect("/app");

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className={brand}>Interviewer Practice Lab</Link>
      <h1 className="mt-10 font-serif text-3xl">{editing ? "Your practice profile" : `Welcome, ${user.name.split(" ")[0]}`}</h1>
      <p className="mb-8 mt-2 max-w-lg text-muted">
        {editing ? "Changes apply to your next session." : "Three quick questions so your practice candidates and feedback match how you actually interview."}
      </p>
      <OnboardingWizard editing={editing} defaults={{
        level: p?.level ?? "some", hiringFocus: p?.hiringFocus ?? "", seniority: p?.seniority ?? "senior",
        focusAreas: p?.focusAreas ?? ["ownership", "evidence"], difficulty: p?.difficulty ?? "standard",
      }} />
    </main>
  );
}
