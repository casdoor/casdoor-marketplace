import type { Metadata } from "next";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

// marketplace.casdoor.com/ will become the developer console (sign in, upload, review); public pages live under /integrations.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function Home() {
  return (
    <div className="flex flex-col items-start gap-4">
      <h1 className="text-3xl font-semibold tracking-tight">Casdoor Marketplace</h1>
      <p className="max-w-xl text-muted-foreground">
        Browse app integrations, provider templates, themes and actions, then install them from the Marketplace page
        in your Casdoor admin console.
      </p>
      <Link href="/integrations" className={buttonVariants()}>
        Browse integrations
      </Link>
    </div>
  );
}
