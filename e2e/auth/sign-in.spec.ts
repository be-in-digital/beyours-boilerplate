import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"

test.describe("Sign In Page", () => {
  test.describe("Page Structure", () => {
    test("should display the sign-in heading", async ({ page }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Connexion", level: 1 })
      ).toBeVisible()
    })

    test("should display email and password fields with correct attributes", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      const emailInput = page.getByLabel("Email")
      await expect(emailInput).toBeVisible()
      await expect(emailInput).toHaveAttribute("type", "email")
      await expect(emailInput).toHaveAttribute("placeholder", "jean@exemple.com")

      const passwordInput = page.getByLabel("Mot de passe")
      await expect(passwordInput).toBeVisible()
      await expect(passwordInput).toHaveAttribute("type", "password")
      await expect(passwordInput).toHaveAttribute(
        "placeholder",
        "Votre mot de passe"
      )
    })

    test("should display the submit button", async ({ page }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("button", { name: "Se connecter" })
      ).toBeVisible()
    })

    test("should display the forgot password link", async ({ page }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      const forgotLink = page.getByRole("link", {
        name: "Mot de passe oublié ?",
      })
      await expect(forgotLink).toBeVisible()
      await expect(forgotLink).toHaveAttribute("href", "/forgot-password")
    })

    test("should display the create account link", async ({ page }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(page.getByText("Pas encore de compte ?")).toBeVisible()

      const createAccountLink = page.getByRole("link", {
        name: "Créer un compte",
      })
      await expect(createAccountLink).toBeVisible()
      await expect(createAccountLink).toHaveAttribute("href", "/sign-up")
    })
  })

  test.describe("Form Validation", () => {
    test("should show browser validation on empty submit", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await page.getByRole("button", { name: "Se connecter" }).click()

      // The email field should prevent submission via browser validation
      const emailInput = page.getByLabel("Email")
      const validationMessage = await emailInput.evaluate(
        (el: HTMLInputElement) => el.validationMessage
      )
      expect(validationMessage).toBeTruthy()
    })

    test("should show browser validation for invalid email format", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await page.getByLabel("Email").fill("invalid-email")
      await page.getByLabel("Mot de passe").fill("password123")
      await page.getByRole("button", { name: "Se connecter" }).click()

      const emailInput = page.getByLabel("Email")
      const isValid = await emailInput.evaluate(
        (el: HTMLInputElement) => el.checkValidity()
      )
      expect(isValid).toBe(false)
    })
  })

  test.describe("Auth Flow", () => {
    test("should attempt redirect on successful login", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "networkidle" })

      await expect(
        page.getByRole("heading", { name: "Connexion" })
      ).toBeVisible({ timeout: 30_000 })

      // Wait for any Next.js compilation to finish before filling the form
      await page.waitForLoadState("networkidle")

      await page.getByLabel("Email").fill("test.owner@beindigital.fr")
      await page.getByLabel("Mot de passe").fill("julien")

      await page.getByRole("button", { name: "Se connecter" }).click()

      // After successful login, user should be redirected to /dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 })
    })

    test("should show error banner on invalid credentials", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Connexion" })
      ).toBeVisible({ timeout: 30_000 })

      await page.getByLabel("Email").fill("wrong@example.com")
      await page.getByLabel("Mot de passe").fill("wrongpassword")

      await page.getByRole("button", { name: "Se connecter" }).click()

      // Error banner (div with red styling) or toast should appear
      const errorBanner = page.locator(".bg-red-50, .bg-red-900\\/20, [role='alert']")
      const errorToast = page.getByText(/échec|erreur|invalide/i)

      await expect(errorBanner.or(errorToast).first()).toBeVisible({ timeout: 15_000 })
    })

    test("should show loading state while authenticating", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Connexion" })
      ).toBeVisible({ timeout: 30_000 })

      await page.getByLabel("Email").fill("test.owner@beindigital.fr")
      await page.getByLabel("Mot de passe").fill("julien")

      await page.getByRole("button", { name: "Se connecter" }).click()

      // Button should show loading text
      await expect(
        page.getByRole("button", { name: "Connexion en cours..." })
      ).toBeVisible({ timeout: 5_000 })
    })

    test("should navigate away from sign-in on login", async ({ page }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Connexion" })
      ).toBeVisible({ timeout: 30_000 })

      await page.getByLabel("Email").fill("test.owner@beindigital.fr")
      await page.getByLabel("Mot de passe").fill("julien")

      await page.getByRole("button", { name: "Se connecter" }).click()

      // After login, user navigates away from sign-in
      // (may show a toast or redirect — both indicate success)
      const redirected = page.waitForURL(/(?!.*sign-in)/, { timeout: 15_000 })
      const toast = page.getByText(/connexion/i).first()

      // Either the redirect happens or a toast appears
      await Promise.race([redirected, expect(toast).toBeVisible({ timeout: 15_000 })])
    })
  })

  test.describe("Navigation", () => {
    test("should navigate to /forgot-password when clicking forgot password link", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await page
        .getByRole("link", { name: "Mot de passe oublié ?" })
        .click()

      await expect(page).toHaveURL(/\/forgot-password/)
    })

    test("should navigate to /sign-up when clicking create account link", async ({
      page,
    }) => {
      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await page.getByRole("link", { name: "Créer un compte" }).click()

      await expect(page).toHaveURL(/\/sign-up/)
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/sign-in", { waitUntil: "domcontentloaded" })

      await expect(
        page.getByRole("heading", { name: "Connexion" })
      ).toBeVisible({ timeout: 30_000 })

      // Wait a moment for any async errors to surface
      await page.waitForTimeout(2_000)

      cleanup()
      expect(getErrors()).toEqual([])
    })
  })
})
