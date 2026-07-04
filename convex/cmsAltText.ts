"use node"

import { action } from "./_generated/server"
import { v } from "convex/values"

export const generateAltText = action({
  args: {
    imageUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) throw new Error("Not authenticated")

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured")

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        temperature: 0.3,
        max_tokens: 100,
        messages: [
          {
            role: "system",
            content:
              "Describe this image concisely for use as alt text (accessibility). " +
              "Max 125 characters. Return only the description in the same language as any visible text, " +
              "or in French if no text is visible. No quotes, no formatting.",
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: args.imageUrl, detail: "low" },
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`OpenAI API error (${response.status}): ${err}`)
    }

    const data = await response.json()
    const altText = data.choices?.[0]?.message?.content?.trim() ?? ""

    return { altText }
  },
})
