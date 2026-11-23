"use client";

import { Button, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/presentation/auth/auth-provider";
import { RoleBadges } from "@/presentation/auth/role-badges";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { PublicNavbar } from "@/presentation/components/public-navbar";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import { Surface } from "@/presentation/components/ui/surface";
import { getErrorMessage } from "@/presentation/lib/errors";
import { safeNext } from "@/presentation/lib/safe-next";

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
      await signIn(personaId);
      router.replace(next);
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
  if (personas.length === 0)
    return (
      <Surface padding="lg">
        <Flex direction="column" gap="3" align="start">
          <Text style={{ color: "var(--mp-muted)" }}>
            Sign-in is handled by Keycloak, which is not configured in this
            build yet.
          </Text>
          <Button color="teal" size="3" disabled>
            Sign in with Keycloak (not configured)
          </Button>
        </Flex>
      </Surface>
    );

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

export default function LoginPage() {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "#f3f8f7" }}
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
