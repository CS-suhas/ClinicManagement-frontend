"use client";

import { Button, Callout, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { useService } from "@/di/container-provider";
import type { PatientInput } from "@/domain/entities";
import { useAuth } from "@/presentation/auth/auth-provider";
import { FormField } from "@/presentation/components/form-field";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { Surface } from "@/presentation/components/ui/surface";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import { safeNext } from "@/presentation/lib/safe-next";

const EMPTY: PatientInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  phoneNumber: "",
  email: "",
};

/** First word becomes the first name; the rest becomes the last name. */
export function splitDisplayName(displayName: string): {
  firstName: string;
  lastName: string;
} {
  const [firstName = "", ...rest] = displayName.trim().split(/\s+/);
  return { firstName, lastName: rest.join(" ") };
}

/** Creates the signed-in user's patient profile, then continues to `?next=`. */
export function PatientOnboardingForm() {
  const authService = useService("authService");
  const { user, refresh } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { submitting, fieldErrors, formError, run } = useFormSubmit();
  const [values, setValues] = useState<PatientInput>(() => ({
    ...EMPTY,
    ...splitDisplayName(user?.displayName ?? ""),
  }));

  const bind = (field: keyof PatientInput) => ({
    id: `onboarding-${field}`,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [field]: e.target.value })),
  });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const ok = await run(async () => {
      await authService.createPatientProfile({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        dateOfBirth: values.dateOfBirth,
        phoneNumber: values.phoneNumber.trim(),
        email: values.email.trim(),
      });
      // Re-read the session so the new patient link and role are in place.
      await refresh();
    });
    if (ok) router.replace(next);
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <PageHeader
        title="Create your patient profile"
        subtitle="Patient accounts can book appointments online. These details are used for your bookings."
      />

      {user?.patient ? (
        <Surface padding="lg">
          <Flex direction="column" gap="3" align="start">
            <Text style={{ color: "var(--mp-ink)" }}>
              Your account already has a patient profile.
            </Text>
            <Button asChild color="teal">
              <Link href={next}>Continue</Link>
            </Button>
          </Flex>
        </Surface>
      ) : (
        <Surface padding="lg">
          <form onSubmit={submit} noValidate>
            <Flex direction="column" gap="3">
              <Grid columns={{ initial: "1", sm: "2" }} gap="3">
                <FormField
                  label="First name"
                  htmlFor="onboarding-firstName"
                  error={fieldErrors.firstName}
                >
                  <TextField.Root
                    {...bind("firstName")}
                    autoComplete="given-name"
                  />
                </FormField>
                <FormField
                  label="Last name"
                  htmlFor="onboarding-lastName"
                  error={fieldErrors.lastName}
                >
                  <TextField.Root
                    {...bind("lastName")}
                    autoComplete="family-name"
                  />
                </FormField>
              </Grid>
              <FormField
                label="Date of birth"
                htmlFor="onboarding-dateOfBirth"
                error={fieldErrors.dateOfBirth}
              >
                <TextField.Root
                  {...bind("dateOfBirth")}
                  type="date"
                  autoComplete="bday"
                />
              </FormField>
              <Grid columns={{ initial: "1", sm: "2" }} gap="3">
                <FormField
                  label="Phone number"
                  htmlFor="onboarding-phoneNumber"
                  error={fieldErrors.phoneNumber}
                >
                  <TextField.Root
                    {...bind("phoneNumber")}
                    type="tel"
                    autoComplete="tel"
                  />
                </FormField>
                <FormField
                  label="Email"
                  htmlFor="onboarding-email"
                  error={fieldErrors.email}
                >
                  <TextField.Root
                    {...bind("email")}
                    type="email"
                    autoComplete="email"
                  />
                </FormField>
              </Grid>
            </Flex>

            {formError && (
              <Callout.Root color="red" role="alert" size="1" mt="4">
                <Callout.Text>{formError}</Callout.Text>
              </Callout.Root>
            )}

            <Flex justify="end" gap="3" mt="5">
              <Button
                asChild
                variant="outline"
                color="gray"
                highContrast
                disabled={submitting}
              >
                <Link href={next}>Not now</Link>
              </Button>
              <Button type="submit" color="teal" loading={submitting}>
                Create patient profile
              </Button>
            </Flex>
          </form>
        </Surface>
      )}
    </div>
  );
}
