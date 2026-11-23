"use client";

import { Flex, Spinner } from "@radix-ui/themes";
import { Suspense } from "react";
import { OnboardingFlow } from "@/presentation/features/onboarding/onboarding-flow";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <Flex justify="center" py="9">
          <Spinner size="3" />
        </Flex>
      }
    >
      <OnboardingFlow />
    </Suspense>
  );
}
