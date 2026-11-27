"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button, Callout, Flex, Grid } from "@radix-ui/themes";
import { FormProvider, useForm } from "react-hook-form";
import { useNotify } from "@/components/notifications";
import { useAuth } from "@/features/auth/auth-provider";
import { useCreatePatientProfile } from "../api";
import { type PatientForm, patientForm } from "../schemas";
import { OnboardingInput, setSubmitError } from "./onboarding-form";

export function PatientStep({
  values,
  onDraftChange,
  onBack,
  onDone,
}: {
  values: PatientForm;
  onDraftChange: (values: PatientForm) => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const { refresh } = useAuth();
  const { notifySuccess } = useNotify();
  const createProfile = useCreatePatientProfile();
  const form = useForm<PatientForm>({
    resolver: zodResolver(patientForm),
    defaultValues: values,
  });
  const { isSubmitting, errors } = form.formState;

  const submit = form.handleSubmit(async (input) => {
    form.clearErrors("root");
    try {
      await createProfile.mutateAsync(input);
      await refresh();
    } catch (e) {
      setSubmitError(form, e);
      return;
    }
    notifySuccess("Profile created");
    onDone();
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate>
        <Flex direction="column" gap="3">
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <OnboardingInput
              name="firstName"
              label="First name"
              id="onboarding-firstName"
              autoComplete="given-name"
            />
            <OnboardingInput
              name="lastName"
              label="Last name"
              id="onboarding-lastName"
              autoComplete="family-name"
            />
          </Grid>
          <OnboardingInput
            name="dateOfBirth"
            label="Date of birth"
            id="onboarding-dateOfBirth"
            type="date"
            autoComplete="bday"
          />
          <Grid columns={{ initial: "1", sm: "2" }} gap="3">
            <OnboardingInput
              name="phoneNumber"
              label="Phone number"
              id="onboarding-phoneNumber"
              type="tel"
              autoComplete="tel"
            />
            <OnboardingInput
              name="email"
              label="Email"
              id="onboarding-email"
              type="email"
              autoComplete="email"
            />
          </Grid>
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
            Create my profile
          </Button>
        </Flex>
      </form>
    </FormProvider>
  );
}
