const nextJest = require("next/jest")

const createJestConfig = nextJest({ dir: "./" })

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/", "/.next/"],
}

module.exports = createJestConfig(customConfig)
