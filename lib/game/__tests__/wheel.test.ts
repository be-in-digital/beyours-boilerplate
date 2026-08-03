import { describe, it, expect } from "vitest"
import {
  buildWheelSegments,
  pickTargetSegment,
  finalRotationForSegment,
  segmentAtPointer,
  wheelEase,
} from "../wheel"
import type { GamePrize } from "../types"
import type { Id } from "@/convex/_generated/dataModel"

const prize = (id: string, name: string): GamePrize => ({
  id: id as Id<"prizes">,
  name,
  type: "free_product",
  validityDays: 7,
})

describe("buildWheelSegments", () => {
  it("interleaves prizes with lose slots on 8 segments", () => {
    const segments = buildWheelSegments([prize("p1", "Café"), prize("p2", "Dessert")])
    expect(segments).toHaveLength(8)
    expect(segments.filter((s) => s.isWinning)).toHaveLength(4)
    // Alternating pattern: even = prize, odd = lose
    segments.forEach((segment, i) => {
      expect(segment.isWinning).toBe(i % 2 === 0)
    })
    // Both prizes are represented
    const prizeIds = new Set(segments.filter((s) => s.prizeId).map((s) => s.prizeId))
    expect(prizeIds).toEqual(new Set(["p1", "p2"]))
  })

  it("builds an all-lose wheel without prizes", () => {
    const segments = buildWheelSegments([])
    expect(segments).toHaveLength(8)
    expect(segments.every((s) => !s.isWinning)).toBe(true)
  })

  it("prefers admin-configured sections when present", () => {
    const segments = buildWheelSegments([], [
      { label: "10%", color: "#ff0000", isWinning: true },
      { label: "Perdu", color: "#333333" },
    ])
    expect(segments).toHaveLength(2)
    expect(segments[0]?.isWinning).toBe(true)
    expect(segments[1]?.isWinning).toBe(false)
  })
})

describe("pickTargetSegment", () => {
  const segments = buildWheelSegments([prize("p1", "Café"), prize("p2", "Dessert")])

  it("lands on the exact prize segment on a win", () => {
    for (let i = 0; i < 20; i++) {
      const index = pickTargetSegment(segments, true, "p2" as Id<"prizes">)
      expect(segments[index]?.prizeId).toBe("p2")
    }
  })

  it("lands on a losing segment on a lose", () => {
    for (let i = 0; i < 20; i++) {
      const index = pickTargetSegment(segments, false, null)
      expect(segments[index]?.isWinning).toBe(false)
    }
  })

  it("prefers near-miss losing segments (adjacent to a win)", () => {
    // On the interleaved wheel every lose slot is adjacent to a win — build a
    // custom layout where only one lose slot borders a win.
    const custom = [
      { label: "win", color: "#f00", textColor: "#fff", isWinning: true },
      { label: "lose-near", color: "#111", textColor: "#fff", isWinning: false },
      { label: "lose-far", color: "#111", textColor: "#fff", isWinning: false },
      { label: "lose-far-2", color: "#111", textColor: "#fff", isWinning: false },
    ]
    // lose-near (1) and lose-far-2 (3) are adjacent to the win (0, wrap-around)
    for (let i = 0; i < 20; i++) {
      const index = pickTargetSegment(custom, false, null)
      expect([1, 3]).toContain(index)
    }
  })
})

describe("finalRotationForSegment + segmentAtPointer round-trip", () => {
  it("always lands the requested segment under the pointer", () => {
    const count = 8
    for (let target = 0; target < count; target++) {
      for (let run = 0; run < 10; run++) {
        const rotation = finalRotationForSegment(target, count)
        expect(segmentAtPointer(rotation, count)).toBe(target)
      }
    }
  })

  it("adds at least the requested full turns", () => {
    const rotation = finalRotationForSegment(3, 8, { turns: 6, random: () => 0.5 })
    expect(rotation).toBeGreaterThanOrEqual(6 * Math.PI * 2)
  })
})

describe("wheelEase", () => {
  it("is monotonic from 0 to 1", () => {
    let previous = -1
    for (let t = 0; t <= 1.0001; t += 0.01) {
      const value = wheelEase(t)
      expect(value).toBeGreaterThanOrEqual(previous)
      previous = value
    }
    expect(wheelEase(0)).toBe(0)
    expect(wheelEase(1)).toBeCloseTo(1)
  })

  it("spends the last 20% of time on the final 1% of travel (suspense tail)", () => {
    expect(wheelEase(0.8)).toBeGreaterThan(0.99)
  })
})
