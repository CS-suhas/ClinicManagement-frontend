import {
  BackpackIcon,
  MobileIcon,
  SewingPinIcon,
  StarFilledIcon,
} from "@radix-ui/react-icons";
import { Badge, Button, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import type { ReactNode } from "react";
import { IconCircle } from "@/presentation/components/ui/icon-circle";
import { Surface } from "@/presentation/components/ui/surface";
import { formatFee } from "@/presentation/lib/format";
import { DoctorAvatar } from "./doctor-avatar";
import type { DoctorProfile } from "./doctor-profile";

function Fact({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <Flex align="center" gap="2">
      <IconCircle>{icon}</IconCircle>
      <Text size="2">{children}</Text>
    </Flex>
  );
}

export function DoctorCard({
  doctor,
  onBook,
}: {
  doctor: DoctorProfile;
  onBook: (doctor: DoctorProfile) => void;
}) {
  const { rating, experienceYears, consultationFee, location, phone } = doctor;

  return (
    <Surface
      as="article"
      className="flex h-full flex-col"
      style={{ color: "var(--mp-ink)" }}
    >
      <div
        className="flex flex-1 flex-col gap-4 rounded-xl p-4"
        style={{ background: "var(--mp-paper)" }}
      >
        <div className="flex items-center gap-4">
          <DoctorAvatar name={doctor.name} size={64} />
          <div className="min-w-0">
            <Heading as="h3" size="4">
              <Link
                href={`/doctors/${doctor.id}`}
                className="no-underline hover:underline"
                style={{ color: "var(--mp-ink)" }}
              >
                {doctor.name}
              </Link>
            </Heading>
            {doctor.qualifications && (
              <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
                {doctor.qualifications}
              </Text>
            )}
            {consultationFee != null && (
              <Text as="p" size="2" weight="medium">
                {formatFee(consultationFee)} consultation fee at clinic
              </Text>
            )}
            {doctor.clinicName && (
              <Text as="p" size="2" style={{ color: "var(--mp-muted)" }}>
                {doctor.clinicName}
              </Text>
            )}
          </div>
        </div>
        <div className="mt-auto">
          <Text as="p" size="2" weight="bold" mb="2">
            Specialties
          </Text>
          <Flex wrap="wrap" gap="2">
            {doctor.specialties.map((specialty) => (
              <Badge
                key={specialty}
                size="2"
                radius="medium"
                color="teal"
                variant="soft"
              >
                {specialty}
              </Badge>
            ))}
          </Flex>
        </div>
      </div>

      <Flex direction="column" gap="4" pt="4" px="1">
        <Flex align="center" wrap="wrap" gap="4">
          {rating !== undefined && (
            <Fact icon={<StarFilledIcon />}>{rating.toFixed(1)}/5</Fact>
          )}
          {experienceYears !== undefined && (
            <Fact icon={<BackpackIcon />}>{experienceYears} years</Fact>
          )}
          {location && <Fact icon={<SewingPinIcon />}>{location}</Fact>}
        </Flex>
        <Flex align="center" gap="3">
          {phone && (
            <Button
              asChild
              variant="outline"
              color="gray"
              highContrast
              className="min-w-0 flex-1"
            >
              <a href={`tel:${phone}`}>
                <MobileIcon />
                {phone}
              </a>
            </Button>
          )}
          <button
            type="button"
            onClick={() => onBook(doctor)}
            className="flex-1 cursor-pointer rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--mp-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: "var(--mp-primary)",
              outlineColor: "var(--mp-ink)",
            }}
          >
            Book appointment
          </button>
        </Flex>
      </Flex>
    </Surface>
  );
}
