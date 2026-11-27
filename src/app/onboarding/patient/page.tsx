import { redirect } from "next/navigation";

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
