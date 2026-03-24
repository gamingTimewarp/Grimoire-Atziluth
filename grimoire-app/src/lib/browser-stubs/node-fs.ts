// Browser stub for Node.js 'fs' module.
// These are never called in the browser — only SqliteAdapter and file-loader use them,
// and neither is invoked when using InMemoryAdapter.
export const readFileSync = (): never => { throw new Error('fs.readFileSync is not available in the browser') }
export const readdirSync = (): never => { throw new Error('fs.readdirSync is not available in the browser') }
export const statSync = (): never => { throw new Error('fs.statSync is not available in the browser') }
export const existsSync = (): never => { throw new Error('fs.existsSync is not available in the browser') }
export const mkdirSync = (): never => { throw new Error('fs.mkdirSync is not available in the browser') }
export default {}
