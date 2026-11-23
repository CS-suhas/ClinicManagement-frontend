"use client";

import { ChevronRightIcon } from "@radix-ui/react-icons";
import { Button } from "@radix-ui/themes";
import Link from "next/link";
import { Fragment } from "react";
import { useAuth } from "@/presentation/auth/auth-provider";

export interface Crumb {
  label: string;
  /** Omit for the current page. */
  href?: string;
}

/** White top strip of the public pages: logo, breadcrumbs and login. */
export function PublicNavbar({ crumbs }: { crumbs: Crumb[] }) {
  const { user, loading } = useAuth();
  const signedIn = !loading && user !== null;

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 bg-white px-6 py-3 md:px-12"
      style={{ borderBottom: "1px solid var(--mp-paper-deep)" }}
    >
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-lg font-bold no-underline"
          style={{ color: "var(--mp-ink)", letterSpacing: "-0.02em" }}
        >
          <svg
            width="24"
            height="18"
            viewBox="0 0 26 20"
            fill="none"
            stroke="var(--mp-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M1 11h6l3-9 5 16 3-7h7" />
          </svg>
          medipulse life
        </Link>

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
        <Link href={signedIn ? "/dashboard" : "/login"}>
          {signedIn ? "Go to dashboard" : "Log in"}
        </Link>
      </Button>
    </div>
  );
}
