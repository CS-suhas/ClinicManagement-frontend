"use client";

import { Button, Flex, Heading, Spinner, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { ErrorCallout } from "@/components/error-callout";
import { PublicNavbar } from "@/components/public-navbar";
import { Surface } from "@/components/ui/surface";
import { useAuth } from "@/features/auth/auth-provider";
import { RoleBadges } from "@/features/auth/role-badges";
import { getErrorMessage } from "@/lib/errors";
import { safeNext } from "@/lib/safe-next";

function LoginContent() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { loading } = useAuth();

  if (loading)
    return (
      <Flex justify="center" py="9">
        <Spinner size="3" />
      </Flex>
    );
  return <KeycloakSignIn next={next} />;
}

function KeycloakSignIn({ next }: { next: string }) {
  const { user, signIn } = useAuth();
  const [pending, setPending] = useState<"signIn" | "register" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function redirect(mode: "signIn" | "register") {
    setPending(mode);
    setError(null);
    try {
      await signIn({
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
