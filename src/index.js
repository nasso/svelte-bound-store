// @ts-check
/**
 * @template T
 * @typedef {import('svelte/store').Readable<T>} Readable<T>
 */

/**
 * Monadic bind for Svelte stores.
 *
 * @template A, B
 * @param {Readable<A>} a
 * @param {($a: A) => Readable<B>} f
 * @returns {Readable<B>}
 */
export function bind(a, f) {
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
export function sequence(stores) {
  return {
    subscribe(listener) {
      /** @type {T[]} */
      const values = new Array(stores.length);
      let ready = false;

      const unsubscribers = stores.map((store, i) => {
        return store.subscribe(($value) => {
          values[i] = $value;

          if (ready) {
            listener(values);
          }
        });
      });

      ready = true;
      listener(values);

      return () => {
        unsubscribers.forEach((unsub) => unsub());
      };
    },
  };
}
