"use client";
import { Printer } from "lucide-react";
import { btnGhost } from "@/components/ui";

export function PrintButton() {
  return <button type="button" onClick={() => window.print()} className={`${btnGhost} no-print`}><Printer className="size-4" aria-hidden />Print or save as PDF</button>;
}
