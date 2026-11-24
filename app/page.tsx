import { StarterApp } from "@/components/starter-app";
import { site } from "@/lib/site";

const stack = [
  ["vinext", "Next.js App Router API on Vite, deployed to Cloudflare Workers"],
  ["SpacetimeDB", "Realtime database and TypeScript server module (reducers + tables)"],
  ["SpacetimeAuth", "Managed OIDC sign-in; enable Google as an identity provider"],
  ["Cloudflare R2", "Authenticated file uploads served from a Worker route"],
  ["Effect", "Typed errors and Schema validation in Worker routes and the browser"],
  ["shadcn/ui + Tailwind", "Accessible components styled with Tailwind CSS v4"],
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: site.title,
  description: site.description,
  codeRepository: site.repository,
  license: "https://www.apache.org/licenses/LICENSE-2.0",
  programmingLanguage: "TypeScript",
  keywords: site.keywords.join(", "),
};

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-10 px-6 py-12">
      <script
        type="application/ld+json"
        // Static, trusted object defined above.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className="flex flex-col gap-4">
        <p className="text-sm font-semibold tracking-wide text-orange-600 uppercase">
          Open-source starter template
        </p>
        <h1 className="text-4xl leading-tight font-semibold sm:text-5xl">
          Realtime apps on Cloudflare Workers with vinext and SpacetimeDB
        </h1>
        <p className="max-w-2xl text-lg leading-8 text-muted-foreground">{site.description}</p>
        <p>
          <a className="font-medium underline underline-offset-4" href={site.repository}>
            View the source on GitHub
          </a>
        </p>
      </header>

      <section aria-labelledby="demo-heading" className="flex flex-col gap-4">
        <h2 id="demo-heading" className="text-2xl font-semibold">
          Live demo
        </h2>
        <StarterApp />
      </section>

      <section aria-labelledby="stack-heading" className="flex flex-col gap-4">
        <h2 id="stack-heading" className="text-2xl font-semibold">
          What is included
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          {stack.map(([name, detail]) => (
            <div key={name} className="rounded-lg border p-4">
              <dt className="font-medium">{name}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{detail}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
