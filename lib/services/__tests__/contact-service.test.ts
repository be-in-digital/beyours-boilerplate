import { describe, it, expect } from "vitest"
import { validateContactData, buildContactEmail } from "../contact-service"

describe("validateContactData", () => {
  it("rejects missing required fields with a French message", () => {
    expect(validateContactData({ name: "A" }).error).toBe(
      "Nom, email et message sont requis."
    )
    expect(validateContactData(null).error).toBeDefined()
  })

  it("rejects malformed emails", () => {
    expect(
      validateContactData({ name: "A", email: "pas-un-email", message: "hey" }).error
    ).toBe("Format d'email invalide")
  })

  it("returns typed data with topic defaulted", () => {
    const result = validateContactData({
      name: "Nadia",
      email: "nadia@example.com",
      message: "Bonjour",
    })
    expect(result.data).toEqual({
      name: "Nadia",
      email: "nadia@example.com",
      topic: "",
      message: "Bonjour",
    })
  })
})

describe("buildContactEmail", () => {
  it("escapes HTML in every user-provided field", () => {
    const email = buildContactEmail({
      name: "<script>x</script>",
      email: "a@b.fr",
      topic: 'Devis & "urgent"',
      message: "1 < 2",
    })
    expect(email.html).not.toContain("<script>")
    expect(email.html).toContain("&lt;script&gt;")
    expect(email.html).toContain("&amp;")
    expect(email.subject).toContain("&quot;urgent&quot;")
  })

  it("sets replyTo to the sender and falls back on topic", () => {
    const email = buildContactEmail({
      name: "A",
      email: "a@b.fr",
      topic: "",
      message: "m",
    })
    expect(email.replyTo).toBe("a@b.fr")
    expect(email.text).toContain("Non spécifié")
  })
})
