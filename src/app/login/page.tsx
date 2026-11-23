"use client";

import {
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Spinner,
  Text,
} from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useService } from "@/di/container-provider";
import { useAuth } from "@/presentation/auth/auth-provider";
import { RoleBadges } from "@/presentation/auth/role-badges";
import { ErrorCallout } from "@/presentation/components/error-callout";
import { PublicNavbar } from "@/presentation/components/public-navbar";
import { getErrorMessage } from "@/presentation/lib/errors";

/** Only same-app paths are accepted, so ?next= cannot send people off-site. */
function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/dashboard";
  return value;
}

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
      <Card>
        <Flex direction="column" gap="3" align="start">
          <Text color="gray">
            Sign-in is handled by Keycloak, which is not configured in this
            build yet.
          </Text>
          <Button color="teal" size="3" disabled>
            Sign in with Keycloak (not configured)
          </Button>
        </Flex>
      </Card>
    );

  return (
    <Flex direction="column" gap="4">
      {user && (
        <Card>
          <Flex direction="column" gap="3" align="start">
            <Text>
              You are signed in as <strong>{user.displayName}</strong>.
            </Text>
            <RoleBadges roles={user.roles} />
            <Button asChild color="teal">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </Flex>
        </Card>
      )}
      <Text color="gray">
        {user ? "Or switch to another demo account." : "Pick a demo account."}{" "}
        Mock data only; nothing is sent to a server.
      </Text>
      {error && <ErrorCallout message={error} />}
      <Grid columns={{ initial: "1", sm: "2" }} gap="4">
        {personas.map((persona) => (
          <Card key={persona.id} asChild>
            <button
              type="button"
              disabled={pendingId !== null}
              onClick={() => void handleSignIn(persona.id)}
              aria-label={`Sign in as ${persona.label}`}
              className="w-full cursor-pointer text-left disabled:cursor-wait disabled:opacity-60"
            >
              <Flex direction="column" gap="2">
                <Text size="3" weight="bold">
                  {pendingId === persona.id ? "Signing in..." : persona.label}
                </Text>
                <Text size="2" color="gray">
                  {persona.description}
                </Text>
                <RoleBadges roles={persona.user.roles} />
              </Flex>
            </button>
          </Card>
        ))}
      </Grid>
    </Flex>
  );
}

export default function LoginPage() {
  return (
    <Flex direction="column" minHeight="100vh">
      <PublicNavbar
        crumbs={[{ label: "Home", href: "/" }, { label: "Sign in" }]}
      />
      <Box asChild flexGrow="1" px={{ initial: "4", md: "6" }} py="8">
        <main>
          <Box maxWidth="720px" mx="auto">
            <Heading size="7" mb="2">
              Sign in
            </Heading>
            <Text as="p" color="gray" mb="6">
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
          </Box>
        </main>
      </Box>
    </Flex>
  );
}
