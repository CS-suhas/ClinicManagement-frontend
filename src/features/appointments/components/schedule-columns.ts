import type { AppointmentScope } from "@/application/services/appointment-service";
import { type Provider, providerFullName } from "@/domain/entities";
import type { AppointmentListItem } from "@/domain/repositories";

/** One provider column of the day calendar. */
export type ScheduleColumn = {
  id: string;
  name: string;
  specialty: string;
  /** The signed-in doctor's own column. */
  isYou: boolean;
};

/**
 * Columns for the calendar. Admins see every provider. A doctor sees only
 * their own column. A patient sees one column per provider they are booked with.
 */
export function buildColumns(
  scope: AppointmentScope,
  providers: readonly Provider[],
  items: readonly AppointmentListItem[],
): ScheduleColumn[] {
  if (scope.mode === "all")
    return providers.map((p) => ({
      id: p.id,
      name: providerFullName(p),
      specialty: p.specialty,
      isYou: false,
    }));

  const columns = new Map<string, ScheduleColumn>();
  if (scope.mode === "provider")
    columns.set(scope.providerId, {
      id: scope.providerId,
      name: "",
      specialty: "",
      isYou: true,
    });
  for (const item of items) {
    if (columns.has(item.providerId)) continue;
    columns.set(item.providerId, {
      id: item.providerId,
      name: item.providerName,
      specialty: item.providerSpecialty,
      isYou: false,
    });
  }
  // Keep the doctor's own specialty when the day's rows carry it.
  if (scope.mode === "provider") {
    const own = items.find((item) => item.providerId === scope.providerId);
    if (own) {
      columns.set(scope.providerId, {
        id: scope.providerId,
        name: own.providerName,
        specialty: own.providerSpecialty,
        isYou: true,
      });
    }
  }
  return [...columns.values()];
}
