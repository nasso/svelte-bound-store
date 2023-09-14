import { derived } from "svelte/store";

/**
 * Monadic binding for Svelte stores.
 *
 * @template {import('./private.js').Stores} S
 * @template T
 * @param {S} stores - input stores
 * @param {(values: import('./private.js').StoresValues<S>) => import('svelte/store').Readable<T>} f - function callback that returns a store
 * @returns {import('svelte/store').Readable<T>}
 */
export function bound(stores, f) {
  return {
    subscribe(listener) {
      /** @type {undefined | (() => void)} */
      let bUnsub;

      const aUnsub = derived(stores, (x) => x).subscribe((values) => {
        bUnsub?.();
        bUnsub = f(values).subscribe(listener);
      });

      return () => {
        aUnsub();
        bUnsub?.();
      };
    },
  };
}
