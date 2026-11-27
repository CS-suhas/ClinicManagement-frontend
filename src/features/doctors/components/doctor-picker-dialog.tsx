"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Dialog, Flex, IconButton, Spinner, Text } from "@radix-ui/themes";
import { ErrorCallout } from "@/components/error-callout";
import { SearchField } from "@/components/search-field";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { useService } from "@/di/container-provider";
import { providerFullName } from "@/domain/entities";
import { useSearchOptions } from "@/hooks/use-search-options";
import { formatFee } from "@/lib/format";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

export type DoctorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the chosen doctor; the caller moves on to the slot picker. */
  onPick: (doctor: DoctorProfile) => void;
};

/**
 * Step 1 of patient booking: a searchable list of bookable doctors over the
 * public directory. Each row shows the doctor, specialty, clinic and LKR fee.
 */
export function DoctorPickerDialog({
  open,
  onOpenChange,
  onPick,
}: DoctorPickerDialogProps) {
  const providerService = useService("providerService");
  const { items, query, setQuery, loading, error, reload } = useSearchOptions(
    open,
    (search) => providerService.directory({ search, page: 1, pageSize: 50 }),
  );

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="560px" aria-describedby={undefined}>
        <Flex justify="between" align="center" mb="2">
          <Dialog.Title mb="0">Choose a doctor</Dialog.Title>
          <Dialog.Close>
            <IconButton variant="ghost" color="gray" aria-label="Close">
              <Cross2Icon />
            </IconButton>
          </Dialog.Close>
        </Flex>
        <Text as="p" size="2" mb="4" style={{ color: "var(--mp-muted)" }}>
          Search by name, specialty or clinic.
        </Text>

        <div className="mb-3">
          <SearchField
            size="2"
            fullWidth
            value={query}
            onChange={setQuery}
            placeholder="Search doctors"
          />
        </div>

        {error && <ErrorCallout message={error} onRetry={reload} />}
        {!error && loading && items.length === 0 && (
          <Flex justify="center" py="6">
            <Spinner size="3" />
          </Flex>
        )}
        {!error && !loading && items.length === 0 && (
          <Flex justify="center" py="6">
            <Text size="2" color="gray">
              No doctors match that search.
            </Text>
          </Flex>
        )}
        {items.length > 0 && (
          <ul className="m-0 flex max-h-[60vh] list-none flex-col gap-2 overflow-y-auto p-0">
            {items.map((entry) => {
              const doctor = toDoctorProfile(entry, undefined);
              return (
                <li key={doctor.id}>
                  <button
                    type="button"
                    onClick={() => onPick(doctor)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-[var(--mp-surface)] p-3 text-left transition-colors hover:bg-[var(--mp-primary-tint)] focus-visible:outline-2 focus-visible:outline-offset-2"
                    style={{
                      border: "1px solid var(--mp-paper-deep)",
                      color: "var(--mp-ink)",
                      outlineColor: "var(--mp-ink)",
                    }}
                    aria-label={`${doctor.name}, ${doctor.specialties[0] ?? ""}, ${formatFee(doctor.consultationFee ?? null)}`}
                  >
                    <PersonAvatar name={providerFullName(entry)} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {doctor.name}
                      </span>
                      <span
                        className="block truncate text-sm"
                        style={{ color: "var(--mp-muted)" }}
                      >
                        {doctor.specialties.join(", ")}
                        {doctor.clinicName ? ` · ${doctor.clinicName}` : ""}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatFee(doctor.consultationFee ?? null)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Dialog.Content>
    </Dialog.Root>
  );
}
