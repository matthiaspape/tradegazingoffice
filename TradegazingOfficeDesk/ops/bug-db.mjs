import { withDatabase } from './store.mjs';

// The imported board uses a small D1-shaped query surface. Execute it
// synchronously inside the Office Desk's own SQLite transaction: no awaits
// while a write lock is held and no connection to the research Desk.
export function withBugDatabase(operation, write = false) {
  return withDatabase(database => {
    const db = {
      prepare(sql) {
        const statement = database.prepare(sql);
        function query(values = []) {
          return {
            bind: (...next) => query(next),
            all: () => ({ results: statement.all(...values) }),
            first: column => {
              const row = statement.get(...values);
              return column ? row?.[column] : row;
            },
            run: () => statement.run(...values),
          };
        }
        return query();
      },
    };
    return operation(db);
  }, write);
}
