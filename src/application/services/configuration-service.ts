import {
  type AppointmentSettings,
  parseAllergySeverities,
  parseAppointmentSettings,
} from "@/domain/entities";
import type { ConfigurationRepository } from "@/domain/repositories";

/**
 * Validated API configuration. These values rarely change, so each is fetched
 * once and reused; a failed fetch is not cached, so the next call retries.
 */
export class ConfigurationService {
  private severities?: Promise<string[]>;
  private settings?: Promise<AppointmentSettings>;

  constructor(private readonly repo: ConfigurationRepository) {}

  getAllergySeverities(): Promise<string[]> {
    this.severities ??= this.cached(
      async () =>
        parseAllergySeverities(await this.repo.getAllergySeverities()),
      () => {
        this.severities = undefined;
      },
    );
    return this.severities;
  }

  getAppointmentSettings(): Promise<AppointmentSettings> {
    this.settings ??= this.cached(
      async () =>
        parseAppointmentSettings(await this.repo.getAppointmentSettings()),
      () => {
        this.settings = undefined;
      },
    );
    return this.settings;
  }

  private cached<T>(load: () => Promise<T>, evict: () => void): Promise<T> {
    const promise = load();
    promise.catch(evict);
    return promise;
  }
}
