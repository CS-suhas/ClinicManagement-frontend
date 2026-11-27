import type {
  ClinicSummaryData,
  PatientSummaryData,
  ProviderSummaryData,
  SearchResults,
  SummaryProvider,
  SummaryRepository,
} from "@/domain/repositories";
import type { ApiGet } from "./api-types";
import type { HttpClient } from "./http-client";
import { queryString } from "./query-string";
import {
  clinicMapper,
  type ProviderResponse,
  providerMapper,
} from "./rest-repositories";

const toSummaryProvider = (response: ProviderResponse): SummaryProvider => ({
  ...providerMapper.fromResponse(response),
  clinicName: response.clinicName ?? null,
});

export class RestSummaryRepository implements SummaryRepository {
  constructor(private readonly http: HttpClient) {}

  async getPatientSummary(id: string): Promise<PatientSummaryData> {
    const response = await this.http.get<ApiGet<"/patients/{id}/summary">>(
      `/patients/${encodeURIComponent(id)}/summary`,
    );
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
    const response = await this.http.get<ApiGet<"/clinics/{id}/summary">>(
      `/clinics/${encodeURIComponent(id)}/summary`,
    );
    return {
      clinic: clinicMapper.fromResponse(response.clinic),
      providerCount: response.providerCount,
      todayAppointmentCount: response.todayAppointmentCount,
      topSpecialties: response.topSpecialties,
      providers: response.providers.map(toSummaryProvider),
    };
  }

  async getProviderSummary(id: string): Promise<ProviderSummaryData> {
    const response = await this.http.get<ApiGet<"/providers/{id}/summary">>(
      `/providers/${encodeURIComponent(id)}/summary`,
    );
    return {
      provider: toSummaryProvider(response.provider),
      clinic: clinicMapper.fromResponse(response.clinic),
      nextAvailableStart: response.nextAvailableStart ?? null,
      todayAppointmentCount: response.todayAppointmentCount,
    };
  }

  search(q: string, limit: number): Promise<SearchResults> {
    return this.http.get<ApiGet<"/search">>(
      `/search?${queryString({ q, limit })}`,
    );
  }
}
