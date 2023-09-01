/**
 * @template T
 * @typedef {import('svelte/store').Readable<T>} Readable<T>
 */

import { derived } from "svelte/store";

/**
 * @template A
 * @typedef {Readable<A> & {
 *  bind: <B>(f: ($a: A) => Readable<B>) => Chainable<B>,
 *  map: <B>(f: ($a: A) => B) => Chainable<B>,
 * }} Chainable<A>
 */

/**
 *
 * @template T
 * @param {Readable<T>} s
 * @returns {Chainable<T>}
 */
export function monadic(s) {
  return {
    subscribe: s.subscribe,
    bind: (f) => bound(s, f),
    map: (f) => monadic(derived(s, f)),
  };
}

/**
 * Monadic bind for Svelte stores.
 *
 * @template A, B
 * @param {Readable<A>} a
 * @param {($a: A) => Readable<B>} f
 * @returns {Chainable<B>}
 */
export function bound(a, f) {
  return monadic({
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
  });
}

/**
 * Transforms an array of stores into a store containing an array of values.
 *
 * @template T
 * @param {Readable<T>[]} stores
 * @returns {Chainable<T[]>}
 */
export function sequenced(stores) {
  return monadic(derived(stores, (values) => values));
}
