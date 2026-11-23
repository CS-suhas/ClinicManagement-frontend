import type { DashboardRepository } from "@/domain/repositories";

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  getDashboard() {
    return this.repo.getDashboard();
  }

  /** The signed-in user's dashboard, one section per role they hold. */
  getMine() {
    return this.repo.getMine();
  }
}
