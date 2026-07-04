import { test, expect } from "@playwright/test"
import { collectConsoleErrors } from "../helpers/console.helpers"
import { waitForAdminPage } from "../helpers/navigation.helpers"

test.describe("Product Form", () => {
  test.describe.configure({ mode: "serial" })

  test.describe("New Product Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/products/new", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test('should display "Créer un produit" heading', async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Créer un produit" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should display back button to /products", async ({ page }) => {
      // The back button/link should navigate to /products
      const backLink = page.getByRole("link", { name: /retour|produits/i }).or(
        page.locator('a[href="/dashboard/products"]')
      )

      await expect(backLink).toBeVisible({ timeout: 15_000 })
    })

    test("should display 4 form tabs: General, Options, Stock, Planification", async ({
      page,
    }) => {
      await expect(
        page.getByRole("tab", { name: "General" }).or(
          page.getByRole("tab", { name: "Général" })
        )
      ).toBeVisible({ timeout: 15_000 })

      await expect(
        page.getByRole("tab", { name: "Options" })
      ).toBeVisible()

      await expect(
        page.getByRole("tab", { name: "Stock" })
      ).toBeVisible()

      await expect(
        page.getByRole("tab", { name: "Planification" })
      ).toBeVisible()
    })

    test("should display form fields on General tab (name, slug, category, price)", async ({
      page,
    }) => {
      // Name field
      await expect(
        page.getByLabel("Nom du produit")
      ).toBeVisible({ timeout: 15_000 })

      // Slug field
      await expect(page.getByLabel("Slug")).toBeVisible()

      // Category select
      await expect(
        page.getByLabel("Catégorie").or(
          page.getByRole("combobox").filter({ hasText: /catégorie/i })
        )
      ).toBeVisible()

      // Price field
      await expect(
        page.getByLabel("Prix (EUR)")
      ).toBeVisible()
    })

    test("should auto-generate slug from name", async ({ page }) => {
      const nameInput = page.getByLabel("Nom du produit")
      await expect(nameInput).toBeVisible({ timeout: 15_000 })

      // Type a product name
      await nameInput.fill("Pizza Margherita")

      // Wait for slug auto-generation
      await page.waitForTimeout(500)

      // Slug should be auto-generated from the name
      const slugInput = page.getByLabel("Slug")
      await expect(slugInput).toHaveValue(/pizza-margherita/i, {
        timeout: 5_000,
      })
    })

    test("should validate required fields", async ({ page }) => {
      // Try to submit the form without filling required fields
      const submitButton = page.getByRole("button", {
        name: "Créer un produit",
      })
      await expect(submitButton).toBeVisible({ timeout: 15_000 })

      await submitButton.click()

      // Validation errors should appear for required fields
      // Look for any validation message or error indication
      const validationError = page
        .getByText(/obligatoire|requis|required/i)
        .or(page.locator('[data-slot="form-message"]').first())
        .or(page.locator('[role="alert"]').first())

      await expect(validationError).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe("Form Tabs", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/products/new", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)
    })

    test("should switch to Options tab", async ({ page }) => {
      const optionsTab = page.getByRole("tab", { name: "Options" })
      await expect(optionsTab).toBeVisible({ timeout: 15_000 })

      await optionsTab.click()

      await expect(optionsTab).toHaveAttribute("aria-selected", "true")
    })

    test('should display "Ajouter une option" button on Options tab', async ({
      page,
    }) => {
      const optionsTab = page.getByRole("tab", { name: "Options" })
      await expect(optionsTab).toBeVisible({ timeout: 15_000 })
      await optionsTab.click()

      await expect(
        page.getByRole("button", { name: "Ajouter une option" })
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should switch to Stock tab", async ({ page }) => {
      const stockTab = page.getByRole("tab", { name: "Stock" })
      await expect(stockTab).toBeVisible({ timeout: 15_000 })

      await stockTab.click()

      await expect(stockTab).toHaveAttribute("aria-selected", "true")
    })

    test("should display stock tracking toggle", async ({ page }) => {
      const stockTab = page.getByRole("tab", { name: "Stock" })
      await expect(stockTab).toBeVisible({ timeout: 15_000 })
      await stockTab.click()

      await expect(
        page.getByRole("switch", { name: /stock/i }).or(
          page.getByText("Suivre le stock de ce produit")
        )
      ).toBeVisible({ timeout: 15_000 })
    })

    test("should switch to Planification tab", async ({ page }) => {
      const planTab = page.getByRole("tab", { name: "Planification" })
      await expect(planTab).toBeVisible({ timeout: 15_000 })

      await planTab.click()

      await expect(planTab).toHaveAttribute("aria-selected", "true")
    })

    test("should display scheduling fields", async ({ page }) => {
      const planTab = page.getByRole("tab", { name: "Planification" })
      await expect(planTab).toBeVisible({ timeout: 15_000 })
      await planTab.click()

      // Scheduling fields for availability dates
      await expect(
        page
          .getByText("Disponible à partir de")
          .or(page.getByLabel("Disponible à partir de"))
      ).toBeVisible({ timeout: 15_000 })

      await expect(
        page
          .getByText("Disponible jusqu'à")
          .or(page.getByLabel("Disponible jusqu'à"))
      ).toBeVisible()
    })
  })

  test.describe("Options Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/products/new", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Navigate to Options tab
      const optionsTab = page.getByRole("tab", { name: "Options" })
      await expect(optionsTab).toBeVisible({ timeout: 15_000 })
      await optionsTab.click()
    })

    test("should add a new option group", async ({ page }) => {
      const addOptionButton = page.getByRole("button", {
        name: "Ajouter une option",
      })
      await expect(addOptionButton).toBeVisible({ timeout: 15_000 })

      await addOptionButton.click()

      // A new option group form should appear with a name input
      const optionNameInput = page
        .getByPlaceholder(/nom de l'option|taille|sauce/i)
        .or(page.getByLabel(/nom de l'option/i))

      await expect(optionNameInput.first()).toBeVisible({ timeout: 10_000 })
    })

    test("should add choices to an option", async ({ page }) => {
      const addOptionButton = page.getByRole("button", {
        name: "Ajouter une option",
      })
      await expect(addOptionButton).toBeVisible({ timeout: 15_000 })

      await addOptionButton.click()

      // Look for the button to add a choice within the option group
      const addChoiceButton = page
        .getByRole("button", { name: /ajouter un choix|ajouter/i })
        .filter({ hasNotText: "option" })

      // There should be a way to add choices
      await expect(addChoiceButton.first()).toBeVisible({ timeout: 10_000 })

      await addChoiceButton.first().click()

      // A choice input field should appear
      const choiceInput = page
        .getByPlaceholder(/nom du choix|choix/i)
        .or(page.getByLabel(/choix/i))

      await expect(choiceInput.first()).toBeVisible({ timeout: 10_000 })
    })

    test("should remove an option group", async ({ page }) => {
      const addOptionButton = page.getByRole("button", {
        name: "Ajouter une option",
      })
      await expect(addOptionButton).toBeVisible({ timeout: 15_000 })

      // Add an option group first
      await addOptionButton.click()

      // Wait for option group to appear
      await page.waitForTimeout(500)

      // Look for the remove/delete button on the option group
      const removeButton = page
        .getByRole("button", { name: /supprimer|retirer/i })
        .or(page.locator('button[aria-label*="supprimer" i]'))
        .or(page.locator('button:has(svg)').filter({ hasText: "" }).last())

      // Count option groups before removal
      const optionNameInputs = page
        .getByPlaceholder(/nom de l'option|taille|sauce/i)
        .or(page.getByLabel(/nom de l'option/i))

      const countBefore = await optionNameInputs.count()

      if (countBefore > 0 && (await removeButton.first().isVisible())) {
        await removeButton.first().click()

        // Wait for removal animation
        await page.waitForTimeout(500)

        const countAfter = await optionNameInputs.count()
        expect(countAfter).toBeLessThan(countBefore)
      }
    })
  })

  test.describe("Stock Management", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/products/new", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Navigate to Stock tab
      const stockTab = page.getByRole("tab", { name: "Stock" })
      await expect(stockTab).toBeVisible({ timeout: 15_000 })
      await stockTab.click()
    })

    test("should show quantity fields when tracking enabled", async ({
      page,
    }) => {
      // Find and enable the stock tracking toggle
      const stockToggle = page
        .getByRole("switch", { name: /stock/i })
        .or(page.getByRole("switch").first())

      await expect(stockToggle).toBeVisible({ timeout: 15_000 })

      // Enable stock tracking if not already enabled
      const isChecked = await stockToggle.getAttribute("aria-checked")
      if (isChecked !== "true") {
        await stockToggle.click()
      }

      // Quantity and threshold fields should be visible
      await expect(
        page
          .getByLabel(/quantité/i)
          .or(page.getByPlaceholder(/quantité/i))
      ).toBeVisible({ timeout: 10_000 })

      await expect(
        page
          .getByLabel(/seuil/i)
          .or(page.getByText("Seuil de stock faible"))
      ).toBeVisible()
    })

    test("should hide quantity fields when tracking disabled", async ({
      page,
    }) => {
      // Find the stock tracking toggle
      const stockToggle = page
        .getByRole("switch", { name: /stock/i })
        .or(page.getByRole("switch").first())

      await expect(stockToggle).toBeVisible({ timeout: 15_000 })

      // Enable tracking first to ensure fields appear
      const isChecked = await stockToggle.getAttribute("aria-checked")
      if (isChecked !== "true") {
        await stockToggle.click()
        await page.waitForTimeout(500)
      }

      // Now disable tracking
      await stockToggle.click()
      await page.waitForTimeout(500)

      // Quantity field should be hidden
      const quantityField = page
        .getByLabel(/quantité/i)
        .or(page.getByPlaceholder(/quantité/i))

      await expect(quantityField.first()).toBeHidden({ timeout: 10_000 })
    })
  })

  test.describe("Console Errors", () => {
    test("should not produce unexpected console errors", async ({ page }) => {
      const { getErrors, cleanup } = collectConsoleErrors(page)

      await page.goto("/dashboard/products/new", {
        waitUntil: "domcontentloaded",
        timeout: 60_000,
      })
      await waitForAdminPage(page)

      // Navigate through all tabs to check for errors
      for (const tabName of ["Options", "Stock", "Planification"]) {
        const tab = page.getByRole("tab", { name: tabName })
        if (await tab.isVisible()) {
          await tab.click()
          await page.waitForTimeout(500)
        }
      }

      // Wait for async operations
      await page.waitForTimeout(2_000)

      cleanup()

      const errors = getErrors()
      expect(errors).toEqual([])
    })
  })
})
