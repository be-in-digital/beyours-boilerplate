// @vitest-environment jsdom
/// <reference types="vite/client" />

/**
 * The checkout never lands a diner on a payment tile the deployment cannot
 * serve (#374).
 *
 * The form used to hardcode card as the `useState` default with a second
 * inline fallback that also resolved to card. On a fresh deployment — cash
 * enabled, no card provider keyed — every card submit failed, so the natural
 * first journey was a failed card attempt retried as cash, which is the
 * method-switch deadlock. The rule now comes from `resolvePaymentMethod`
 * fed by the server's `paymentAvailability.get`; this test pins the WIRING —
 * that the rendered form actually consults the availability answer — the
 * rule itself is pinned in `@be-in-digital/restaurant`'s own suite.
 */

import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Answers the two queries the form makes; set per test. */
const state = vi.hoisted(() => ({
  settings: undefined as unknown,
  availability: undefined as unknown,
}))

vi.mock("convex/react", async () => {
  const { getFunctionName } = await import("convex/server")
  return {
    useQuery: (ref: unknown) => {
      const name = getFunctionName(ref as never)
      if (name === "paymentAvailability:get") return state.availability
      if (name === "globalSettings:get") return state.settings
      return undefined
    },
  }
})

vi.mock("@/hooks/useGooglePlacesAutocomplete", () => ({
  useGooglePlacesAutocomplete: () => ({ inputRef: { current: null } }),
}))

const ALL_SERVICES = {
  dineIn: true,
  takeaway: true,
  delivery: true,
  clickAndCollect: true,
}

const mounted: Array<{ root: Root; container: HTMLElement }> = []

beforeEach(() => {
  state.settings = undefined
  state.availability = undefined
})

afterEach(async () => {
  for (const { root, container } of mounted.splice(0)) {
    await act(async () => {
      root.unmount()
    })
    container.remove()
  }
})

async function mountCheckoutForm(options: { isAuthenticated: boolean }) {
  const { CheckoutForm } = await import("@/components/storefront/checkout-form")
  const { useCartStore } = await import("@be-in-digital/restaurant")
  act(() => {
    useCartStore.getState().setOrderType("pickup")
  })
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  mounted.push({ root, container })
  await act(async () => {
    root.render(
      <CheckoutForm
        onSubmit={() => {}}
        isSubmitting={false}
        addresses={[]}
        isAuthenticated={options.isAuthenticated}
        services={ALL_SERVICES}
      />
    )
  })
  return container
}

function buttonByText(container: HTMLElement, text: string): HTMLButtonElement | null {
  for (const button of Array.from(container.querySelectorAll("button"))) {
    if (button.textContent?.includes(text)) return button
  }
  return null
}

function submitButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('button[type="submit"]')
  if (!button) throw new Error("no submit button rendered")
  return button as HTMLButtonElement
}

describe("payment tile pre-selection", () => {
  test("a deployment that can take a card keeps the card-first default", async () => {
    state.settings = {
      payments: { cardProvider: "stripe", paypal: false, cash: true },
    }
    state.availability = { card: true }

    const container = await mountCheckoutForm({ isAuthenticated: true })

    expect(submitButton(container).textContent).toContain("Payer par carte")
    expect(buttonByText(container, "Carte bancaire")?.disabled).toBe(false)
  })

  test("a fresh deployment — cash on, no card provider — lands the diner on Espèces", async () => {
    state.settings = {
      payments: { cardProvider: "stripe", paypal: false, cash: true },
    }
    state.availability = { card: false }

    const container = await mountCheckoutForm({ isAuthenticated: true })

    // Card is visible but not servable: disabled, and says why.
    const card = buttonByText(container, "Carte bancaire")
    expect(card?.disabled).toBe(true)
    expect(card?.textContent).toContain("Indisponible pour le moment")

    // The effective method is the tile that works: submit reads as cash.
    expect(submitButton(container).textContent).toContain("Confirmer la commande")
  })

  test("no servable method disables submit instead of sending a doomed card attempt", async () => {
    // Card dead, cash present but the diner is not signed in — submitting
    // card anyway is exactly the #374 journey.
    state.settings = {
      payments: { cardProvider: "stripe", paypal: false, cash: true },
    }
    state.availability = { card: false }

    const container = await mountCheckoutForm({ isAuthenticated: false })

    const submit = submitButton(container)
    expect(submit.disabled).toBe(true)
    expect(submit.textContent).toContain("Choisissez un moyen de paiement")
  })
})
