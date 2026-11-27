import { PersonAvatar } from "@/components/ui/person-avatar";

/** Doctor initials in a soft circle; the API has no doctor photos. */
export function DoctorAvatar({
  name,
  size = 80,
}: {
  name: string;
  size?: number;
}) {
  return <PersonAvatar name={name} size={size} />;
}
