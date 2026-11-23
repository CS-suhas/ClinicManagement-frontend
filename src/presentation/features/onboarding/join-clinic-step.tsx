"use client";

import { Button, Flex, Text } from "@radix-ui/themes";
import Link from "next/link";
import { Surface } from "@/presentation/components/ui/surface";

/**
 * A verified doctor with no clinic. Joining is done on My clinic, where the
 * clinics are searchable and requests can be tracked. There is no skip: the
 * app needs a clinic (or the join step) before it opens up, so this step only
 * links out.
 */
export function JoinClinicStep() {
  return (
    <Surface padding="md">
      <Flex direction="column" gap="3" align="start">
        <Text size="2" style={{ color: "var(--mp-ink)" }}>
          Your application is approved. Ask to join the clinic you work at; its
          administrator confirms the request.
        </Text>
        <Flex gap="2" wrap="wrap">
          <Button asChild color="teal">
            <Link href="/my-clinic">Join a clinic</Link>
          </Button>
          <Button asChild variant="soft" color="gray">
            <Link href="/doctors">Browse doctors</Link>
          </Button>
        </Flex>
      </Flex>
    </Surface>
  );
}
