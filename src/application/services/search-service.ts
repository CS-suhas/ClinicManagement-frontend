import type { SearchResults, SummaryRepository } from "@/domain/repositories";

export class SearchService {
  constructor(private readonly summaries: SummaryRepository) {}

  search(q: string, limit = 5): Promise<SearchResults> {
    return this.summaries.search(q.trim(), limit);
  }
}
