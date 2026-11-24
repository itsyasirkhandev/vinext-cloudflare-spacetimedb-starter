"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthProvider, useAuth } from "react-oidc-context";
import { SpacetimeDBProvider } from "spacetimedb/react";
import { publicConfig } from "@/lib/config";
import { DbConnection, type ErrorContext } from "@/lib/module_bindings";

function onSigninCallback() {
  // Drop `?code=&state=` and leave /callback once SpacetimeAuth redirects back.
  window.history.replaceState({}, document.title, "/");
}

/** Opens the SpacetimeDB connection only after SpacetimeAuth returns an ID token. */
function SpacetimeConnection({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const idToken = auth.user?.id_token;

  const connectionBuilder = useMemo(
    () =>
      idToken
        ? DbConnection.builder()
            .withUri(publicConfig.spacetimedbUri)
            .withDatabaseName(publicConfig.spacetimedbDatabase)
            .withToken(idToken)
            .onConnectError((_ctx: ErrorContext, error: Error) => {
              console.error("SpacetimeDB connection failed", error);
            })
        : null,
    [idToken],
  );

  if (!connectionBuilder) return <>{children}</>;
  return (
    <SpacetimeDBProvider key={idToken} connectionBuilder={connectionBuilder}>
      {children}
    </SpacetimeDBProvider>
  );
}

/**
 * Browser-only providers. `oidc-client-ts` needs `window` and `sessionStorage`,
 * so nothing renders until after hydration.
 */
export function AppProviders({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const oidc = useMemo(
    () =>
      mounted
        ? {
            authority: publicConfig.spacetimeAuthAuthority,
            client_id: publicConfig.spacetimeAuthClientId,
            redirect_uri: `${window.location.origin}/callback`,
            post_logout_redirect_uri: window.location.origin,
            scope: "openid profile email",
            response_type: "code",
            automaticSilentRenew: true,
          }
        : null,
    [mounted],
  );

  if (!oidc) return <>{fallback}</>;
  return (
    <AuthProvider {...oidc} onSigninCallback={onSigninCallback}>
      <SpacetimeConnection>{children}</SpacetimeConnection>
    </AuthProvider>
  );
}
