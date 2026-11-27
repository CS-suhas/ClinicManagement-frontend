"use client";

import { ArrowRightIcon, DashboardIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";

/** Header action: sign in when signed out, the dashboard when signed in. */
export function LandingHeaderAuth() {
  const { user, loading } = useAuth();
  // Hold the space while the session loads so the header doesn't jump.
  if (loading) return <span aria-hidden="true" className="lp-headerLink" />;

  return user ? (
    <Link href="/dashboard" className="lp-headerLink">
      <DashboardIcon aria-hidden="true" />
      Dashboard
    </Link>
  ) : (
    <Link href="/login" className="lp-headerLink">
      Sign in
      <ArrowRightIcon aria-hidden="true" />
    </Link>
  );
}

/** Renders its children only once we know the visitor is signed out. */
export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return loading || user ? null : children;
}
