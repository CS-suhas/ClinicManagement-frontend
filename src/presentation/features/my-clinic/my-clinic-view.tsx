"use client";

import { Button, Flex, Heading, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useEffect } from "react";
import type { ClinicJoinRequest } from "@/domain/entities";
import { useAuth } from "@/presentation/auth/auth-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { type Column, DataTable } from "@/presentation/components/data-table";
import {
  ClinicChip,
  StatusChip,
  StatusPill,
} from "@/presentation/components/glance";
import { SearchField } from "@/presentation/components/search-field";
import { EmptyState } from "@/presentation/components/ui/empty-state";
import { PageHeader } from "@/presentation/components/ui/page-header";
import { RelativeTime } from "@/presentation/components/ui/relative-time";
import { Surface } from "@/presentation/components/ui/surface";
import { useMyClinic } from "./use-my-clinic";

/**
 * A doctor's own clinic and its summary. Below it, moving to another clinic:
 * the request status, a searchable list of other clinics to ask to move to,
 * and the history of past requests.
 */
export function MyClinicView() {
  const { user, refresh } = useAuth();
  const providerId = user?.provider?.id ?? null;
  const state = useMyClinic(providerId);

  // The session may be stale after an admin approves a move; re-read it once.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <>
      <PageHeader
        title="My clinic"
        subtitle="The clinic you practise at. To move to another one, send that clinic a request; its administrator confirms it."
      />
      <AsyncContent
        loading={state.provider.loading}
        error={state.provider.error}
        isEmpty={false}
        onRetry={() => void state.provider.reload()}
      >
        {state.clinicId && (
          <Flex direction="column" gap="5">
            <CurrentClinic
              clinicId={state.clinicId}
              name={state.summary.data?.clinic?.name ?? "Your clinic"}
              location={state.summary.data?.clinic?.location ?? null}
              phone={state.summary.data?.clinic?.phoneNumber ?? null}
              doctorCount={state.summary.data?.providerCount ?? null}
            />
            <MoveFlow state={state} />
          </Flex>
        )}
      </AsyncContent>
    </>
  );
}

function CurrentClinic({
  clinicId,
  name,
  location,
  phone,
  doctorCount,
}: {
  clinicId: string;
  name: string;
  location: string | null;
  phone: string | null;
  doctorCount: number | null;
}) {
  return (
    <Surface padding="lg">
      <Flex direction="column" gap="3" align="start">
        <ClinicChip clinic={{ id: clinicId, name }} />
        {location && (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            {location}
          </Text>
        )}
        {phone && (
          <Text size="2" asChild>
            <a href={`tel:${phone}`} style={{ color: "var(--mp-ink)" }}>
              {phone}
            </a>
          </Text>
        )}
        {doctorCount !== null && (
          <Text size="2" style={{ color: "var(--mp-muted)" }}>
            {doctorCount} verified {doctorCount === 1 ? "doctor" : "doctors"}
          </Text>
        )}
        <Button asChild variant="soft" color="teal">
          <Link href={`/clinics/${clinicId}`}>View clinic</Link>
        </Button>
      </Flex>
    </Surface>
  );
}

type MoveState = ReturnType<typeof useMyClinic>;

function MoveFlow({ state }: { state: MoveState }) {
  const pending = state.pending;
  const historyColumns: Column<ClinicJoinRequest>[] = [
    {
      header: "Clinic",
      cell: (r) => r.clinicName,
    },
    {
      header: "Status",
      cell: (r) => <StatusPill kind="joinRequest" status={r.status} />,
    },
    {
      header: "Requested",
      cell: (r) => <RelativeTime iso={r.createdAtUtc} style="long" />,
      hideBelow: "md",
    },
  ];

  return (
    <Flex direction="column" gap="5">
      {pending ? (
        <Surface padding="lg">
          <Flex direction="column" gap="3" align="start">
            <Text size="2" weight="bold" style={{ color: "var(--mp-ink)" }}>
              Your request to move is waiting for a decision
            </Text>
            <Flex gap="3" align="center" wrap="wrap">
              <StatusChip
                kind="joinRequest"
                status={pending.status}
                interactive={false}
              />
              <Text size="2" style={{ color: "var(--mp-ink)" }}>
                {pending.clinicName}
              </Text>
              <Text size="2" style={{ color: "var(--mp-muted)" }}>
                <RelativeTime iso={pending.createdAtUtc} style="long" />
              </Text>
            </Flex>
            <Button
              variant="soft"
              color="red"
              loading={state.busyId === pending.id}
              onClick={() => void state.cancel(pending)}
            >
              Cancel request
            </Button>
          </Flex>
        </Surface>
      ) : (
        <Text size="2" style={{ color: "var(--mp-muted)" }}>
          To move to another clinic, pick it below and send a request. You can
          have one request waiting at a time.
        </Text>
      )}

      <section aria-labelledby="find-clinic-heading">
        <Flex justify="between" align="center" gap="3" wrap="wrap" mb="3">
          <Heading
            id="find-clinic-heading"
            as="h2"
            size="3"
            weight="bold"
            style={{ color: "var(--mp-ink)" }}
          >
            Move to another clinic
          </Heading>
          <div className="w-full max-w-xs">
            <SearchField
              value={state.searchText}
              onChange={state.setSearchText}
              placeholder="Search clinics"
              fullWidth
            />
          </div>
        </Flex>
        <AsyncContent
          loading={state.clinics.loading}
          error={state.clinics.error}
          isEmpty={(state.clinics.data ?? []).length === 0}
          onRetry={() => void state.clinics.reload()}
          empty={
            <EmptyState
              variant={state.searchText.trim() ? "no-matches" : "empty"}
              title={
                state.searchText.trim()
                  ? "No clinics match your search"
                  : "No other clinics to show"
              }
              description="Try a different name, or check with your clinic's administrator."
              onClearFilters={() => state.setSearchText("")}
            />
          }
        >
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {(state.clinics.data ?? []).map((clinic) => (
              <li key={clinic.id}>
                <Surface
                  padding="sm"
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <ClinicChip clinic={{ id: clinic.id, name: clinic.name }} />
                    {clinic.location && (
                      <Text
                        as="p"
                        size="1"
                        mt="1"
                        style={{ color: "var(--mp-muted)" }}
                      >
                        {clinic.location}
                      </Text>
                    )}
                  </div>
                  <Button
                    size="2"
                    color="teal"
                    variant="soft"
                    disabled={pending !== null || state.busyId !== null}
                    loading={state.busyId === clinic.id}
                    title={
                      pending
                        ? "Cancel your current request before asking another clinic."
                        : undefined
                    }
                    aria-label={`Request to move to ${clinic.name}`}
                    onClick={() => void state.requestMove(clinic)}
                  >
                    Request to move
                  </Button>
                </Surface>
              </li>
            ))}
          </ul>
        </AsyncContent>
      </section>

      <section aria-labelledby="history-heading">
        <Heading
          id="history-heading"
          as="h2"
          size="3"
          weight="bold"
          mb="3"
          style={{ color: "var(--mp-ink)" }}
        >
          Past requests
        </Heading>
        <AsyncContent
          loading={state.requests.loading}
          error={state.requests.error}
          isEmpty={state.history.length === 0}
          emptyText="You have not asked to move to another clinic yet."
        >
          <DataTable
            columns={historyColumns}
            rows={state.history}
            rowLabel={(r) => r.clinicName}
            caption="Your requests to move clinic"
          />
        </AsyncContent>
      </section>
    </Flex>
  );
}
