"use client";

import { Cross2Icon, HomeIcon } from "@radix-ui/react-icons";
import { Button, Dialog, Flex, IconButton, Text } from "@radix-ui/themes";
import { useEffect, useMemo, useState } from "react";
import type { AppointmentSettings } from "@/domain/entities";
import { DoctorAvatar } from "./doctor-avatar";
import type { DoctorProfile } from "./doctor-profile";
import { SlotPicker } from "./slot-picker";
import { buildSlots, upcomingDays } from "./time-slots";

const DAYS_AHEAD = 14;

export interface BookingDialogProps {
  doctor: DoctorProfile | null;
  settings: AppointmentSettings | undefined;
  /** The viewed day, `YYYY-MM-DD`. Owned by the booking hook. */
  dateKey: string;
  onDateChange: (dateKey: string) => void;
  /** The doctor's busy start times on the viewed day, to grey out taken slots. */
  bookedStarts: string[];
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen `YYYY-MM-DDTHH:mm` once the visitor continues. */
  onContinue: (doctor: DoctorProfile, dateTime: string) => void;
}

export function BookingDialog({
  doctor,
  settings,
  dateKey,
  onDateChange,
  bookedStarts,
  onOpenChange,
  onContinue,
}: BookingDialogProps) {
  const days = useMemo(() => upcomingDays(DAYS_AHEAD), []);
  const [slot, setSlot] = useState("");
  const doctorId = doctor?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: start fresh for each doctor.
  useEffect(() => {
    setSlot("");
  }, [doctorId]);

  const slots = useMemo(
    () => (settings ? buildSlots(dateKey, settings, bookedStarts) : []),
    [dateKey, settings, bookedStarts],
  );

  return (
    <Dialog.Root open={doctor !== null} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="640px" aria-describedby={undefined}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title mb="0">Pick a time slot</Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray" aria-label="Close">
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>

        {doctor && (
          <Flex
            align="center"
            gap="4"
            p="4"
            mb="4"
            className="rounded-xl"
            style={{ background: "var(--mp-paper)", color: "var(--mp-ink)" }}
          >
            <DoctorAvatar name={doctor.name} size={64} />
            <div>
              <Text as="p" size="4" weight="bold">
                {doctor.name}
              </Text>
              {doctor.clinicName && (
                <Flex align="center" gap="2">
                  <HomeIcon />
                  <Text size="3">{doctor.clinicName}</Text>
                </Flex>
              )}
              {doctor.location && (
                <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
                  {doctor.location}
                </Text>
              )}
            </div>
          </Flex>
        )}

        {settings ? (
          <SlotPicker
            days={days}
            dateKey={dateKey}
            onDateChange={(key) => {
              onDateChange(key);
              setSlot("");
            }}
            slots={slots}
            selected={slot}
            onSelect={setSlot}
          />
        ) : (
          <Text as="p" size="2" color="gray">
            Loading available times…
          </Text>
        )}

        <Flex justify="end" gap="3" mt="4">
          <Dialog.Close>
            <Button variant="outline" color="gray" highContrast>
              Cancel
            </Button>
          </Dialog.Close>
          <Button
            color="teal"
            disabled={!slot || !doctor}
            onClick={() => doctor && onContinue(doctor, slot)}
          >
            Continue
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
}
