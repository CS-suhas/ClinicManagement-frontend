"use client";

import { useEffect, useState } from "react";
import { useService } from "@/di/container-provider";
import type { PublicAccess } from "@/domain/auth";

/**
 * What anonymous visitors may open in this deployment (runtime config).
 * Null until it has been read.
 */
export function usePublicAccess(): PublicAccess | null {
  const getPublicAccess = useService("getPublicAccess");
  const [access, setAccess] = useState<PublicAccess | null>(null);

  useEffect(() => {
    let active = true;
    void getPublicAccess().then((value) => {
      if (active) setAccess(value);
    });
    return () => {
      active = false;
    };
  }, [getPublicAccess]);

  return access;
}
