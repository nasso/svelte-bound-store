// @ts-check
import { bind, sequence } from "./lib/index.js";
import { derived, get, readable, writable } from "svelte/store";
import { describe, it, expect } from "vitest";

/**
 * @param {number} x
 */
function counter(x) {
  const { subscribe, set, update } = writable(x);

  return {
    subscribe,
    set,
    increment: () => update((n) => n + 1),
    decrement: () => update((n) => n - 1),
  };
}

/**
 * Asserts that a value is not undefined.
 * @template T
 * @param {T | undefined} value
 * @returns {T}
 */
function unwrap(value) {
  if (value === undefined) {
    throw new Error("Expected value to be defined");
  } else {
    return value;
  }
}

describe("bind", () => {
  it("subscribes and unsubscribes to underlying stores", () => {
    const index = writable(0);
    const counters = [counter(0), counter(0), counter(0)];

    const value = bind(index, ($a) => {
      return counters[$a];
    });

    /** @type {number[]} */
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

  it("unsubscribes from underlying stores when unsubscribed", () => {
    const index = writable(0);
    const counters = [counter(0), counter(0), counter(0)];

    const value = bind(index, ($a) => {
      return counters[$a];
    });

    /** @type {number[]} */
    const values = [];

    // push 0
    const unsub = value.subscribe((v) => {
      values.push(v);
    });

    index.set(1); // push 0
    counters[1].increment(); // push 1
    counters[1].increment(); // push 2
    counters[0].increment(); // no push

    unsub();

    index.set(2); // no pushp
    counters[2].increment(); // no push
    counters[2].increment(); // no push
    counters[1].increment(); // no push
    index.set(0); // no push

    expect(values).toEqual([0, 0, 1, 2]);
  });
});

describe("sequence", () => {
  it("works with empty array", () => {
    /** @type {import('svelte/store').Readable<unknown[]>} */
    const array = sequence([]);

    /** @type {unknown[]} */
    const values = [];

    array.subscribe((v) => {
      values.push(v);
    });

    expect(values).toEqual([[]]);
  });

  it("works with non-empty array", () => {
    const array = sequence([readable(0), readable(1), readable(2)]);
    const values = get(array);

    expect(values).toEqual([0, 1, 2]);
  });

  it("subscribes to underlying stores", () => {
    const stores = [counter(0), counter(0), counter(0)];
    const array = sequence(stores);

    /** @type {number[][]} */
    const values = [];

    array.subscribe((v) => {
      values.push(v.slice());
    });

    stores[0].increment();
    stores[1].increment();
    stores[2].increment();

    expect(values).toEqual([
      [0, 0, 0],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ]);
  });
});

describe("common patterns", () => {
  it("kanban", () => {
    /**
     * @typedef {{ id: string, name: string }} Task
     * @type {Map<string, import('svelte/store').Writable<Task>>}
     */
    const tasks = new Map([
      ["task-0", writable({ id: "task-0", name: "Task 0" })],
      ["task-1", writable({ id: "task-1", name: "Task 1" })],
      ["task-2", writable({ id: "task-2", name: "Task 2" })],
      ["task-3", writable({ id: "task-3", name: "Task 3" })],
      ["task-4", writable({ id: "task-4", name: "Task 4" })],
      ["task-5", writable({ id: "task-5", name: "Task 5" })],
      ["task-6", writable({ id: "task-6", name: "Task 6" })],
      ["task-7", writable({ id: "task-7", name: "Task 7" })],
      ["task-8", writable({ id: "task-8", name: "Task 8" })],
      ["task-9", writable({ id: "task-9", name: "Task 9" })],
    ]);

    /**
     * @typedef {{ id: string, tasks: string[] }} Column
     * @type {Map<string, import('svelte/store').Writable<Column>>}
     */
    const columns = new Map([
      [
        "col-0",
        writable({ id: "col-0", tasks: ["task-1", "task-2", "task-3"] }),
      ],
      [
        "col-1",
        writable({ id: "col-1", tasks: ["task-4", "task-5", "task-6"] }),
      ],
      [
        "col-2",
        writable({ id: "col-2", tasks: ["task-7", "task-8", "task-9"] }),
      ],
    ]);

    /**
     * @typedef {{ name: string, columns: string[] }} Board
     * @type {import('svelte/store').Writable<Board>}
     */
    const kanban = writable({
      name: "Kanban Board",
      columns: ["col-0", "col-1", "col-2"],
    });

    /**
     * @typedef {Task} TaskState
     * @typedef {{ id: string, tasks: TaskState[] }} ColumnState
     * @typedef {{ name: string, columns: ColumnState[] }} BoardState
     * @type {import('svelte/store').Readable<BoardState>}
     */
    const state = bind(kanban, ($kanban) =>
      bind(
        // fetch columns
        sequence($kanban.columns.map((id) => unwrap(columns.get(id)))),
        ($columns) =>
          // replace column ids with column states
          derived(
            // fetch column states
            sequence(
              $columns.map((column) =>
                // replace task ids with task states
                derived(
                  // fetch tasks
                  sequence(column.tasks.map((id) => unwrap(tasks.get(id)))),
                  (taskStates) => ({ ...column, tasks: taskStates }),
                ),
              ),
            ),
            ($columnStates) => ({ ...$kanban, columns: $columnStates }),
          ),
      ),
    );

    /** @type {BoardState[]} */
    const values = [];

    state.subscribe((v) => {
      values.push(JSON.parse(JSON.stringify(v)));
    });

    expect(values).toEqual([
      {
        name: "Kanban Board",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-1", name: "Task 1" },
              { id: "task-2", name: "Task 2" },
              { id: "task-3", name: "Task 3" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // rename board
    kanban.update((board) => ({ ...board, name: "Kanban Board Test" }));

    expect(values).toEqual([
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-1", name: "Task 1" },
              { id: "task-2", name: "Task 2" },
              { id: "task-3", name: "Task 3" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // add task-0 to col-0
    columns.get("col-0")?.update((column) => ({
      ...column,
      tasks: [...column.tasks, "task-0"],
    }));

    expect(values).toEqual([
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-1", name: "Task 1" },
              { id: "task-2", name: "Task 2" },
              { id: "task-3", name: "Task 3" },
              { id: "task-0", name: "Task 0" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // move task-1 to col-1
    columns.get("col-0")?.update((column) => ({
      ...column,
      tasks: column.tasks.filter((id) => id !== "task-1"),
    }));
    columns.get("col-1")?.update((column) => ({
      ...column,
      tasks: [...column.tasks, "task-1"],
    }));

    expect(values).toEqual([
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-2", name: "Task 2" },
              { id: "task-3", name: "Task 3" },
              { id: "task-0", name: "Task 0" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-2", name: "Task 2" },
              { id: "task-3", name: "Task 3" },
              { id: "task-0", name: "Task 0" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
              { id: "task-1", name: "Task 1" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // rename task-2
    tasks.get("task-2")?.update((task) => ({ ...task, name: "Task two" }));

    expect(values).toEqual([
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-2", name: "Task two" },
              { id: "task-3", name: "Task 3" },
              { id: "task-0", name: "Task 0" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
              { id: "task-1", name: "Task 1" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // remove task-3
    columns.get("col-0")?.update((column) => ({
      ...column,
      tasks: column.tasks.filter((id) => id !== "task-3"),
    }));

    expect(values).toEqual([
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-2", name: "Task two" },
              { id: "task-0", name: "Task 0" },
            ],
          },
          {
            id: "col-1",
            tasks: [
              { id: "task-4", name: "Task 4" },
              { id: "task-5", name: "Task 5" },
              { id: "task-6", name: "Task 6" },
              { id: "task-1", name: "Task 1" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // remove col-1
    kanban.update((board) => ({
      ...board,
      columns: board.columns.filter((id) => id !== "col-1"),
    }));

    expect(values).toEqual([
      {
        name: "Kanban Board Test",
        columns: [
          {
            id: "col-0",
            tasks: [
              { id: "task-2", name: "Task two" },
              { id: "task-0", name: "Task 0" },
            ],
          },
          {
            id: "col-2",
            tasks: [
              { id: "task-7", name: "Task 7" },
              { id: "task-8", name: "Task 8" },
              { id: "task-9", name: "Task 9" },
            ],
          },
        ],
      },
    ]);
    values.length = 0;

    // clear tasks in col-1
    columns.get("col-1")?.update((column) => ({ ...column, tasks: [] }));

    expect(values).toEqual([]);
    values.length = 0;
  });
});
