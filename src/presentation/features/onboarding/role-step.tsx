"use client";

import { IdCardIcon, MixIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import { type KeyboardEvent, type ReactNode, useRef, useState } from "react";
import { IconCircle } from "@/presentation/components/ui/icon-circle";
import type { OnboardingChoice } from "./onboarding-steps";

const OPTIONS: {
  value: OnboardingChoice;
  title: string;
  body: string;
  icon: ReactNode;
}[] = [
  {
    value: "patient",
    title: "I am a patient",
    body: "Book and manage visits",
    icon: <IdCardIcon width={20} height={20} />,
  },
  {
    value: "doctor",
    title: "I am a doctor",
    body: "Manage your schedule and patients",
    icon: <MixIcon width={20} height={20} />,
  },
];

/**
 * Choose patient or doctor. The choice can be made once here; there is no
 * promise that it can be changed later.
 */
export function RoleStep({
  onContinue,
}: {
  onContinue: (choice: OnboardingChoice) => void;
}) {
  const [selected, setSelected] = useState<OnboardingChoice | null>(null);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys move the selection through the radio group, as the pattern expects.
  const onKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const delta =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (delta === 0) return;
    event.preventDefault();
    const next = (index + delta + OPTIONS.length) % OPTIONS.length;
    setSelected(OPTIONS[next].value);
    buttons.current[next]?.focus();
  };

  return (
    <Flex direction="column" gap="4">
      <div
        role="radiogroup"
        aria-label="How will you use MediPulse Life?"
        className="grid gap-3 sm:grid-cols-2"
      >
        {OPTIONS.map((option, index) => {
          const checked = selected === option.value;
          return (
            // biome-ignore lint/a11y/useSemanticElements: styled card radios; arrow keys are handled below.
            <button
              key={option.value}
              ref={(node) => {
                buttons.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked || (selected === null && index === 0) ? 0 : -1}
              onClick={() => setSelected(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className="flex cursor-pointer flex-col items-start gap-3 rounded-2xl bg-[var(--mp-surface)] p-4 text-left transition-shadow hover:shadow-md"
              style={{
                border: checked
                  ? "2px solid var(--mp-primary)"
                  : "1px solid var(--mp-paper-deep)",
              }}
            >
              <IconCircle size={40}>{option.icon}</IconCircle>
              <span
                className="text-base font-semibold"
                style={{ color: "var(--mp-ink)" }}
              >
                {option.title}
              </span>
              <span className="text-sm" style={{ color: "var(--mp-muted)" }}>
                {option.body}
              </span>
            </button>
          );
        })}
      </div>
      <Flex justify="end">
        <Button
          type="button"
          color="teal"
          disabled={selected === null}
          onClick={() => selected && onContinue(selected)}
        >
          Continue
        </Button>
      </Flex>
      {selected === null && (
        <Text size="1" style={{ color: "var(--mp-muted)" }}>
          Choose one to continue.
        </Text>
      )}
    </Flex>
  );
}
