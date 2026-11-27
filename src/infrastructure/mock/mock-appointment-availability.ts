import type { Appointment } from "@/domain/entities";
import { addDays, localMidnightIso } from "@/domain/local-time";
import type { AppointmentAvailabilityRepository } from "@/domain/repositories";
import { delay, type LocalStorageCollection } from "./local-storage-collection";

const BLOCKING_STATUSES: ReadonlySet<Appointment["status"]> = new Set([
  "REQUESTED",
  "CONFIRMED",
]);

export class MockAppointmentAvailabilityRepository
  implements AppointmentAvailabilityRepository
{
  constructor(private readonly store: LocalStorageCollection<Appointment>) {}

  async getBusyStarts(providerId: string, date: string): Promise<string[]> {
    await delay();
    const from = Date.parse(localMidnightIso(date));
    const to = Date.parse(localMidnightIso(addDays(date, 1)));
    return this.store
      .read()
      .filter((appointment) => {
        if (
          appointment.providerId !== providerId ||
          !BLOCKING_STATUSES.has(appointment.status)
        )
          return false;
        const time = Date.parse(appointment.appointmentDateTime);
        return time >= from && time < to;
      })
      .map((appointment) => appointment.appointmentDateTime)
      .sort((a, b) => Date.parse(a) - Date.parse(b));
  }
}
