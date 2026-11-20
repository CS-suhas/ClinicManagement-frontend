/**
 * A tiny persisted collection. Uses localStorage in the browser and falls
 * back to memory when storage is unavailable (SSR, private mode, blocked).
 */
export class LocalStorageCollection<T> {
  private memory: T[] | null = null;

  constructor(
    private readonly key: string,
    private readonly seed: T[],
  ) {}

  read(): T[] {
    if (this.memory) return structuredClone(this.memory);
    try {
      const raw = window.localStorage.getItem(this.key);
      this.memory = raw ? (JSON.parse(raw) as T[]) : structuredClone(this.seed);
    } catch {
      this.memory = structuredClone(this.seed);
    }
    return structuredClone(this.memory);
  }

  write(items: T[]): void {
    this.memory = structuredClone(items);
    try {
      window.localStorage.setItem(this.key, JSON.stringify(items));
    } catch {
      // storage unavailable: keep in memory only
    }
  }
}

/** Simulated network latency so loading states are visible in mock mode. */
export const delay = (ms = 150) => new Promise((r) => setTimeout(r, ms));
