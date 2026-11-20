import { ConflictError, NotFoundError, ValidationError } from "@/domain/errors";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Thin fetch wrapper that maps HTTP failures onto domain errors. */
export class HttpClient {
  constructor(private readonly baseUrl: string) {}

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T>(path: string, body: unknown) {
    return this.request<T>("POST", path, body);
  }
  put<T>(path: string, body: unknown) {
    return this.request<T>("PUT", path, body);
  }
  delete(path: string) {
    return this.request<void>("DELETE", path);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const res = await fetch(`${this.baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers:
        body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.ok) {
      if (res.status === 204) return undefined as T;
      const text = await res.text();
      return (text ? JSON.parse(text) : undefined) as T;
    }
    const payload = await res
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const message =
      typeof payload.message === "string" ? payload.message : res.statusText;
    if (
      res.status === 400 &&
      payload.errors &&
      typeof payload.errors === "object"
    )
      throw new ValidationError(payload.errors as Record<string, string>);
    if (res.status === 404) throw new NotFoundError("Resource", path);
    if (res.status === 409) throw new ConflictError(message);
    throw new HttpError(res.status, message);
  }
}
