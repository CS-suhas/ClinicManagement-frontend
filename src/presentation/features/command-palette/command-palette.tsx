"use client";

import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Dialog, Text } from "@radix-ui/themes";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useEffect, useState } from "react";
import { canAccessRoute, NAV_ITEMS } from "@/application/auth/permissions";
import type { CurrentUser } from "@/domain/auth";
import { PersonAvatar } from "@/presentation/components/ui/person-avatar";
import {
  type PaletteRecent,
  readRecents,
  rememberRecent,
} from "./palette-recents";
import { usePaletteSearch } from "./use-palette-search";

type Group = "Recent" | "Pages" | "Patients" | "Doctors" | "Clinics";

interface PaletteOption {
  key: string;
  group: Group;
  label: string;
  detail?: string;
  href: string;
}

const GROUP_ORDER: Group[] = [
  "Recent",
  "Pages",
  "Patients",
  "Doctors",
  "Clinics",
];
const LIST_ID = "command-palette-list";
const optionId = (index: number) => `command-palette-option-${index}`;

const matches = (query: string, field: string) =>
  field.toLowerCase().includes(query.toLowerCase());

/**
 * Ctrl+K (Cmd+K on Mac) opens a search over the pages the user may open, their
 * patients (where allowed), the doctor directory and clinics. Arrow keys move
 * through results, Enter opens one, Escape closes. Every result is a real
 * route, so the palette is only a faster way to reach a page.
 */
export function CommandPalette({
  open,
  onOpenChange,
  user,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: CurrentUser;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<PaletteRecent[]>([]);
  const { results, loading, searching } = usePaletteSearch(query, user, open);

  // Toggle on Ctrl+K / Cmd+K from anywhere in the app.
  useEffect(() => {
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (
        (event.ctrlKey || event.metaKey) &&
        !event.altKey &&
        !event.shiftKey &&
        event.key.toLowerCase() === "k"
      ) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  // Each opening starts fresh, with the latest recents.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    setRecents(readRecents());
  }, [open]);

  const trimmed = query.trim();
  const options: PaletteOption[] = [
    ...(trimmed === ""
      ? recents.map<PaletteOption>((item) => ({
          key: `recent:${item.href}`,
          group: "Recent",
          label: item.label,
          href: item.href,
        }))
      : []),
    ...NAV_ITEMS.filter(
      (item) =>
        canAccessRoute(user, item.href) &&
        (trimmed === "" || matches(trimmed, item.label)),
    ).map<PaletteOption>((item) => ({
      key: `page:${item.href}`,
      group: "Pages",
      label: item.label,
      href: item.href,
    })),
    ...results.patients.map<PaletteOption>((p) => ({
      key: `patient:${p.id}`,
      group: "Patients",
      label: p.name,
      detail: p.detail,
      href: `/patients/${p.id}`,
    })),
    ...results.doctors.map<PaletteOption>((d) => ({
      key: `doctor:${d.id}`,
      group: "Doctors",
      label: d.name,
      detail: d.detail,
      href: `/doctors/${d.id}`,
    })),
    ...results.clinics.map<PaletteOption>((c) => ({
      key: `clinic:${c.id}`,
      group: "Clinics",
      label: c.name,
      detail: c.detail,
      href: `/clinics/${c.id}`,
    })),
  ];

  const current = Math.min(active, Math.max(options.length - 1, 0));

  const choose = (option: PaletteOption | undefined) => {
    if (!option) return;
    rememberRecent({ href: option.href, label: option.label });
    onOpenChange(false);
    router.push(option.href);
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (options.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((current + step + options.length) % options.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(options[current]);
    }
  };

  const showNoMatches = searching && !loading && options.length === 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="560px"
        style={{ padding: 0, overflow: "hidden" }}
      >
        <Dialog.Title className="sr-only">Search</Dialog.Title>
        <Dialog.Description className="sr-only">
          Search pages, patients, doctors and clinics. Use the arrow keys and
          Enter to open a result.
        </Dialog.Description>
        <div
          className="flex items-center gap-2 border-b px-4"
          style={{ borderColor: "var(--mp-paper-deep)" }}
        >
          <MagnifyingGlassIcon
            aria-hidden="true"
            width={18}
            height={18}
            style={{ color: "var(--mp-muted)" }}
          />
          <input
            // biome-ignore lint/a11y/noAutofocus: the palette exists to type into.
            autoFocus
            type="search"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={
              options.length > 0 ? optionId(current) : undefined
            }
            aria-label="Search pages, patients, doctors and clinics"
            placeholder="Search pages, patients, doctors, clinics"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKeyDown}
            className="h-12 min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none"
            style={{ color: "var(--mp-ink)" }}
          />
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          <output aria-live="polite" className="block px-2 pb-1 text-xs">
            {loading ? (
              <span style={{ color: "var(--mp-muted)" }}>Searching...</span>
            ) : null}
          </output>
          {options.length > 0 ? (
            <div id={LIST_ID} role="listbox" className="m-0 list-none p-0">
              {GROUP_ORDER.map((group) => {
                const groupOptions = options.filter((o) => o.group === group);
                if (groupOptions.length === 0) return null;
                return (
                  <li key={group} role="presentation" className="mb-1">
                    <div
                      role="presentation"
                      className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-wide"
                      style={{ color: "var(--mp-muted)" }}
                    >
                      {group}
                    </div>
                    <ul className="m-0 list-none p-0">
                      {groupOptions.map((option) => {
                        const index = options.indexOf(option);
                        const selected = index === current;
                        return (
                          <li key={option.key} role="presentation">
                            <button
                              id={optionId(index)}
                              type="button"
                              role="option"
                              aria-selected={selected}
                              tabIndex={-1}
                              onMouseMove={() => setActive(index)}
                              onClick={() => choose(option)}
                              className="flex w-full cursor-pointer items-center gap-3 rounded-lg border-0 px-2 py-2 text-left"
                              style={{
                                background: selected
                                  ? "var(--mp-primary-tint)"
                                  : "transparent",
                                color: "var(--mp-ink)",
                              }}
                            >
                              {(option.group === "Patients" ||
                                option.group === "Doctors") && (
                                <PersonAvatar name={option.label} size={24} />
                              )}
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-medium">
                                  {option.label}
                                </span>
                                {option.detail && (
                                  <span
                                    className="block truncate text-xs"
                                    style={{ color: "var(--mp-muted)" }}
                                  >
                                    {option.detail}
                                  </span>
                                )}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </div>
          ) : (
            <Text
              as="p"
              size="2"
              className="px-2 py-4"
              style={{ color: "var(--mp-muted)" }}
            >
              {showNoMatches
                ? `No matches for "${trimmed}".`
                : "Type to search patients, doctors and clinics."}
            </Text>
          )}
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
}
