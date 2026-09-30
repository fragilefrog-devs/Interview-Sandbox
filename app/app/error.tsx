"use client";
import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { btnGhost, btnPrimary } from "@/components/ui";

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Page title="Something went wrong">
      <EmptyState icon={TriangleAlert} title="This page failed to load"
        action={<div className="flex gap-2"><button onClick={reset} className={btnPrimary}>Try again</button><Link href="/app" className={btnGhost}>Back to overview</Link></div>}>
        Your data is safe. Try again, and if it keeps happening, reload the page.
      </EmptyState>
    </Page>
  );
}
