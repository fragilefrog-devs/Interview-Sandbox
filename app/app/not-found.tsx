import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Page } from "@/components/page";
import { btnPrimary } from "@/components/ui";

export default function NotFound() {
  return (
    <Page title="Not found">
      <EmptyState icon={SearchX} title="We could not find that page" action={<Link href="/app/sessions" className={btnPrimary}>Go to sessions</Link>}>
        The session may have been deleted, or the link belongs to another account.
      </EmptyState>
    </Page>
  );
}
