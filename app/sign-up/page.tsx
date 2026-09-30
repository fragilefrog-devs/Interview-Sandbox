import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { brand } from "@/components/ui";

export const metadata = { title: "Create account | Interviewer Practice Lab" };

export default function SignUp() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <Link href="/" className={brand}>Interviewer Practice Lab</Link>
      <h1 className="mt-10 font-serif text-3xl">Create your account</h1>
      <p className="mb-8 mt-2 max-w-md text-muted">Next you will tell us what you hire for, so your practice candidates fit your real interviews.</p>
      <AuthForm mode="sign-up" />
    </main>
  );
}
