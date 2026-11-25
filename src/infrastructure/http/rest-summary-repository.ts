import type { Patient } from "@/domain/entities";
import type {
  ClinicSummaryData,
  PatientSummaryData,
  ProviderSummaryData,
  SearchResults,
  SummaryProvider,
  SummaryRepository,
} from "@/domain/repositories";
import type { HttpClient } from "./http-client";
import { queryString } from "./query-string";
import {
  type ClinicResponse,
  clinicMapper,
  type ProviderResponse,
  providerMapper,
} from "./rest-repositories";

/** A provider row as the summary endpoints send it: the provider plus its clinic name. */
type ProviderSummaryResponse = ProviderResponse & { clinicName: string | null };

const toSummaryProvider = (
  response: ProviderSummaryResponse,
): SummaryProvider => ({
  ...providerMapper.fromResponse(response),
  clinicName: response.clinicName ?? null,
});

/**
 * Summary and search endpoints. Access failures arrive as ForbiddenError (403)
 * and NotFoundError (404) from HttpClient, and validation as ValidationError (400).
 */
export class RestSummaryRepository implements SummaryRepository {
  constructor(private readonly http: HttpClient) {}

  async getPatientSummary(id: string): Promise<PatientSummaryData> {
    const response = await this.http.get<{
      patient: Patient;
      allergies: { allergyId: string; name: string; severity: string }[];
      lastVisit: PatientSummaryData["lastVisit"];
      nextVisit: PatientSummaryData["nextVisit"];
      counts: PatientSummaryData["counts"];
      recent: PatientSummaryData["recent"];
    }>(`/patients/${encodeURIComponent(id)}/summary`);
    return {
      patient: response.patient,
      allergies: response.allergies,
      lastVisit: response.lastVisit ?? null,
      nextVisit: response.nextVisit ?? null,
      counts: response.counts,
      recent: response.recent,
    };
  }

  async getClinicSummary(id: string): Promise<ClinicSummaryData> {
    const response = await this.http.get<{
      clinic: ClinicResponse;
      providerCount: number;
      todayAppointmentCount: number;
      topSpecialties: { specialty: string; count: number }[];
      providers: ProviderSummaryResponse[];
    }>(`/clinics/${encodeURIComponent(id)}/summary`);
    return {
      clinic: clinicMapper.fromResponse(response.clinic),
      providerCount: response.providerCount,
      todayAppointmentCount: response.todayAppointmentCount,
      topSpecialties: response.topSpecialties,
      providers: response.providers.map(toSummaryProvider),
    };
  }

  async getProviderSummary(id: string): Promise<ProviderSummaryData> {
    const response = await this.http.get<{
      provider: ProviderSummaryResponse;
      clinic: ClinicResponse;
      nextAvailableStart: string | null;
      todayAppointmentCount: number;
    }>(`/providers/${encodeURIComponent(id)}/summary`);
    return {
      provider: toSummaryProvider(response.provider),
      clinic: clinicMapper.fromResponse(response.clinic),
      nextAvailableStart: response.nextAvailableStart ?? null,
      todayAppointmentCount: response.todayAppointmentCount,
    };
  }

  search(q: string, limit: number): Promise<SearchResults> {
    return this.http.get<SearchResults>(`/search?${queryString({ q, limit })}`);
  }
}
