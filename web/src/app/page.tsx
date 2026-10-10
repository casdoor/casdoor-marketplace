import type { Metadata } from "next";
import Link from "next/link";

// The backend redirects / to /integrations/, so this page is only reached on a static host without that redirect.
// CasWAF also takes build/index.html as the sign that the frontend has been built.
export const metadata: Metadata = {
  robots: { index: false },
};

export default function Home() {
  return (
    <p>
      <Link href="/integrations" className="underline underline-offset-4">
        Browse Casdoor integrations
      </Link>
    </p>
  );
}
