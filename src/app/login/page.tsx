"use client";

import { Button, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { needsOnboarding } from "@/application/auth/permissions";
import { ErrorCallout } from "@/components/error-callout";
import { PublicNavbar } from "@/components/public-navbar";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { Surface } from "@/components/ui/surface";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/features/auth/auth-provider";
import { RoleBadges } from "@/features/auth/role-badges";
import { getErrorMessage } from "@/lib/errors";
import { safeNext } from "@/lib/safe-next";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { user, loading, signIn } = useAuth();
  const personas = useService("authPersonas");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(personaId: string) {
    setPendingId(personaId);
    setError(null);
    try {
      const signedIn = await signIn(personaId);
      // Accounts that are not set up yet go through onboarding first, then on to `next`.
      router.replace(
        needsOnboarding(signedIn)
          ? `/onboarding?next=${encodeURIComponent(next)}`
          : next,
      );
    } catch (e) {
      setError(getErrorMessage(e));
      setPendingId(null);
    }
  }

  if (loading)
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );

  // No demo personas means the real sign-in provider is in use (rest mode).
  if (personas.length === 0) return <KeycloakSignIn next={next} />;

  return (
    <Flex direction="column" gap="4">
      {user && (
        <Surface padding="lg">
          <Flex direction="column" gap="3" align="start">
            <Text style={{ color: "var(--mp-ink)" }}>
              You are signed in as <strong>{user.displayName}</strong>.
            </Text>
            <RoleBadges roles={user.roles} />
            <Button asChild color="teal">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </Flex>
        </Surface>
      )}
      <Text style={{ color: "var(--mp-muted)" }}>
        {user ? "Or switch to another demo account." : "Pick a demo account."}{" "}
        Mock data only; nothing is sent to a server.
      </Text>
      {error && <ErrorCallout message={error} />}
      <div className="grid gap-4 sm:grid-cols-2">
        {personas.map((persona) => (
          <Surface
            key={persona.id}
            as="button"
            padding="lg"
            disabled={pendingId !== null}
            onClick={() => void handleSignIn(persona.id)}
            aria-label={`Sign in as ${persona.label}`}
            className="flex w-full cursor-pointer items-start gap-4 text-left transition-shadow hover:shadow-md disabled:cursor-wait disabled:opacity-60"
          >
            <PersonAvatar name={persona.user.displayName} size={56} />
            <div className="flex min-w-0 flex-col gap-1">
              <span
                className="text-base font-semibold"
                style={{ color: "var(--mp-ink)" }}
              >
                {pendingId === persona.id ? "Signing in..." : persona.label}
              </span>
              <span className="text-sm" style={{ color: "var(--mp-muted)" }}>
                {persona.description}
              </span>
              <div className="mt-2">
                <RoleBadges roles={persona.user.roles} />
              </div>
            </div>
          </Surface>
        ))}
      </div>
    </Flex>
  );
}

/**
 * Keycloak sign-in: both buttons leave the app for Keycloak (sign-in form or
 * registration form) and come back through /login/callback, then on to `next`.
 */
function KeycloakSignIn({ next }: { next: string }) {
  const { user, signIn } = useAuth();
  const [pending, setPending] = useState<"signIn" | "register" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redirect(mode: "signIn" | "register") {
    setPending(mode);
    setError(null);
    try {
      // Resolves only if the redirect could not start.
      await signIn(undefined, {
        returnTo: next,
        register: mode === "register",
      });
    } catch (e) {
      setError(getErrorMessage(e));
      setPending(null);
    }
  }

  if (user)
    return (
      <Surface padding="lg">
        <Flex direction="column" gap="3" align="start">
          <Text style={{ color: "var(--mp-ink)" }}>
            You are signed in as <strong>{user.displayName}</strong>.
          </Text>
          <RoleBadges roles={user.roles} />
          <Button asChild color="teal">
            <Link href={next}>Continue</Link>
          </Button>
        </Flex>
      </Surface>
    );

  return (
    <Surface padding="lg">
      <Flex direction="column" gap="4" align="start">
        <Text style={{ color: "var(--mp-muted)" }}>
          Sign in with your MediPulse Life account. New here? Create an account
          to book appointments or apply as a doctor.
        </Text>
        {error && <ErrorCallout message={error} />}
        <Flex gap="3" wrap="wrap">
          <Button
            color="teal"
            size="3"
            disabled={pending !== null}
            onClick={() => void redirect("signIn")}
          >
            {pending === "signIn" ? "Redirecting..." : "Sign in"}
          </Button>
          <Button
            color="teal"
            size="3"
            variant="outline"
            disabled={pending !== null}
            onClick={() => void redirect("register")}
          >
            {pending === "register" ? "Redirecting..." : "Create account"}
          </Button>
        </Flex>
      </Flex>
    </Surface>
  );
}

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--mp-bg)" }}
    >
      <PublicNavbar
        crumbs={[{ label: "Home", href: "/" }, { label: "Sign in" }]}
      />
      <main className="flex-1 px-6 py-8 md:px-12">
        <div className="max-w-[720px]">
          <Heading as="h1" size="6" mb="2" style={{ color: "var(--mp-ink)" }}>
            Sign in
          </Heading>
          <Text as="p" size="2" mb="6" style={{ color: "var(--mp-muted)" }}>
            Access the MediPulse Life management console.
          </Text>
          <Suspense
            fallback={
              <Flex justify="center" py="9">
                <Spinner size="3" />
              </Flex>
            }
          >
            <LoginContent />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
