import type { ConfigurationRepository } from "@/domain/repositories";
import { delay } from "./local-storage-collection";

/** Fixed settings for mock mode, mirroring what the API serves. */
export class MockConfigurationRepository implements ConfigurationRepository {
  async getAllergySeverities() {
    await delay();
    return ["MILD", "MODERATE", "SEVERE"];
  }

  async getAppointmentSettings() {
    await delay();
    return {
      appointmentDurationMinutes: 30,
      clinicOpeningTime: "08:00:00",
      clinicClosingTime: "17:00:00",
    };
  }
}
