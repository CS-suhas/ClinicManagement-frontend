import {
  Button,
  Checkbox,
  Flex,
  Heading,
  RadioGroup,
  Select,
  Slider,
  Text,
} from "@radix-ui/themes";
import type { ReactNode } from "react";

export const FEE_RANGE = { min: 0, max: 500, step: 10 };

export const CONSULT_TYPES = [
  { value: "televisit", label: "Televisit" },
  { value: "on-site", label: "On-site" },
  { value: "home-visit", label: "Home visit" },
] as const;

export interface DoctorFilterValues {
  gender: "all" | "male" | "female";
  minExperience: number;
  fee: [number, number];
  availability: "any" | "morning" | "afternoon" | "evening";
  consultTypes: string[];
}

export const DEFAULT_FILTERS: DoctorFilterValues = {
  gender: "all",
  minExperience: 0,
  fee: [FEE_RANGE.min, FEE_RANGE.max],
  availability: "any",
  consultTypes: [],
};

const EXPERIENCE_OPTIONS = [
  { value: "0", label: "Any experience" },
  { value: "2", label: "2+ years" },
  { value: "5", label: "5+ years" },
  { value: "10", label: "10+ years" },
];

const AVAILABILITY_OPTIONS = [
  { value: "any", label: "Any time" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

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

export function DoctorFilters({
  values,
  onChange,
}: {
  values: DoctorFilterValues;
  onChange: (values: DoctorFilterValues) => void;
}) {
  const set = <K extends keyof DoctorFilterValues>(
    key: K,
    value: DoctorFilterValues[K],
  ) => onChange({ ...values, [key]: value });

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
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          Clear all
        </Button>
      </Flex>

      <Flex direction="column" gap="6">
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
          </RadioGroup.Root>
        </Group>

        <Group label="Experience">
          <Select.Root
            value={String(values.minExperience)}
            onValueChange={(v) => set("minExperience", Number(v))}
          >
            <Select.Trigger aria-label="Experience" />
            <Select.Content>
              {EXPERIENCE_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Group>

        <Group label="Visiting fees">
          <Flex justify="between" mb="1">
            <Text size="2">${values.fee[0]}</Text>
            <Text size="2">${values.fee[1]}</Text>
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

        <Group label="Availability">
          <Select.Root
            value={values.availability}
            onValueChange={(v) =>
              set("availability", v as DoctorFilterValues["availability"])
            }
          >
            <Select.Trigger aria-label="Availability" />
            <Select.Content>
              {AVAILABILITY_OPTIONS.map((o) => (
                <Select.Item key={o.value} value={o.value}>
                  {o.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
        </Group>

        <Group label="Consult type">
          {CONSULT_TYPES.map((type) => (
            <Text as="label" size="2" key={type.value}>
              <Flex align="center" gap="2">
                <Checkbox
                  color="teal"
                  checked={values.consultTypes.includes(type.value)}
                  onCheckedChange={(checked) =>
                    set(
                      "consultTypes",
                      checked
                        ? [...values.consultTypes, type.value]
                        : values.consultTypes.filter((t) => t !== type.value),
                    )
                  }
                />
                {type.label}
              </Flex>
            </Text>
          ))}
        </Group>
      </Flex>
    </aside>
  );
}
