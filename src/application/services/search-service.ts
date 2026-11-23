import type { SearchResults, SummaryRepository } from "@/domain/repositories";

/** Global search for the command palette. */
export class SearchService {
  constructor(private readonly summaries: SummaryRepository) {}

  /**
   * Matches patients, providers and clinics. `q` is trimmed and needs at least
   * 2 characters (ValidationError on "q"). `limit` caps each list, 1 to 20, default 5.
   */
  search(q: string, limit = 5): Promise<SearchResults> {
    return this.summaries.search(q.trim(), limit);
  }
}
