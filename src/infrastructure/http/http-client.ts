import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/domain/errors";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** A fixed base URL, or a function resolved on every request (see `resolveApiBaseUrl`). */
export type BaseUrl = string | (() => string);

/** Thin fetch wrapper that maps HTTP failures onto domain errors. */
export class HttpClient {
  /** `getToken` supplies the bearer token; requests omit the header when it is null. */
  constructor(
    private readonly baseUrl: BaseUrl,
    private readonly getToken?: () => Promise<string | null>,
  ) {}

  get<T>(path: string) {
    return this.request<T>("GET", path);
  }
  /** Like `get`, but resolves to null when the resource does not exist. */
  async getOrNull<T>(path: string): Promise<T | null> {
    try {
      return await this.get<T>(path);
    } catch (e) {
      if (e instanceof NotFoundError) return null;
      throw e;
    }
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
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const token = await this.getToken?.();
    if (token) headers.Authorization = `Bearer ${token}`;

    const baseUrl =
      typeof this.baseUrl === "function" ? this.baseUrl() : this.baseUrl;
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
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
    if (res.status === 401) throw new UnauthorizedError(message);
    if (res.status === 403) throw new ForbiddenError(message);
    if (res.status === 404) throw new NotFoundError("Resource", path);
    if (res.status === 409) throw new ConflictError(message);
    throw new HttpError(res.status, message);
  }
}
