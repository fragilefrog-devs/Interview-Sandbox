import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="font-serif text-4xl">Page not found</h1>
      <p className="mt-3 text-muted">That address does not exist. Head back to the start.</p>
      <Link href="/" className="mt-6 inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-on-accent">Go home</Link>
    </main>
  );
}
