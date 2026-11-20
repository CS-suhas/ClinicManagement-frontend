"use client";

import { createContext, type ReactNode, useContext, useState } from "react";
import { type Container, configFromEnv, createContainer } from "./container";

const ContainerContext = createContext<Container | null>(null);

export function ContainerProvider({
  children,
  container,
}: {
  children: ReactNode;
  /** Optional override, e.g. for tests or storybook. */
  container?: Container;
}) {
  const [value] = useState(() => container ?? createContainer(configFromEnv()));
  return (
    <ContainerContext.Provider value={value}>
      {children}
    </ContainerContext.Provider>
  );
}

export function useContainer(): Container {
  const ctx = useContext(ContainerContext);
  if (!ctx)
    throw new Error("useContainer must be used inside <ContainerProvider>");
  return ctx;
}

/** Resolve a single service: `const clinics = useService("clinicService")`. */
export function useService<K extends keyof Container>(key: K): Container[K] {
  return useContainer()[key];
}
