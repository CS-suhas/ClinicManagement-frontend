import { Flex, Heading, Text } from "@radix-ui/themes";
import { DoctorCard } from "./doctor-card";
import type { DoctorProfile } from "./doctor-profile";

export function DoctorList({
  doctors,
  onBook,
}: {
  doctors: DoctorProfile[];
  onBook: (doctor: DoctorProfile) => void;
}) {
  return (
    <section aria-labelledby="doctor-count">
      <Heading id="doctor-count" as="h2" size="4" mb="4">
        {doctors.length === 1
          ? "1 doctor available"
          : `${doctors.length} doctors available`}
      </Heading>
      {doctors.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          gap="1"
          py="9"
          className="rounded-2xl bg-white"
        >
          <Text weight="medium">No doctors match these filters</Text>
          <Text size="2" color="gray">
            Clear a filter or widen the fee range to see more doctors.
          </Text>
        </Flex>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} onBook={onBook} />
          ))}
        </div>
      )}
    </section>
  );
}
