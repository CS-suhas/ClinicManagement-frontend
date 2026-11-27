import {
  Button,
  Flex,
  Heading,
  RadioGroup,
  Select,
  Slider,
  Text,
} from "@radix-ui/themes";
import type { ReactNode } from "react";
import type { Clinic } from "@/domain/entities";
import { formatFeeShort } from "@/lib/format";

/** LKR consultation fees. */
export const FEE_RANGE = { min: 0, max: 10000, step: 250 };

export type DoctorFilterValues = {
  gender: "all" | "male" | "female" | "other";
  /** "" means any specialty. */
  specialty: string;
  fee: [number, number];
};

export const DEFAULT_FILTERS: DoctorFilterValues = {
  gender: "all",
  specialty: "",
  fee: [FEE_RANGE.min, FEE_RANGE.max],
};

/** Select value for "nothing chosen"; Radix Select items cannot be empty. */
const ALL = "__all__";

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Flex asChild direction="column" gap="2">
      <fieldset className="m-0 border-0 p-0">
        <legend className="float-left mb-2 w-full p-0 text-sm font-bold">
          {label}
        </legend>
        {children}
      </fieldset>
    </Flex>
  );
}

/**
 * The clinic is kept apart from the other values: it lives in the URL and is
 * applied by the directory request, not on the client.
 */
export function DoctorFilters({
  values,
  onChange,
  clinics,
  clinicId,
  onClinicChange,
  specialties,
}: {
  values: DoctorFilterValues;
  onChange: (values: DoctorFilterValues) => void;
  clinics: Clinic[];
  /** The specialties to offer, e.g. those of the loaded doctors. */
  specialties: string[];
  clinicId: string;
  onClinicChange: (clinicId: string) => void;
}) {
  const set = <K extends keyof DoctorFilterValues>(
    key: K,
    value: DoctorFilterValues[K],
  ) => onChange({ ...values, [key]: value });

  // Keep the chosen specialty listed even when the loaded doctors (e.g. after
  // a clinic change) no longer include it, so the select never shows blank.
  const specialtyOptions =
    values.specialty && !specialties.includes(values.specialty)
      ? [...specialties, values.specialty].sort((a, b) => a.localeCompare(b))
      : specialties;

  return (
    <aside aria-label="Filters" style={{ color: "var(--mp-ink)" }}>
      <Flex align="center" justify="between" mb="5">
        <Heading as="h2" size="4">
          Filters
        </Heading>
        <Button
          variant="ghost"
          color="gray"
          highContrast
          onClick={() => {
            onChange(DEFAULT_FILTERS);
            if (clinicId) onClinicChange("");
          }}
        >
          Clear all
        </Button>
      </Flex>

      <Flex direction="column" gap="6">
        <Group label="Clinic">
          <Select.Root
            value={clinicId || ALL}
            onValueChange={(v) => onClinicChange(v === ALL ? "" : v)}
          >
            <Select.Trigger aria-label="Clinic" />
            <Select.Content>
              <Select.Item value={ALL}>All clinics</Select.Item>
              {clinics.map((c) => (
                <Select.Item key={c.id} value={c.id}>
                  {c.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Group>

        <Group label="Specialty">
          <Select.Root
            value={values.specialty || ALL}
            onValueChange={(v) => set("specialty", v === ALL ? "" : v)}
          >
            <Select.Trigger aria-label="Specialty" />
            <Select.Content>
              <Select.Item value={ALL}>All specialties</Select.Item>
              {specialtyOptions.map((s) => (
                <Select.Item key={s} value={s}>
                  {s}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Group>

        <Group label="Gender">
          <RadioGroup.Root
            value={values.gender}
            onValueChange={(v) =>
              set("gender", v as DoctorFilterValues["gender"])
            }
            color="teal"
          >
            <RadioGroup.Item value="all">All</RadioGroup.Item>
            <RadioGroup.Item value="male">Male doctor</RadioGroup.Item>
            <RadioGroup.Item value="female">Female doctor</RadioGroup.Item>
            <RadioGroup.Item value="other">Other</RadioGroup.Item>
          </RadioGroup.Root>
        </Group>

        <Group label="Visiting fees">
          <Flex justify="between" mb="1">
            <Text size="2">{formatFeeShort(values.fee[0])}</Text>
            <Text size="2">{formatFeeShort(values.fee[1])}</Text>
          </Flex>
          <Slider
            min={FEE_RANGE.min}
            max={FEE_RANGE.max}
            step={FEE_RANGE.step}
            minStepsBetweenThumbs={1}
            value={values.fee}
            onValueChange={(v) => set("fee", [v[0], v[1]])}
            color="teal"
            aria-label="Visiting fees"
          />
        </Group>
      </Flex>
    </aside>
  );
}
