import { Badge, Flex } from "@radix-ui/themes";
import type { Role } from "@/domain/auth";

const ROLE_LABELS: Record<Role, string> = {
  admin: "Admin",
  clinicadmin: "Clinic admin",
  doctor: "Doctor",
  patient: "Patient",
};

export function RoleBadges({
  roles,
  size = "1",
}: {
  roles: Role[];
  size?: "1" | "2";
}) {
  if (roles.length === 0)
    return (
      <Badge variant="soft" color="gray" size={size}>
        No roles
      </Badge>
    );
  return (
    <Flex gap="1" wrap="wrap">
      {roles.map((role) => (
        <Badge key={role} variant="soft" color="teal" size={size}>
          {ROLE_LABELS[role]}
        </Badge>
      ))}
    </Flex>
  );
}
