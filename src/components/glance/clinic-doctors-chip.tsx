"use client";

import { Text } from "@radix-ui/themes";
import Link from "next/link";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { PersonAvatar } from "@/components/ui/person-avatar";
import type { ClinicDoctorPreview } from "@/domain/repositories/glance";
import {
  GlanceAction,
  GlanceFooter,
  GlanceHeader,
  GlancePopover,
  GlanceSection,
} from "./glance-popover";

export type ClinicDoctorsChipProps = {
  clinic: { id: string; name: string };
  preview: ClinicDoctorPreview;
  /** Avatars in the trigger before the count. */
  max?: number;
};

/**
 * A clinic's doctors as overlapping avatars and a count. The card lists the
 * doctors (as many as the preview holds) with their specialties, each linking
 * to the doctor's page, plus a link to the full list.
 */
export function ClinicDoctorsChip({
  clinic,
  preview,
  max = 4,
}: ClinicDoctorsChipProps) {
  const { count, doctors } = preview;
  const noun = `doctor${count === 1 ? "" : "s"}`;
  return (
    <GlancePopover
      label={`${count} ${noun} at ${clinic.name}, show details`}
      width={300}
      trigger={
        <span className="inline-flex items-center gap-2">
          <AvatarStack
            max={max}
            people={doctors.slice(0, max).map((d) => ({
              name: `${d.firstName} ${d.lastName}`,
            }))}
          />
          <Text size="2" style={{ color: "var(--mp-ink)" }}>
            {count}
          </Text>
        </span>
      }
    >
      {() => (
        <>
          <GlanceHeader
            avatar={
              <AvatarStack
                max={3}
                size={28}
                people={doctors.map((d) => ({
                  name: `${d.firstName} ${d.lastName}`,
                }))}
              />
            }
            title={`${count} ${noun}`}
            subtitle={clinic.name}
          />
          <GlanceSection>
            <ul className="flex flex-col gap-0.5">
              {doctors.map((d) => {
                const name = `${d.firstName} ${d.lastName}`;
                return (
                  <li key={d.id}>
                    <Link
                      href={`/doctors/${d.id}`}
                      className="-mx-2 flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--mp-paper)] focus-visible:outline-2 focus-visible:outline-[var(--mp-primary)]"
                    >
                      <PersonAvatar name={name} size={24} />
                      <span className="min-w-0 flex-1">
                        <Text
                          as="p"
                          size="2"
                          className="truncate"
                          style={{ color: "var(--mp-ink)" }}
                        >
                          Dr. {name}
                        </Text>
                        {d.specialty && (
                          <Text
                            as="p"
                            size="1"
                            className="truncate"
                            style={{ color: "var(--mp-muted)" }}
                          >
                            {d.specialty}
                          </Text>
                        )}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {count > doctors.length && (
              <Text
                as="p"
                size="1"
                className="mt-1"
                style={{ color: "var(--mp-muted)" }}
              >
                and {count - doctors.length} more
              </Text>
            )}
          </GlanceSection>
          <GlanceFooter>
            <GlanceAction href={`/doctors?clinicId=${clinic.id}`} primary>
              {count > doctors.length ? `See all ${count}` : "Find a doctor"}
            </GlanceAction>
            <GlanceAction href={`/clinics/${clinic.id}`}>
              View clinic
            </GlanceAction>
          </GlanceFooter>
        </>
      )}
    </GlancePopover>
  );
}
