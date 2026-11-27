"use client";

import { Button, Callout, Flex, Grid, Text, TextField } from "@radix-ui/themes";
import { type FormEvent, useId } from "react";
import { ErrorCallout } from "@/components/error-callout";
import { FormField } from "@/components/form-field";
import { SearchSelectField } from "@/components/form-fields";
import { useNotify } from "@/components/notifications";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useService } from "@/di/container-provider";
import type {
  ProviderGender,
  ProviderRegistrationInput,
} from "@/domain/entities";
import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";
import { useAuth } from "@/features/auth/auth-provider";
import { useFormSubmit } from "@/hooks/use-form-submit";
import { useSearchOptions } from "@/hooks/use-search-options";
import { COMMON_SPECIALTIES, type DoctorDetails } from "./onboarding-steps";

const GENDER_OPTIONS: { value: DoctorDetails["gender"]; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NONE", label: "Prefer not to say" },
];

const CLINIC_OPTIONS_PAGE = { page: 1, pageSize: 100 };

/** Shown when the picked clinic was removed before the form was sent (404). */
export const CLINIC_GONE_MESSAGE =
  "This clinic no longer exists. Choose another one.";

/**
 * The doctor registration form. It creates a PENDING doctor at the picked
 * clinic; an administrator verifies the details before the doctor can take
 * bookings. A 409 means the account is already linked to a doctor, so the flow
 * moves to the status step. A 404 means the clinic was removed meanwhile, so the
 * pick is cleared and the clinic list reloaded.
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
  const clinicService = useService("clinicService");
  const { refresh } = useAuth();
  const { notifySuccess, notifyInfo } = useNotify();
  const { submitting, fieldErrors, formError, run } = useFormSubmit();
  const specialtyListId = useId();
  const clinics = useSearchOptions(true, (search) =>
    clinicService.search({ search, ...CLINIC_OPTIONS_PAGE }),
  );
  const clinicOptions = clinics.items.map((c) => ({
    value: c.id,
    label: c.name,
  }));
  // Keep the picked clinic selectable when a new search leaves it out.
  if (
    values.clinicId &&
    !clinicOptions.some((option) => option.value === values.clinicId)
  )
    clinicOptions.unshift({ value: values.clinicId, label: values.clinicName });

  const set = <K extends keyof DoctorDetails>(
    field: K,
    value: DoctorDetails[K],
  ) => onChange({ ...values, [field]: value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input: ProviderRegistrationInput = {
      clinicId: values.clinicId,
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
        if (error instanceof NotFoundError) {
          onChange({ ...values, clinicId: "", clinicName: "" });
          void clinics.reload();
          throw new ValidationError({ clinicId: CLINIC_GONE_MESSAGE });
        }
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
        {clinics.error && (
          <ErrorCallout
            message={clinics.error}
            onRetry={() => void clinics.reload()}
          />
        )}
        <SearchSelectField
          label="Clinic"
          id="doctor-clinic"
          error={fieldErrors.clinicId}
          query={clinics.query}
          onQueryChange={clinics.setQuery}
          searchPlaceholder="Search clinics…"
          placeholder="Select the clinic you work at…"
          disabled={clinics.loading && clinicOptions.length === 0}
          value={values.clinicId}
          onValueChange={(id) =>
            onChange({
              ...values,
              clinicId: id,
              clinicName:
                clinicOptions.find((option) => option.value === id)?.label ??
                "",
            })
          }
          options={clinicOptions}
        />
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
          Your details are reviewed before you can take bookings at this clinic.
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
