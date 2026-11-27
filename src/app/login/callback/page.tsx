"use client";

import { Button, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ErrorCallout } from "@/components/error-callout";
import { PublicNavbar } from "@/components/public-navbar";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/features/auth/auth-provider";
import { needsOnboarding } from "@/features/auth/permissions";
import { getErrorMessage } from "@/lib/errors";
import { safeNext } from "@/lib/safe-next";

export default function LoginCallbackPage() {
  const router = useRouter();
  const { completeSignIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per page load.
  useEffect(() => {
    let active = true;
    completeSignIn()
      .then(({ user, returnTo }) => {
        if (!active) return;
        if (!user) {
          setError("Signed in, but your account could not be loaded.");
          return;
        }
        const next = safeNext(returnTo);
        router.replace(
          needsOnboarding(user)
            ? `/onboarding?next=${encodeURIComponent(next)}`
            : next,
        );
      })
      .catch((e: unknown) => {
        if (active) setError(getErrorMessage(e));
      });
    return () => {
      active = false;
    };
  }, []);

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
          <Heading as="h1" size="6" mb="6" style={{ color: "var(--mp-ink)" }}>
            Signing in
          </Heading>
          {error ? (
            <Surface padding="lg">
              <Flex direction="column" gap="3" align="start">
                <ErrorCallout message={`Sign-in did not complete: ${error}`} />
                <Button asChild color="teal">
                  <Link href="/login">Try again</Link>
                </Button>
              </Flex>
            </Surface>
          ) : (
            <Flex align="center" gap="3">
              <Spinner size="3" />
              <Text style={{ color: "var(--mp-muted)" }}>
                Finishing sign-in…
              </Text>
            </Flex>
          )}
        </div>
      </main>
    </div>
  );
}
