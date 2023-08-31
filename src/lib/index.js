// @ts-check

/**
 * Monadic bind for Svelte stores.
 *
 * @template A, B
 * @param {import("svelte/store").Readable<A>} a
 * @param {($a: A) => import("svelte/store").Readable<B>} f
 * @returns {import("svelte/store").Readable<B>}
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
		}
	};
}
