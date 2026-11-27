"use client";

import { Button, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Surface } from "@/components/ui/surface";
import type { PatientInput } from "@/domain/entities";
import { useAuth } from "@/features/auth/auth-provider";
import { safeNext } from "@/lib/safe-next";
import { ApprovalStatusStep } from "./approval-status-step";
import { DoctorStep } from "./doctor-step";
import { OnboardingStepper } from "./onboarding-stepper";
import {
  type DoctorDetails,
  destinationAfter,
  doctorDefaults,
  type OnboardingChoice,
  type OnboardingStep,
  patientDefaults,
  resolveStep,
  stepLabels,
} from "./onboarding-steps";
import { PatientStep } from "./patient-step";
import { RoleStep } from "./role-step";

const TITLES: Record<OnboardingStep, { title: string; subtitle: string }> = {
  role: {
    title: "Welcome to MediPulse Life",
    subtitle: "Tell us how you will use it.",
  },
  patient: {
    title: "Create your patient profile",
    subtitle:
      "Patient accounts can book appointments online. These details are used for your bookings.",
  },
  doctor: {
    title: "Register as a doctor",
    subtitle:
      "Tell us about your practice and the clinic you work at. An administrator reviews the details before you can take bookings.",
  },
  status: {
    title: "Waiting for approval",
    subtitle: "Your application is with the administrators.",
  },
  done: {
    title: "You are all set",
    subtitle: "Your account is ready to use.",
  },
};

export function OnboardingFlow() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const destination = destinationAfter(safeNext(params.get("next")));
  const as = params.get("as");
  const [choice, setChoice] = useState<OnboardingChoice | null>(
    as === "patient" || as === "doctor" ? as : null,
  );
  const [patientDraft, setPatientDraft] = useState<PatientInput | null>(null);
  const [doctorDraft, setDoctorDraft] = useState<DoctorDetails | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const onRefresh = useCallback(() => refresh(), [refresh]);

  const step = user ? resolveStep(user, choice) : "role";
  const path: OnboardingChoice | null =
    choice ?? (user?.provider ? "doctor" : user?.patient ? "patient" : null);

  useEffect(() => {
    if (step) headingRef.current?.focus();
  }, [step]);

  if (!user) return null;

  const { labels, current } = stepLabels(step, path);
  const copy = TITLES[step];

  return (
    <div className="mx-auto flex max-w-[520px] flex-col gap-4">
      {step !== "done" && (
        <OnboardingStepper labels={labels} current={current} />
      )}
      <Surface padding="lg">
        <h1
          ref={headingRef}
          tabIndex={-1}
          className="m-0 text-xl font-semibold outline-none"
          style={{ color: "var(--mp-ink)" }}
        >
          {step === "status" && user.provider?.verificationStatus === "REJECTED"
            ? "Application rejected"
            : copy.title}
        </h1>
        <Text
          as="p"
          size="2"
          mb="5"
          mt="1"
          style={{ color: "var(--mp-muted)" }}
        >
          {step === "status" && user.provider?.verificationStatus === "REJECTED"
            ? "Your application was not approved."
            : copy.subtitle}
        </Text>

        {step === "role" && (
          <RoleStep onContinue={(picked) => setChoice(picked)} />
        )}
        {step === "patient" && (
          <PatientStep
            values={patientDraft ?? patientDefaults(user)}
            onChange={setPatientDraft}
            onBack={() => setChoice(null)}
            onDone={() => router.replace(destination)}
          />
        )}
        {step === "doctor" && (
          <DoctorStep
            values={doctorDraft ?? doctorDefaults(user)}
            onChange={setDoctorDraft}
            onBack={() => setChoice(null)}
          />
        )}
        {step === "status" &&
          (user.provider?.verificationStatus === "PENDING" ||
            user.provider?.verificationStatus === "REJECTED") && (
            <ApprovalStatusStep
              status={user.provider.verificationStatus}
              onRefresh={onRefresh}
            />
          )}
        {step === "done" && (
          <Button asChild color="teal">
            <Link href={destination}>Continue</Link>
          </Button>
        )}
      </Surface>
    </div>
  );
}
