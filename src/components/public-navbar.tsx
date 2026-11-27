"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import { useAuth } from "@/features/auth/auth-provider";

export type Crumb = {
  label: string;
  href?: string;
};

export function PublicNavbar({ crumbs }: { crumbs: Crumb[] }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const signedIn = !loading && user !== null;
  const loginHref =
    pathname.startsWith("/login") || pathname === "/"
      ? "/login"
      : `/login?next=${encodeURIComponent(pathname)}`;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-[var(--mp-surface)] px-6 py-3 md:px-12"
      style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Wordmark />

        <nav aria-label="Breadcrumb">
          <ol className="m-0 flex list-none items-center gap-1 p-0 text-sm">
            {crumbs.map((crumb, index) => (
              <Fragment key={crumb.label}>
                {index > 0 && (
                  <li aria-hidden="true" className="flex">
                    <ChevronRightIcon color="var(--gray-8)" />
                  </li>
                )}
                <li>
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="no-underline hover:underline"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span
                      aria-current="page"
                      className="font-medium"
                      style={{ color: "var(--mp-ink)" }}
                    >
                      {crumb.label}
                    </span>
                  )}
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      </div>

      <Button asChild color="teal">
        <Link href={signedIn ? "/dashboard" : loginHref}>
          {signedIn ? "Go to dashboard" : "Log in"}
        </Link>
      </Button>
    </div>
  );
}
