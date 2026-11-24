import { publicConfig } from "@/lib/config";

export const site = {
  name: "vinext + SpacetimeDB starter",
  title: "vinext Cloudflare Workers + SpacetimeDB starter template",
  description:
    "Open-source starter for realtime apps: vinext (Next.js API on Vite) on Cloudflare Workers, SpacetimeDB backend, SpacetimeAuth sign-in with Google, Cloudflare R2 uploads, Effect TypeScript, shadcn/ui, and Tailwind CSS.",
  url: publicConfig.siteUrl,
  repository: "https://github.com/itsyasirkhandev/vinext-cloudflare-spacetimedb-starter",
  keywords: [
    "vinext",
    "Cloudflare Workers",
    "Cloudflare R2",
    "SpacetimeDB",
    "SpacetimeAuth",
    "Google sign-in",
    "Effect TypeScript",
    "shadcn/ui",
    "Tailwind CSS",
    "Vite+",
    "Next.js on Cloudflare",
    "realtime starter template",
  ],
} as const;
