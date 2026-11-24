"use client";

import { LogIn, LogOut } from "lucide-react";
import { useAuth } from "react-oidc-context";
import { AppProviders } from "@/components/app-providers";
import { Guestbook } from "@/components/guestbook";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAuthConfigured } from "@/lib/config";

function StatusCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{children}</CardDescription>
      </CardHeader>
    </Card>
  );
}

function SetupRequired() {
  return (
    <StatusCard title="Finish setup to enable sign-in">
      Set <code>NEXT_PUBLIC_SPACETIMEAUTH_CLIENT_ID</code> in <code>.env.local</code> and add the
      same client ID to <code>spacetimedb/src/auth-config.ts</code>. See the README for the
      SpacetimeAuth and Google provider steps.
    </StatusCard>
  );
}

function SignInCard({ onSignIn }: { onSignIn: () => void }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in to join the realtime guestbook</CardTitle>
        <CardDescription>
          SpacetimeAuth hosts the login page. Enable Google under Identity Providers in your
          SpacetimeAuth project to offer Google sign-up.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onSignIn}>
          <LogIn aria-hidden="true" />
          Continue with SpacetimeAuth
        </Button>
      </CardContent>
    </Card>
  );
}

function SignedInSession({
  user,
  onSignOut,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  onSignOut: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Signed in as{" "}
          <span className="font-medium text-foreground">
            {user.profile.name ?? user.profile.email}
          </span>
        </p>
        <Button variant="outline" size="sm" onClick={onSignOut}>
          <LogOut aria-hidden="true" />
          Sign out
        </Button>
      </div>
      <Guestbook idToken={user.id_token ?? ""} />
    </div>
  );
}

function hasSession(auth: ReturnType<typeof useAuth>): auth is ReturnType<typeof useAuth> & {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
} {
  return auth.isAuthenticated && !!auth.user;
}

function SessionGate() {
  const auth = useAuth();

  if (auth.isLoading)
    return <StatusCard title="Loading session…">Checking SpacetimeAuth.</StatusCard>;
  if (auth.error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sign-in failed</CardTitle>
          <CardDescription>{auth.error.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.assign("/")}>Try again</Button>
        </CardContent>
      </Card>
    );
  }
  if (!hasSession(auth)) {
    return <SignInCard onSignIn={() => void auth.signinRedirect()} />;
  }

  return <SignedInSession user={auth.user} onSignOut={() => void auth.signoutRedirect()} />;
}

export function StarterApp() {
  if (!isAuthConfigured) return <SetupRequired />;
  return (
    <AppProviders fallback={<StatusCard title="Loading…">Starting the app.</StatusCard>}>
      <SessionGate />
    </AppProviders>
  );
}
