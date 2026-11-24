# vinext + Cloudflare Workers + SpacetimeDB starter

A TypeScript starter for a realtime guestbook using **vinext** (the Next.js API on Vite) on **Cloudflare Workers**, **SpacetimeDB**, **SpacetimeAuth** with Google sign-in, and **Cloudflare R2**. It uses Effect for validation and error handling, shadcn/ui and Tailwind CSS for UI, pnpm for dependencies, and Vite+ (`vp`) for development, formatting, linting, typechecking, testing, and builds.

## What's included

- Server-rendered landing page with canonical URL, Open Graph, Twitter, JSON-LD, robots and sitemap metadata.
- Realtime guestbook powered by SpacetimeDB tables, subscriptions and reducers; authors can delete their messages.
- OIDC authorization-code/PKCE sign-in via SpacetimeAuth. Enable Google as an identity provider in your SpacetimeAuth project.
- Authenticated R2 uploads (PNG, JPEG, WebP, GIF and PDF; 5 MiB maximum) and public downloads by random key.
- Effect schemas and typed errors; generated SpacetimeDB bindings; reducer and upload-schema tests.
- A Cloudflare Worker configuration, simulated R2 for local development, and GitHub Actions checks. KV is not required.

## Prerequisites

- Node.js 22 or later (Node 24 recommended), pnpm 10.34.9, and the [SpacetimeDB CLI](https://spacetimedb.com/docs/quickstarts/typescript/).
- A [SpacetimeDB Maincloud](https://spacetimedb.com/) account and a SpacetimeAuth project/client with Google enabled for interactive sign-in. SpacetimeAuth is beta.
- A Cloudflare account with Workers and R2 enabled for deployment. Local development uses a simulated R2 bucket.

## Quick start

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# In a separate terminal:
pnpm spacetime:start
# Back in this terminal:
pnpm spacetime:publish:local
pnpm dev
```

Open http://localhost:5173. The landing page works without credentials, but the guestbook intentionally stays locked until authentication is configured.

### Configure SpacetimeAuth and Google

1. Create or publish a module on Maincloud and enable SpacetimeAuth for it in the SpacetimeDB dashboard. In its identity provider settings, enable Google and follow the dashboard's provider setup. Create a public OIDC client.
2. Register `http://localhost:5173/callback` and your production `https://YOUR_DOMAIN/callback` as redirect URIs; configure the corresponding logout URLs if required by the dashboard. Keep the local origin and port consistent with your dev server.
3. Set `NEXT_PUBLIC_SPACETIMEAUTH_CLIENT_ID` in `.env.local` to the client ID. In `spacetimedb/src/auth-config.ts`, add the same public client ID to `SPACETIMEAUTH_CLIENT_IDS`, then republish the module. The empty list rejects every connection by design. Never commit a client secret.
4. Restart the dev server after changing public values. Sign in using the hosted SpacetimeAuth page; Google appears when configured on the provider side. SpacetimeDB verifies tokens and the module checks issuer and audience.

The local SpacetimeDB server can use the same public SpacetimeAuth client, provided the redirect URI is registered. A real Google/OIDC flow requires the external setup above; no hosted service or provider is created by this repository.

## Configuration

All variables below are **public build-time values** embedded in browser and Worker bundles. Never put secrets in them. Copy `.env.example` to `.env.local`; rebuild after changing them.

| Variable                              | Default                             | Purpose                                                                |
| ------------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                | `http://localhost:5173`             | Canonical, Open Graph and sitemap origin                               |
| `NEXT_PUBLIC_SPACETIMEDB_URI`         | `ws://localhost:3000`               | WebSocket endpoint; use your Maincloud `wss://` endpoint in production |
| `NEXT_PUBLIC_SPACETIMEDB_DB_NAME`     | `vinext-starter`                    | Published database name or identity                                    |
| `NEXT_PUBLIC_SPACETIMEAUTH_AUTHORITY` | `https://auth.spacetimedb.com/oidc` | OIDC issuer and JWKS base URL                                          |
| `NEXT_PUBLIC_SPACETIMEAUTH_CLIENT_ID` | empty                               | Public OIDC client ID                                                  |

`spacetimedb/src/auth-config.ts` contains the module's allowed issuer and public client IDs. Keep these aligned with the frontend, and republish the module after edits. Module settings are compiled into the module, not read from environment variables.

## Deploy

1. Choose a unique Worker and R2 bucket name in `cloudflare.config.ts`.
2. Authenticate the Cloudflare CLI (`pnpm exec cf auth login`) or provide an appropriately scoped `CLOUDFLARE_API_TOKEN` through your deployment environment. Do not commit credentials. Ensure R2 is enabled; if automatic provisioning is unavailable, create the named bucket in Cloudflare first.
3. Configure the Maincloud endpoint and public values in the deployment build environment. Update the module auth config, then publish with `pnpm spacetime:publish` (change the database name in `package.json` if needed). Set the same database name in the public config and register production callback URLs.
4. Run `pnpm run deploy`. Set the actual production origin in `NEXT_PUBLIC_SITE_URL` before building/deploying.

The Worker serves the app and `/api/uploads`; SpacetimeDB is a separate service. `/api/health` reports whether the R2 binding and client ID are configured, not the health of external services. Provisioning and deployment require your own accounts and have not been performed by this template.

## Commands

| Command                                                   | Purpose                                                            |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `pnpm dev` / `pnpm run build` / `pnpm preview`            | Develop / build / preview the Worker                               |
| `pnpm check` / `pnpm fmt` / `pnpm lint`                   | Vite+ formatting, linting and typechecking                         |
| `pnpm test` / `pnpm test:module`                          | Web utility tests / in-memory module tests                         |
| `pnpm typegen` / `pnpm run ci`                            | Generate Worker types / run local CI checks                        |
| `pnpm spacetime:build` / `pnpm spacetime:generate`        | Build the module / regenerate client bindings after schema changes |
| `pnpm spacetime:publish:local` / `pnpm spacetime:publish` | Publish to local server / Maincloud                                |

Run `pnpm spacetime:generate` after changing the schema or reducer signatures and commit the generated bindings. Vite+ runs its native formatter, linter and typechecking; the optional Vite+ JavaScript lint plugin is not configured.

## Code health

Run `pnpm fallow` to inspect unused code, duplication and complexity. Run `pnpm react:doctor` to scan React code; add `--verbose` for detailed findings. Both tools are pinned as development dependencies. Generated SpacetimeDB bindings and build outputs are excluded; Fallow also recognizes vinext route entry points, reusable shadcn/ui starter components, and the separately installed SpacetimeDB CLI. Check findings before deleting code: framework conventions can produce false positives.

The **Code health** GitHub Actions workflow runs on pushes to `main` and on pull requests. Fallow reports the full project on `main` and gates newly introduced findings on PRs; React Doctor is advisory on both, scanning only newly introduced findings on PRs. Findings appear in the Actions logs (Fallow's full report also appears in the job summary). These checks do not add PR comments or configure branch protection. React Doctor disables its score/telemetry API and Socket.dev supply-chain check by default; remove `--no-score` or `--no-supply-chain` from its script to opt in.

## Security and limitations

- Uploads require a valid token, but anyone who knows an upload URL can download its contents; random keys are not authorization. Do not upload sensitive material. The example does not verify that an attachment key belongs to the message author and does not delete orphaned files. Add authorization, lifecycle cleanup, rate limits and content scanning for production.
- Allowed file types are checked using the client-provided MIME type, not file contents. Uploaded files should be treated as untrusted. PDFs download as attachments; image responses are served inline with `nosniff`.
- Profile names and HTTPS avatar URLs are stored in public SpacetimeDB tables; email is not stored in the module. Messages are visible to connected clients. Review your privacy needs before deployment.
- In local Vite preview, an oversized streaming upload may surface as a proxy 500 even though the Worker logs a 413; check the behavior on your own deployment and enforce limits at the edge.
- vinext is actively developed and SpacetimeAuth is beta. Verify compatibility, authentication and deployment behavior for your environment.

## License

[Apache License 2.0](LICENSE).
