import type { AppointmentSettings } from "@/domain/entities";
import type { ConfigurationRepository } from "@/domain/repositories";

export class ConfigurationService {
  constructor(private readonly repo: ConfigurationRepository) {}

  async getAllergySeverities(): Promise<string[]> {
    const severities = await this.repo.getAllergySeverities();
    if (
      !Array.isArray(severities) ||
      severities.length === 0 ||
      !severities.every(
        (severity: unknown): severity is string =>
          typeof severity === "string" && severity.trim() !== "",
      )
    )
      throw new Error("The API returned invalid allergy severity settings.");
    return severities;
  }

  async getAppointmentSettings(): Promise<AppointmentSettings> {
    const settings = await this.repo.getAppointmentSettings();
    if (!settings || typeof settings !== "object")
      throw new Error("The API returned invalid appointment settings.");
    const values = settings as Record<string, unknown>;
    const parseTime = (time: string) => {
      const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
      if (!match) return null;
      const hours = Number(match[1]);
      const minutes = Number(match[2]);
      return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : null;
    };
    const duration = values.appointmentDurationMinutes;
    const openingTime = values.clinicOpeningTime;
    const closingTime = values.clinicClosingTime;
    if (
      typeof openingTime !== "string" ||
      typeof closingTime !== "string" ||
      typeof duration !== "number"
    )
      throw new Error("The API returned invalid appointment settings.");
    const opening = parseTime(openingTime);
    const closing = parseTime(closingTime);
    if (
      !Number.isInteger(duration) ||
      duration <= 0 ||
      opening === null ||
      closing === null ||
      opening >= closing
    )
      throw new Error("The API returned invalid appointment settings.");
    return {
      appointmentDurationMinutes: duration,
      clinicOpeningTime: openingTime,
      clinicClosingTime: closingTime,
    };
  }
}
