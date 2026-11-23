"use client";

import { CheckCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import {
  Button,
  Callout,
  Dialog,
  Flex,
  Grid,
  IconButton,
  Text,
  TextField,
} from "@radix-ui/themes";
import { type FormEvent, useEffect, useState } from "react";
import type { FieldErrors } from "@/domain/errors";
import { FormField } from "@/presentation/components/form-field";
import { formatDateTime } from "@/presentation/lib/format";
import { DoctorAvatar } from "./doctor-avatar";
import type { BookingChoice, BookingDetails } from "./use-doctor-booking";

const EMPTY: BookingDetails = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  email: "",
  phoneNumber: "",
  reasonForVisit: "",
};

export interface BookingDetailsDialogProps {
  choice: BookingChoice | null;
  confirmed: boolean;
  submitting: boolean;
  fieldErrors: FieldErrors;
  formError: string | null;
  onBack: () => void;
  onSubmit: (details: BookingDetails) => void;
  onDone: () => void;
}

export function BookingDetailsDialog({
  choice,
  confirmed,
  submitting,
  fieldErrors,
  formError,
  onBack,
  onSubmit,
  onDone,
}: BookingDetailsDialogProps) {
  const [values, setValues] = useState<BookingDetails>(EMPTY);
  const open = choice !== null;

  useEffect(() => {
    if (!open) setValues(EMPTY);
  }, [open]);

  const bind = (field: keyof BookingDetails) => ({
    id: `booking-${field}`,
    value: values[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((current) => ({ ...current, [field]: e.target.value })),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(values);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onDone()}>
      <Dialog.Content maxWidth="560px" aria-describedby={undefined}>
        {choice && confirmed ? (
          <Flex direction="column" align="center" gap="3" py="4">
            <CheckCircledIcon width={44} height={44} color="var(--teal-10)" />
            <Dialog.Title align="center" mb="0">
              Appointment booked
            </Dialog.Title>
            <Text align="center" size="3">
              {choice.doctor.name}
              <br />
              {formatDateTime(choice.dateTime)}
            </Text>
            <Text align="center" size="2" color="gray">
              {choice.doctor.clinicName}
              {choice.doctor.location ? `, ${choice.doctor.location}` : ""}
            </Text>
            <Button mt="3" color="teal" onClick={onDone}>
              Done
            </Button>
          </Flex>
        ) : (
          choice && (
            <form onSubmit={submit} noValidate>
              <Flex justify="between" align="center" mb="4">
                <Dialog.Title mb="0">Your details</Dialog.Title>
                <Dialog.Close>
                  <IconButton variant="ghost" color="gray" aria-label="Close">
                    <Cross2Icon />
                  </IconButton>
                </Dialog.Close>
              </Flex>

              <Flex
                align="center"
                gap="3"
                p="3"
                mb="4"
                className="rounded-xl"
                style={{
                  background: "var(--mp-paper)",
                  color: "var(--mp-ink)",
                }}
              >
                <DoctorAvatar name={choice.doctor.name} size={48} />
                <div>
                  <Text as="p" weight="bold">
                    {choice.doctor.name}
                  </Text>
                  <Text as="p" size="2">
                    {formatDateTime(choice.dateTime)}
                  </Text>
                </div>
              </Flex>

              <Flex direction="column" gap="3">
                <Grid columns={{ initial: "1", sm: "2" }} gap="3">
                  <FormField
                    label="First name"
                    htmlFor="booking-firstName"
                    error={fieldErrors.firstName}
                  >
                    <TextField.Root
                      {...bind("firstName")}
                      autoComplete="given-name"
                    />
                  </FormField>
                  <FormField
                    label="Last name"
                    htmlFor="booking-lastName"
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
                  htmlFor="booking-dateOfBirth"
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
                    label="Email"
                    htmlFor="booking-email"
                    error={fieldErrors.email}
                  >
                    <TextField.Root
                      {...bind("email")}
                      type="email"
                      autoComplete="email"
                    />
                  </FormField>
                  <FormField
                    label="Phone number"
                    htmlFor="booking-phoneNumber"
                    error={fieldErrors.phoneNumber}
                  >
                    <TextField.Root
                      {...bind("phoneNumber")}
                      type="tel"
                      autoComplete="tel"
                    />
                  </FormField>
                </Grid>
                <FormField
                  label="Reason for visit (optional)"
                  htmlFor="booking-reasonForVisit"
                >
                  <TextField.Root {...bind("reasonForVisit")} />
                </FormField>
              </Flex>

              {formError && (
                <Callout.Root color="red" role="alert" size="1" mt="4">
                  <Callout.Text>{formError}</Callout.Text>
                </Callout.Root>
              )}

              <Flex justify="end" gap="3" mt="5">
                <Button
                  type="button"
                  variant="outline"
                  color="gray"
                  highContrast
                  onClick={onBack}
                  disabled={submitting}
                >
                  Back
                </Button>
                <Button type="submit" color="teal" loading={submitting}>
                  Book appointment
                </Button>
              </Flex>
            </form>
          )
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
