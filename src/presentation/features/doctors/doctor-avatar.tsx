import { initialsOf } from "./doctor-profile";

/** Initials in a ring; the API has no doctor photos. */
export function DoctorAvatar({
  name,
  size = 80,
}: {
  name: string;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        color: "var(--mp-primary-dark)",
        background: "#fff",
        border: "1px solid var(--mp-primary)",
        letterSpacing: "-0.02em",
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
