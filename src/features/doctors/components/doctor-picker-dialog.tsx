"use client";

import { Cross2Icon } from "@radix-ui/react-icons";
import { Dialog, Flex, IconButton, Spinner, Text } from "@radix-ui/themes";
import { ErrorCallout } from "@/components/error-callout";
import { SearchField } from "@/components/search-field";
import { PersonAvatar } from "@/components/ui/person-avatar";
import { providerFullName } from "@/features/providers/utils";
import { usePagedSearch } from "@/hooks/use-paged-search";
import { $api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import { formatFee } from "@/lib/format";
import { type DoctorProfile, toDoctorProfile } from "./doctor-profile";

export type DoctorPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (doctor: DoctorProfile) => void;
};

export function DoctorPickerDialog({
  open,
  onOpenChange,
  onPick,
}: DoctorPickerDialogProps) {
  const { query, search, setQueryNow } = usePagedSearch();
  const directory = $api.useQuery(
    "get",
    "/api/providers/directory",
    {
      params: { query: { Search: search || undefined, Page: 1, PageSize: 50 } },
    },
    { enabled: open },
  );
  const items = directory.data?.items ?? [];
  const loading = directory.isLoading;
  const error = directory.error ? getErrorMessage(directory.error) : null;
  const reload = () => void directory.refetch();

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
            onChange={setQueryNow}
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
