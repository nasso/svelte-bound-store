/**
 * @template T
 * @typedef {import('svelte/store').Readable<T>} Readable<T>
 */

import { derived } from "svelte/store";

/**
 * Monadic bind for Svelte stores.
 *
 * @template A, B
 * @param {Readable<A>} a
 * @param {($a: A) => Readable<B>} f
 * @returns {Readable<B>}
 */
export function bound(a, f) {
  return {
    subscribe(listener) {
      /** @type {undefined | (() => void)} */
      let bUnsub;

      const aUnsub = a.subscribe(($a) => {
        bUnsub?.();
        bUnsub = f($a).subscribe(listener);
      });

      return () => {
        aUnsub();
        bUnsub?.();
      };
    },
  };
}

/**
 * Transforms an array of stores into a store containing an array of values.
 *
 * @template T
 * @param {Readable<T>[]} stores
 * @returns {Readable<T[]>}
 */
export function sequenced(stores) {
  return derived(stores, (values) => values);
}
