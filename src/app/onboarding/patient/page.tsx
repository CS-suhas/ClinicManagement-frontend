"use client";

import { Flex, Spinner } from "@radix-ui/themes";
import { Suspense } from "react";
import { PatientOnboardingForm } from "@/presentation/features/onboarding/patient-onboarding-form";

export default function PatientOnboardingPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      }
    >
      <PatientOnboardingForm />
    </Suspense>
  );
}
