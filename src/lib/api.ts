import createClient from "openapi-fetch";
import createQueryClient from "openapi-react-query";
import type { components, paths } from "./api-schema.gen";
import { session } from "./auth/session";

export type Schemas = components["schemas"];

export class ApiError extends Error {
  status: number;
  fieldErrors?: Record<string, string>;

  constructor(
    status: number,
    message: string,
    fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

const DEFAULT_MESSAGES: Record<number, string> = {
  400: "Please fix the highlighted fields.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "That record was not found.",
};

function baseUrl() {
  if (typeof window !== "undefined") return "";
  const internal = process.env.API_INTERNAL_URL || "http://localhost:8080/api";
  return internal.replace(/\/api\/?$/, "");
}

export const api = createClient<paths>({ baseUrl: baseUrl() });

api.use({
  async onRequest({ request }) {
    const token = await session.getAccessToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  async onResponse({ response }) {
    if (response.ok) return response;
    const body = await response
      .clone()
      .json()
      .catch(() => ({}));
    const fieldErrors =
      response.status === 400 ? toFieldErrors(body.errors) : undefined;
    const message =
      [body.message, body.detail, body.title].find(
        (m) => typeof m === "string" && m,
      ) ||
      DEFAULT_MESSAGES[response.status] ||
      response.statusText ||
      "Something went wrong.";
    throw new ApiError(response.status, message, fieldErrors);
  },
});

function toFieldErrors(errors: unknown): Record<string, string> | undefined {
  if (!errors || typeof errors !== "object") return undefined;
  return Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      key.charAt(0).toLowerCase() + key.slice(1),
      Array.isArray(value) ? value.join(" ") : String(value),
    ]),
  );
}

export const $api = createQueryClient(api);

const isStatus =
  (...statuses: number[]) =>
  (e: unknown) =>
    e instanceof ApiError && statuses.includes(e.status);

export const isForbidden = isStatus(403);
export const isDenied = isStatus(403, 404);

export async function orNull<T>(
  read: () => Promise<T>,
  ignore: (e: unknown) => boolean = isDenied,
): Promise<T | null> {
  try {
    return await read();
  } catch (e) {
    if (ignore(e)) return null;
    throw e;
  }
}

export async function unwrap<T>(request: Promise<{ data?: T }>): Promise<T> {
  const { data } = await request;
  return data as T;
}

export const newId = () => crypto.randomUUID();

export const byId = (id: string) => ({ params: { path: { id } } });
