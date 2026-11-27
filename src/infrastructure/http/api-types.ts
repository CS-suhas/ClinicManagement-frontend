import type { components, paths } from "@/lib/api-schema.gen";

/**
 * Types for the backend API, generated from its OpenAPI document. Type every
 * HTTP call with these (never a hand-written shape) so a backend change the
 * frontend has not caught up with fails the type check. Regenerate with
 * `npm run api:update` after the backend changes.
 *
 * Prefer `ApiGet`/`ApiPost` (looked up by the endpoint's path) over `Api`
 * (looked up by schema name): the path ties the type to the URL being called.
 */
export type Api<Name extends keyof components["schemas"]> =
  components["schemas"][Name];

/** The API's paths without the "/api" prefix, as HttpClient takes them. */
type Endpoints = {
  [P in keyof paths as P extends `/api${infer Rest}` ? Rest : never]: paths[P];
};
export type Endpoint = keyof Endpoints;

/** The JSON body of an operation's 200 or 201 response. */
type SuccessBody<Operation> = Operation extends { responses: infer R }
  ? R[Extract<keyof R, 200 | 201>] extends {
      content: { "application/json": infer Body };
    }
    ? Body
    : never
  : never;

/** Response body of GET on `path`, e.g. ApiGet<"/clinics/{id}/summary">. */
export type ApiGet<Path extends Endpoint> = SuccessBody<Endpoints[Path]["get"]>;

/** Response body of POST on `path`. */
export type ApiPost<Path extends Endpoint> = SuccessBody<
  Endpoints[Path]["post"]
>;
