# `svelte-bound-store`

`bound` is like `derived`, but the function returns another store.

## Usage

```js
import { writable } from "svelte/store";
import { bound } from "svelte-bound-store";

const foo = writable("foo");
const bar = writable("bar");
const baz = writable("baz");
const state = writable({
  index: 0,
  items: [foo, bar, baz],
});

const current = bound(state, ({ index, items }) => items[index]);

current.subscribe(console.log); // "foo"

foo.set("foo2"); // "foo2"

// change the index
state.update((state) => ({ ...state, index: 1 })); // "bar"

foo.set("foo3"); // logs nothing because `current` is no longer bound to `foo`
```
