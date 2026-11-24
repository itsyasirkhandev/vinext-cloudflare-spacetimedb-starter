import type { Metadata } from "next";
import { StarterApp } from "@/components/starter-app";

// SpacetimeAuth redirects here with `?code=`; the OIDC provider finishes the
// exchange and then returns the user to `/`.
export const metadata: Metadata = { title: "Signing in", robots: { index: false, follow: false } };

export default function Callback() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <StarterApp />
    </main>
  );
}
