"use client";

import { ArrowRightIcon, DashboardIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAuth } from "@/features/auth/auth-provider";

export function LandingHeaderAuth() {
  const { user, loading } = useAuth();
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

export function SignedOutOnly({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  return loading || user ? null : children;
}
