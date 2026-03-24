// Browser stub for better-sqlite3.
// Never called in the browser — SqliteAdapter is not used in grimoire-app.
class DatabaseStub {
  constructor() { throw new Error('better-sqlite3 is not available in the browser') }
}
export default DatabaseStub
