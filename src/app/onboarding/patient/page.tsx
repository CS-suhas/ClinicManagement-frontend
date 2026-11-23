import { redirect } from "next/navigation";

/** The old patient-only form. Kept as a redirect so bookmarks and links keep working. */
export default async function PatientOnboardingRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : null;
  redirect(
    next
      ? `/onboarding?as=patient&next=${encodeURIComponent(next)}`
      : "/onboarding?as=patient",
  );
}
