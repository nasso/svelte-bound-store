import { bind } from '$lib/index.js';
import { writable } from 'svelte/store';
import { describe, it, expect } from 'vitest';

/**
 * @param {number} x
 */
function counter(x) {
	const { subscribe, set, update } = writable(x);

	return {
		subscribe,
		set,
		increment: () => update((n) => n + 1),
		decrement: () => update((n) => n - 1)
	};
}

describe('bind', () => {
	it('works', () => {
		const index = writable(0);
		const counters = [counter(0), counter(0), counter(0)];

		const value = bind(index, ($a) => {
			return counters[$a];
		});

		const values = [];

		// push 0
		value.subscribe((v) => {
			values.push(v);
		});

		index.set(1); // push 0
		counters[1].increment(); // push 1
		counters[1].increment(); // push 2
		counters[0].increment(); // no push
		index.set(2); // push 0
		counters[2].increment(); // push 1
		counters[2].increment(); // push 2
		counters[1].increment(); // no push
		index.set(0); // push 1

		expect(values).toEqual([0, 0, 1, 2, 0, 1, 2, 1]);
	});
});
