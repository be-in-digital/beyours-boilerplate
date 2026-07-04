import type { Page } from "@playwright/test"

/**
 * Apply a search query using the SearchInput component by placeholder.
 */
export async function applySearch(
  page: Page,
  placeholder: string,
  query: string
) {
  const input = page.getByPlaceholder(placeholder)
  await input.fill(query)
}

/**
 * Clear a search input by placeholder.
 */
export async function clearSearch(page: Page, placeholder: string) {
  const input = page.getByPlaceholder(placeholder)
  await input.clear()
}

/**
 * Select a filter option using a shadcn Select component.
 * Identifies the select by its current text (placeholder or value).
 */
export async function selectFilter(
  page: Page,
  currentText: string,
  optionText: string
) {
  await page.getByRole("combobox").filter({ hasText: currentText }).click()
  await page.getByRole("option", { name: optionText }).click()
}

/**
 * Click the reset/clear filters button.
 */
export async function clearFilters(page: Page) {
  const resetButton = page.getByRole("button", { name: /[Rr]einitialiser/ })
  if (await resetButton.isVisible()) {
    await resetButton.click()
  }
}
