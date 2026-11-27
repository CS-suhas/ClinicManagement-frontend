import type { DashboardRepository } from "@/domain/repositories";

export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  getDashboard() {
    return this.repo.getDashboard();
  }

  getMine() {
    return this.repo.getMine();
  }
}
