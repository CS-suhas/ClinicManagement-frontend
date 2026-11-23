"use client";

import { Card, Flex, Grid, Heading, Table, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useService } from "@/di/container-provider";
import { AsyncContent } from "@/presentation/components/async-content";
import { PageHeader } from "@/presentation/components/page-header";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { formatDateTime } from "@/presentation/lib/format";

export default function Page() {
  const dashboardService = useService("dashboardService");
  const { data, loading, error, reload } = useAsyncData(() =>
    dashboardService.getDashboard(),
  );
  const upcoming = data?.upcomingAppointments ?? [];

  const stats = data
    ? [
        { label: "Clinics", value: data.clinics, href: "/clinics" },
        {
          label: "Providers",
          value: data.providers,
          href: "/providers",
        },
        { label: "Patients", value: data.patients, href: "/patients" },
        {
          label: "Allergy types",
          value: data.allergyTypes,
          href: "/allergies",
        },
        {
          label: "Appointments",
          value: data.appointments,
          href: "/appointments",
        },
      ]
    : [];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Overview of the clinic network."
      />
      <AsyncContent
        loading={loading}
        error={error}
        isEmpty={!data}
        onRetry={reload}
      >
        <Grid columns={{ initial: "2", sm: "3", lg: "5" }} gap="3" mb="6">
          {stats.map((s) => (
            <Card key={s.label} asChild>
              <Link href={s.href} className="no-underline">
                <Text as="div" size="2" color="gray">
                  {s.label}
                </Text>
                <Text as="div" size="7" weight="bold">
                  {s.value}
                </Text>
              </Link>
            </Card>
          ))}
        </Grid>

        <Heading size="4" mb="3">
          Next appointments
        </Heading>
        {upcoming.length === 0 ? (
          <Card>
            <Flex justify="center" py="5">
              <Text color="gray">No upcoming appointments.</Text>
            </Flex>
          </Card>
        ) : (
          <Table.Root variant="surface">
            <Table.Header>
              <Table.Row>
                <Table.ColumnHeaderCell>When</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Patient</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Provider</Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell>Reason</Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {upcoming.map((a) => (
                <Table.Row key={a.id}>
                  <Table.Cell>
                    {formatDateTime(a.appointmentDateTime)}
                  </Table.Cell>
                  <Table.Cell>{a.patientName}</Table.Cell>
                  <Table.Cell>{a.providerName}</Table.Cell>
                  <Table.Cell>{a.reasonForVisit}</Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        )}
      </AsyncContent>
    </>
  );
}
