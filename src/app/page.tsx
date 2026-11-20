"use client";

import { Card, Flex, Grid, Heading, Table, Text } from "@radix-ui/themes";
import Link from "next/link";
import { useService } from "@/di/container-provider";
import { patientFullName, providerFullName } from "@/domain/entities";
import { AsyncContent } from "@/presentation/components/async-content";
import { PageHeader } from "@/presentation/components/page-header";
import { useAsyncData } from "@/presentation/hooks/use-async-data";
import { useNow } from "@/presentation/hooks/use-now";
import { formatDateTime } from "@/presentation/lib/format";

export default function Page() {
  const clinicService = useService("clinicService");
  const providerService = useService("providerService");
  const patientService = useService("patientService");
  const allergyTypeService = useService("allergyTypeService");
  const appointmentService = useService("appointmentService");

  const { data, loading, error, reload } = useAsyncData(async () => {
    const [clinics, providers, patients, allergyTypes, appointments] =
      await Promise.all([
        clinicService.list(),
        providerService.list(),
        patientService.list(),
        allergyTypeService.list(),
        appointmentService.list(),
      ]);
    return { clinics, providers, patients, allergyTypes, appointments };
  });

  const now = useNow() ?? 0;
  const allUpcoming = (data?.appointments ?? [])
    .filter((a) => new Date(a.appointmentDateTime).getTime() >= now)
    .sort((a, b) => a.appointmentDateTime.localeCompare(b.appointmentDateTime));
  const upcoming = allUpcoming.slice(0, 5);

  const stats = data
    ? [
        { label: "Clinics", value: data.clinics.length, href: "/clinics" },
        {
          label: "Providers",
          value: data.providers.length,
          href: "/providers",
        },
        { label: "Patients", value: data.patients.length, href: "/patients" },
        {
          label: "Allergy types",
          value: data.allergyTypes.length,
          href: "/allergies",
        },
        {
          label: "Upcoming appointments",
          value: allUpcoming.length,
          href: "/appointments",
        },
      ]
    : [];

  const patientName = (id: string) => {
    const p = data?.patients.find((x) => x.id === id);
    return p ? patientFullName(p) : "—";
  };
  const providerName = (id: string) => {
    const provider = data?.providers.find((x) => x.id === id);
    return provider ? providerFullName(provider) : "—";
  };

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
                  <Table.Cell>{patientName(a.patientId)}</Table.Cell>
                  <Table.Cell>{providerName(a.providerId)}</Table.Cell>
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
