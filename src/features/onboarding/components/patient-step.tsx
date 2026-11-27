"use client";

import { Button, Callout, Flex, Grid, TextField } from "@radix-ui/themes";
import type { ChangeEvent, FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { useNotify } from "@/components/notifications";
import { useService } from "@/di/container-provider";
import type { PatientInput } from "@/domain/entities";
import { useAuth } from "@/features/auth/auth-provider";
import { useFormSubmit } from "@/hooks/use-form-submit";

/**
 * The patient profile form. Values live in the flow, so going back and forth
 * keeps what was typed. On success the session is refreshed and `onDone` runs.
 */
export function PatientStep({
  values,
  onChange,
  onBack,
  onDone,
}: {
  values: PatientInput;
  onChange: (values: PatientInput) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const authService = useService("authService");
  const { refresh } = useAuth();
  const { notifySuccess } = useNotify();
  const { submitting, fieldErrors, formError, run } = useFormSubmit();

  const bind = (field: keyof PatientInput) => ({
    id: `onboarding-${field}`,
    value: values[field],
    onChange: (e: ChangeEvent<HTMLInputElement>) =>
      onChange({ ...values, [field]: e.target.value }),
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
    if (ok) {
      notifySuccess("Profile created");
      onDone();
    }
  };

  return (
    <form onSubmit={submit} noValidate>
      <Flex direction="column" gap="3">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <FormField
            label="First name"
            htmlFor="onboarding-firstName"
            error={fieldErrors.firstName}
          >
            <TextField.Root {...bind("firstName")} autoComplete="given-name" />
          </FormField>
          <FormField
            label="Last name"
            htmlFor="onboarding-lastName"
            error={fieldErrors.lastName}
          >
            <TextField.Root {...bind("lastName")} autoComplete="family-name" />
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

      <Flex justify="between" gap="3" mt="5">
        <Button
          type="button"
          variant="soft"
          color="gray"
          disabled={submitting}
          onClick={onBack}
        >
          Back
        </Button>
        <Button type="submit" color="teal" loading={submitting}>
          Create my profile
        </Button>
      </Flex>
    </form>
  );
}
