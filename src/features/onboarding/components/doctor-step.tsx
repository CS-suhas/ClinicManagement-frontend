"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Callout, Flex, Grid, Text } from "@radix-ui/themes";
import { useEffect, useId } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { ErrorCallout } from "@/components/error-callout";
import { SearchSelectInput, setFormErrors, TextInput } from "@/components/form";
import { FormField } from "@/components/form-field";
import { notify } from "@/components/notifications";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { useAuth } from "@/features/auth/auth-provider";
import { useClinicOptions } from "@/features/clinics/api";
import { usePagedSearch } from "@/hooks/use-paged-search";
import { ApiError } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { useRegisterProvider } from "../api";
import { type DoctorForm, doctorForm } from "../schemas";
import { COMMON_SPECIALTIES } from "../steps";

const GENDER_OPTIONS: { value: DoctorForm["gender"]; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "NONE", label: "Prefer not to say" },
];

export const CLINIC_GONE_MESSAGE =
  "This clinic no longer exists. Choose another one.";

export function DoctorStep({
  values,
  onDraftChange,
  onBack,
}: {
  values: DoctorForm;
  onDraftChange: (values: DoctorForm) => void;
  onBack: () => void;
}) {
  const { refresh } = useAuth();
  const registerProvider = useRegisterProvider();
  const specialtyListId = useId();
  const { query, search, setQueryNow } = usePagedSearch();
  const clinics = useClinicOptions(search);
  const form = useForm<DoctorForm>({
    resolver: zodResolver(doctorForm),
    defaultValues: values,
  });
  const { isSubmitting, errors } = form.formState;
  const selectedClinicId = form.watch("clinicId");
  const selectedClinicName = form.watch("clinicName");

  const fetchedOptions = (clinics.data?.items ?? []).map((clinic) => ({
    value: clinic.id,
    label: clinic.name,
  }));
  const clinicOptions =
    selectedClinicId &&
    !fetchedOptions.some((option) => option.value === selectedClinicId)
      ? [
          { value: selectedClinicId, label: selectedClinicName },
          ...fetchedOptions,
        ]
      : fetchedOptions;

  useEffect(() => {
    const label = clinicOptions.find(
      (option) => option.value === selectedClinicId,
    )?.label;
    if (label !== undefined && label !== selectedClinicName)
      form.setValue("clinicName", label);
  }, [clinicOptions, selectedClinicId, selectedClinicName, form]);

  const submit = form.handleSubmit(async (input) => {
    form.clearErrors("root");
    let registered = false;
    try {
      await registerProvider({
        clinicId: input.clinicId,
        firstName: input.firstName,
        lastName: input.lastName,
        specialty: input.specialty,
        fee: input.fee === "" ? null : Number(input.fee),
        gender: input.gender === "NONE" ? null : input.gender,
      });
      registered = true;
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        form.setValue("clinicId", "");
        form.setValue("clinicName", "");
        void clinics.refetch();
        form.setError("clinicId", { message: CLINIC_GONE_MESSAGE });
        return;
      }
      if (!(e instanceof ApiError && e.status === 409)) {
        setFormErrors(form, e);
        return;
      }
      notify.info("You already have a doctor profile.");
    }
    await refresh();
    if (registered)
      notify.success("Application submitted. An administrator will review it.");
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate>
        <Flex direction="column" gap="3">
          {clinics.isError && (
            <ErrorCallout
              message={getErrorMessage(clinics.error)}
              onRetry={() => void clinics.refetch()}
            />
          )}
          <SearchSelectInput
            name="clinicId"
            label="Clinic"
            options={clinicOptions}
            query={query}
            onQueryChange={setQueryNow}
            searchPlaceholder="Search clinics…"
            placeholder="Select the clinic you work at…"
            disabled={clinics.isLoading && clinicOptions.length === 0}
          />
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <TextInput
              name="firstName"
              label="First name"
              id="doctor-firstName"
              autoComplete="given-name"
            />
            <TextInput
              name="lastName"
              label="Last name"
              id="doctor-lastName"
              autoComplete="family-name"
            />
          </Grid>

          <TextInput
            name="specialty"
            label="Specialty"
            id="doctor-specialty"
            list={specialtyListId}
            placeholder="Choose or type a specialty"
          />
          <datalist id={specialtyListId}>
            {COMMON_SPECIALTIES.map((specialty) => (
              <option key={specialty} value={specialty} />
            ))}
          </datalist>

          <Grid columns={{ initial: "1", sm: "2" }} gap="3" align="start">
            <TextInput
              name="fee"
              label="Consultation fee (optional)"
              id="doctor-fee"
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              slot="LKR"
            />
            <FormField label="Gender (optional)" error={errors.gender?.message}>
              <Controller
                name="gender"
                render={({ field }) => (
                  <SegmentedToggle
                    ariaLabel="Gender"
                    value={field.value}
                    onChange={field.onChange}
                    options={GENDER_OPTIONS}
                  />
                )}
              />
            </FormField>
          </Grid>
          <Text size="1" style={{ color: "var(--mp-muted)" }}>
            Your details are reviewed before you can take bookings at this
            clinic.
          </Text>
        </Flex>

        {errors.root?.message && (
          <Callout.Root color="red" role="alert" size="1" mt="4">
            <Callout.Text>{errors.root.message}</Callout.Text>
          </Callout.Root>
        )}

        <Flex justify="between" gap="3" mt="5">
          <Button
            type="button"
            variant="soft"
            color="gray"
            disabled={isSubmitting}
            onClick={() => {
              onDraftChange(form.getValues());
              onBack();
            }}
          >
            Back
          </Button>
          <Button type="submit" color="teal" loading={isSubmitting}>
            Submit for review
          </Button>
        </Flex>
      </form>
    </FormProvider>
  );
}
