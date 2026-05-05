import { describe, it, expect } from "vitest"
import { render, screen } from "@testing-library/react"
import { CartSummary } from "./cart-summary"

describe("CartSummary", () => {
  it("renders subtotal, tax, delivery, and total in EUR", () => {
    render(
      <CartSummary
        subtotal={20}
        tax={2}
        deliveryFee={3.5}
        total={25.5}
        taxRate={10}
      />,
    )

    expect(screen.getByText("Sous-total")).toBeInTheDocument()
    expect(screen.getByText("TVA (10%)")).toBeInTheDocument()
    expect(screen.getByText("Livraison")).toBeInTheDocument()
    expect(screen.getByText("Total")).toBeInTheDocument()
  })

  it("displays 'Offerte' when delivery fee is 0", () => {
    render(
      <CartSummary
        subtotal={20}
        tax={2}
        deliveryFee={0}
        total={22}
        taxRate={10}
      />,
    )

    expect(screen.getByText("Offerte")).toBeInTheDocument()
  })

  it("uses the provided taxRate in the label", () => {
    render(
      <CartSummary
        subtotal={20}
        tax={4}
        deliveryFee={0}
        total={24}
        taxRate={20}
      />,
    )

    expect(screen.getByText("TVA (20%)")).toBeInTheDocument()
  })
})
