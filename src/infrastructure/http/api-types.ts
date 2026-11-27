import type { components, paths } from "@/lib/api-schema.gen";

export type Api<Name extends keyof components["schemas"]> =
  components["schemas"][Name];

type Endpoints = {
  [P in keyof paths as P extends `/api${infer Rest}` ? Rest : never]: paths[P];
};
export type Endpoint = keyof Endpoints;

type SuccessBody<Operation> = Operation extends { responses: infer R }
  ? R[Extract<keyof R, 200 | 201>] extends {
      content: { "application/json": infer Body };
    }
    ? Body
    : never
  : never;

export type ApiGet<Path extends Endpoint> = SuccessBody<Endpoints[Path]["get"]>;

export type ApiPost<Path extends Endpoint> = SuccessBody<
  Endpoints[Path]["post"]
>;
