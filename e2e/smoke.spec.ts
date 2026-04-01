import { test, expect } from "@playwright/test"

test.describe("public marketing & auth shells", () => {
  test("home page loads", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveTitle(/Clars/i)
  })

  test("contact page loads", async ({ page }) => {
    await page.goto("/contact")
    await expect(page.getByRole("heading", { name: /contact us/i })).toBeVisible()
  })

  test("login page loads", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByText("Welcome back")).toBeVisible()
  })

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup")
    await expect(page.getByText("Create your account", { exact: true })).toBeVisible()
  })

  test("terms page loads", async ({ page }) => {
    await page.goto("/terms")
    await expect(page).toHaveTitle(/Terms/i)
  })

  test("privacy page loads", async ({ page }) => {
    await page.goto("/privacy")
    await expect(page).toHaveTitle(/Privacy/i)
  })

  test("forgot-password page loads", async ({ page }) => {
    await page.goto("/forgot-password")
    await expect(page.getByText("Forgot your password?")).toBeVisible()
  })
})

test.describe("protected CRM routes", () => {
  test("dashboard redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/dashboard")
    await expect(page).toHaveURL(/\/login/)
  })

  test("print invoice route redirects unauthenticated users to login", async ({
    page,
  }) => {
    await page.goto("/print/invoice/000000000000000000000000")
    await expect(page).toHaveURL(/\/login/)
  })
})
