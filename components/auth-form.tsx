"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { btnPrimary, input } from "@/components/ui";

const safeNext = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/app");

export function AuthForm({ mode, next }: { mode: "sign-in" | "sign-up"; next?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const up = mode === "sign-up";

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email")), password = String(f.get("password")), name = String(f.get("name") ?? "").trim();
    setError(""); setPending(true);
    const { error } = up
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });
    if (error) { setPending(false); setError(error.message ?? "Something went wrong. Try again."); return; }
    router.push(up ? "/onboarding" : safeNext(next));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="max-w-sm space-y-4">
      {up && (
        <label className="block text-sm font-medium">Your name
          <input name="name" required maxLength={80} autoComplete="name" className={input} />
        </label>
      )}
      <label className="block text-sm font-medium">Work email
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="block text-sm font-medium">Password
        <input name="password" type="password" required minLength={8} autoComplete={up ? "new-password" : "current-password"} className={input} />
        {up && <span className="mt-1 block text-xs font-normal text-muted">At least 8 characters.</span>}
      </label>
      {error && <p role="alert" className="text-sm text-caution">{error}</p>}
      <button disabled={pending} className={btnPrimary}>{pending ? (up ? "Creating account..." : "Signing in...") : (up ? "Create account" : "Sign in")}</button>
      <p className="text-sm text-muted">
        {up ? "Already have an account? " : "New here? "}
        <Link href={up ? "/sign-in" : "/sign-up"} className="text-accent underline">{up ? "Sign in" : "Create an account"}</Link>
      </p>
    </form>
  );
}
