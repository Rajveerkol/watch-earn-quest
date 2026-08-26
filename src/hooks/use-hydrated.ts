import { useEffect, useState } from "react";

/** True only after the first client render, so browser-only reads stay hydration-safe. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
