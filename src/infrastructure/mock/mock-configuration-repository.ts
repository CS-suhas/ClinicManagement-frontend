import type { AppointmentSettings } from "@/domain/entities";
import type { ConfigurationRepository } from "@/domain/repositories";
import { delay } from "./local-storage-collection";

export const MOCK_APPOINTMENT_SETTINGS: AppointmentSettings = {
  appointmentDurationMinutes: 30,
  clinicOpeningTime: "08:00:00",
  clinicClosingTime: "17:00:00",
};

export class MockConfigurationRepository implements ConfigurationRepository {
  async getAllergySeverities() {
    await delay();
    return ["MILD", "MODERATE", "SEVERE"];
  }

  async getAppointmentSettings() {
    await delay();
    return { ...MOCK_APPOINTMENT_SETTINGS };
  }
}
