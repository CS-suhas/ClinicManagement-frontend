"use client";

import { CheckCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import {
  Button,
  Callout,
  Dialog,
  Flex,
  IconButton,
  Spinner,
  Text,
  TextArea,
} from "@radix-ui/themes";
import { type FormEvent, useEffect, useState } from "react";
import { FormField } from "@/components/form-field";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { formatDateTime } from "@/lib/format";
import type { Patient } from "../schemas";
import { patientFullName } from "../utils";
import { DoctorAvatar } from "./doctor-avatar";
import type { BookingChoice, BookingDetails } from "./use-doctor-booking";

export type BookingDetailsDialogProps = {
  choice: BookingChoice | null;
  patient: Patient | undefined;
  patientError: string | null;
  confirmed: boolean;
  submitting: boolean;
  formError: string | null;
  onBack: () => void;
  onSubmit: (details: BookingDetails) => void;
  onDone: () => void;
};

export function BookingDetailsDialog({
  choice,
  patient,
  patientError,
  confirmed,
  submitting,
  formError,
  onBack,
  onSubmit,
  onDone,
}: BookingDetailsDialogProps) {
  const [reasonForVisit, setReasonForVisit] = useState("");
  const open = choice !== null;

  useEffect(() => {
    if (!open) setReasonForVisit("");
  }, [open]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit({ reasonForVisit });
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
                <Dialog.Title mb="0">Confirm your appointment</Dialog.Title>
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
                mb="3"
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

              <Flex
                direction="column"
                gap="2"
                p="3"
                mb="4"
                className="rounded-xl bg-[var(--mp-surface)]"
                style={{
                  border: "1px solid var(--mp-paper-deep)",
                  color: "var(--mp-ink)",
                }}
              >
                <Text size="1" color="gray">
                  Booking for
                </Text>
                {patient ? (
                  <Flex align="center" gap="3">
                    <PersonAvatar name={patientFullName(patient)} size={40} />
                    <div className="min-w-0">
                      <Text as="p" weight="bold">
                        {patientFullName(patient)}
                      </Text>
                      <Text
                        as="p"
                        size="2"
                        style={{ color: "var(--mp-muted)" }}
                      >
                        {patient.email}
                      </Text>
                      <Text
                        as="p"
                        size="2"
                        style={{ color: "var(--mp-muted)" }}
                      >
                        {patient.phoneNumber}
                      </Text>
                    </div>
                  </Flex>
                ) : patientError ? (
                  <Callout.Root color="red" role="alert" size="1">
                    <Callout.Text>{patientError}</Callout.Text>
                  </Callout.Root>
                ) : (
                  <Flex align="center" gap="2">
                    <Spinner />
                    <Text size="2" color="gray">
                      Loading your details…
                    </Text>
                  </Flex>
                )}
              </Flex>

              <FormField
                label="Reason for visit (optional)"
                htmlFor="booking-reasonForVisit"
              >
                <TextArea
                  id="booking-reasonForVisit"
                  rows={3}
                  value={reasonForVisit}
                  onChange={(e) => setReasonForVisit(e.target.value)}
                />
              </FormField>

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
                <Button
                  type="submit"
                  color="teal"
                  loading={submitting}
                  disabled={!patient}
                >
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
