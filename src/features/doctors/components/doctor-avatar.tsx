import { PersonAvatar } from "@/components/ui/person-avatar";

export function DoctorAvatar({
  name,
  size = 80,
}: {
  name: string;
  size?: number;
}) {
  return <PersonAvatar name={name} size={size} />;
}
