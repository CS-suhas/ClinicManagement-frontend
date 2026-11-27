import { runtimeConfig } from "../runtime-config";
import { OidcSession } from "./oidc-session";

export const session = new OidcSession(() => runtimeConfig.keycloak());
