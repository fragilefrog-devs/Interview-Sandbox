import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { brand } from "@/components/ui";

export const metadata = { title: "Sign in | Interviewer Practice Lab" };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className={brand}>Interviewer Practice Lab</Link>
      <h1 className="mt-10 font-serif text-3xl">Sign in</h1>
      <p className="mb-8 mt-2 max-w-md text-muted">Pick up where you left off. Your sessions and reports are saved to your account.</p>
      <AuthForm mode="sign-in" next={next} />
    </main>
  );
}
