import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * `false` durante il rendering sul server e l'idratazione, `true` subito dopo.
 * Serve a leggere API solo-browser (localStorage, matchMedia) senza
 * hydration mismatch e senza setState dentro un effetto.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}
