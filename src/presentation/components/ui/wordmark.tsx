import Link from "next/link";

/** ECG-line logo and "medipulse life" wordmark used by every top bar. */
export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 whitespace-nowrap text-lg font-bold no-underline"
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
  );
}
