/**
 * Node 25+ exposes localStorage backed by --localstorage-file. Jest's node
 * environment clears globals on teardown and touches localStorage, which
 * warns if no valid backing file was set. Point at a temp file so tests stay quiet.
 */
import { spawnSync } from "node:child_process"
import { closeSync, openSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..")
const lsPath = join(tmpdir(), "clars-ai-jest-localstorage")
try {
  closeSync(openSync(lsPath, "a"))
} catch {
  /* ignore */
}
const jestBin = join(root, "node_modules/jest/bin/jest.js")
const args = [
  "--localstorage-file",
  lsPath,
  jestBin,
  ...process.argv.slice(2),
]
const r = spawnSync(process.execPath, args, {
  stdio: "inherit",
  cwd: root,
  env: process.env,
})
process.exit(r.status ?? 1)
