"use client";

import { Button, Callout, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import { type FormEvent, useId } from "react";
import { useService } from "@/di/container-provider";
import type {
  ProviderGender,
  ProviderRegistrationInput,
} from "@/domain/entities";
import { ConflictError } from "@/domain/errors";
import { useAuth } from "@/presentation/auth/auth-provider";
import { FormField } from "@/presentation/components/form-field";
import { useNotify } from "@/presentation/components/notifications";
import { SegmentedToggle } from "@/presentation/components/ui/segmented-toggle";
import { useFormSubmit } from "@/presentation/hooks/use-form-submit";
import { COMMON_SPECIALTIES, type DoctorDetails } from "./onboarding-steps";

const GENDER_OPTIONS: { value: DoctorDetails["gender"]; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NONE", label: "Prefer not to say" },
];

/**
 * The doctor registration form. It creates a PENDING doctor; an administrator
 * verifies the details before the doctor can take bookings. A 409 means the
 * account is already linked to a doctor, so the flow moves to the status step.
 */
export function DoctorStep({
  values,
  onChange,
  onBack,
}: {
  values: DoctorDetails;
  onChange: (values: DoctorDetails) => void;
  onBack: () => void;
}) {
  const authService = useService("authService");
  const { refresh } = useAuth();
  const { notifySuccess, notifyInfo } = useNotify();
  const { submitting, fieldErrors, formError, run } = useFormSubmit();
  const specialtyListId = useId();

  const set = <K extends keyof DoctorDetails>(
    field: K,
    value: DoctorDetails[K],
  ) => onChange({ ...values, [field]: value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input: ProviderRegistrationInput = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      specialty: values.specialty.trim(),
      fee: values.fee.trim() === "" ? null : Number(values.fee),
      gender:
        values.gender === "NONE" ? null : (values.gender as ProviderGender),
    };
    let registered = false;
    const ok = await run(async () => {
      try {
        await authService.registerAsProvider(input);
        registered = true;
      } catch (error) {
        if (!(error instanceof ConflictError)) throw error;
        notifyInfo("You already have a doctor profile.");
      }
      await refresh();
    });
    if (ok && registered)
      notifySuccess("Application submitted. An administrator will review it.");
  };

  return (
    <form onSubmit={submit} noValidate>
      <Flex direction="column" gap="3">
        <Grid columns={{ initial: "1", sm: "2" }} gap="3">
          <FormField
            label="First name"
            htmlFor="doctor-firstName"
            error={fieldErrors.firstName}
          >
            <TextField.Root
              id="doctor-firstName"
              value={values.firstName}
              autoComplete="given-name"
              onChange={(e) => set("firstName", e.target.value)}
            />
          </FormField>
          <FormField
            label="Last name"
            htmlFor="doctor-lastName"
            error={fieldErrors.lastName}
          >
            <TextField.Root
              id="doctor-lastName"
              value={values.lastName}
              autoComplete="family-name"
              onChange={(e) => set("lastName", e.target.value)}
            />
          </FormField>
        </Grid>

        <FormField
          label="Specialty"
          htmlFor="doctor-specialty"
          error={fieldErrors.specialty}
        >
          <TextField.Root
            id="doctor-specialty"
            value={values.specialty}
            list={specialtyListId}
            placeholder="Choose or type a specialty"
            onChange={(e) => set("specialty", e.target.value)}
          />
          <datalist id={specialtyListId}>
            {COMMON_SPECIALTIES.map((specialty) => (
              <option key={specialty} value={specialty} />
            ))}
          </datalist>
        </FormField>

        <Grid columns={{ initial: "1", sm: "2" }} gap="3" align="start">
          <FormField
            label="Consultation fee (optional)"
            htmlFor="doctor-fee"
            error={fieldErrors.fee}
          >
            <TextField.Root
              id="doctor-fee"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={values.fee}
              onChange={(e) => set("fee", e.target.value)}
            >
              <TextField.Slot>LKR</TextField.Slot>
            </TextField.Root>
          </FormField>
          <FormField label="Gender (optional)" error={fieldErrors.gender}>
            <SegmentedToggle
              ariaLabel="Gender"
              value={values.gender}
              onChange={(gender) => set("gender", gender)}
              options={GENDER_OPTIONS}
            />
          </FormField>
        </Grid>
        <Text size="1" style={{ color: "var(--mp-muted)" }}>
          Your details are reviewed before you can take bookings.
        </Text>
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
          Submit for review
        </Button>
      </Flex>
    </form>
  );
}
