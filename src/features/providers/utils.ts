import type { Provider } from "./schemas";

export const providerFullName = (
  provider: Pick<Provider, "firstName" | "lastName">,
) => `${provider.firstName} ${provider.lastName}`.trim();
