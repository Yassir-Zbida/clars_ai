/**
 * Node 25+ exposes localStorage backed by --localstorage-file. Jest's node
 * environment clears globals on teardown and touches localStorage, which
 * warns if no valid backing file was set. Only pass the flag when Node supports
 * it (GitHub Actions uses Node 20, which rejects unknown flags).
 */
import { spawnSync } from "node:child_process"
import { closeSync, openSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { fileURLToPath } from "node:url"

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..")
const jestBin = join(root, "node_modules/jest/bin/jest.js")
const jestArgs = process.argv.slice(2)

const nodeMajor = Number(process.versions.node.split(".")[0])
let execArgs

if (nodeMajor >= 25) {
  const lsPath = join(tmpdir(), "clars-ai-jest-localstorage")
  try {
    closeSync(openSync(lsPath, "a"))
  } catch {
    /* ignore */
  }
  execArgs = ["--localstorage-file", lsPath, jestBin, ...jestArgs]
} else {
  execArgs = [jestBin, ...jestArgs]
}

const r = spawnSync(process.execPath, execArgs, {
  stdio: "inherit",
  cwd: root,
  env: process.env,
})
process.exit(r.status ?? 1)
