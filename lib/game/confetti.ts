"use client"

/**
 * Canvas particle engine for celebration effects.
 *
 * Imperative API driven by the game screens: bind it to a full-screen canvas,
 * fire bursts/cannons/rain, it runs its own rAF loop and goes idle (zero cost)
 * when no particles are alive.
 */

type ParticleShape = "rect" | "circle" | "star"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  rotation: number
  rotationSpeed: number
  wobble: number
  wobbleSpeed: number
  color: string
  shape: ParticleShape
  life: number
  maxLife: number
  gravity: number
  drag: number
}

export const CELEBRATION_COLORS = [
  "#f97316", // brand orange
  "#fbbf24", // gold
  "#f43f5e", // rose
  "#a855f7", // purple
  "#22d3ee", // cyan
  "#4ade80", // green
  "#ffffff",
]

export const GOLD_COLORS = ["#fbbf24", "#f59e0b", "#fde68a", "#ffffff", "#f97316"]

interface BurstOptions {
  count?: number
  colors?: string[]
  speed?: number
  spread?: number
  angle?: number
  shapes?: ParticleShape[]
  gravity?: number
  sizeRange?: [number, number]
}

export class ParticleEngine {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null
  private particles: Particle[] = []
  private rafId: number | null = null
  private rainUntil = 0
  private rainColors: string[] = CELEBRATION_COLORS
  private lastFrame = 0
  private destroyed = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext("2d")
    this.resize()
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const { clientWidth, clientHeight } = this.canvas
    this.canvas.width = clientWidth * dpr
    this.canvas.height = clientHeight * dpr
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  private get width(): number {
    return this.canvas.clientWidth
  }

  private get height(): number {
    return this.canvas.clientHeight
  }

  private spawn(x: number, y: number, options: BurstOptions = {}): void {
    const {
      count = 40,
      colors = CELEBRATION_COLORS,
      speed = 9,
      spread = Math.PI * 2,
      angle = -Math.PI / 2,
      shapes = ["rect", "rect", "circle"],
      gravity = 0.25,
      sizeRange = [5, 11],
    } = options

    for (let i = 0; i < count; i++) {
      const direction = angle + (Math.random() - 0.5) * spread
      const velocity = speed * (0.4 + Math.random() * 0.8)
      const maxLife = 90 + Math.random() * 70
      this.particles.push({
        x,
        y,
        vx: Math.cos(direction) * velocity,
        vy: Math.sin(direction) * velocity,
        size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.35,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.08 + Math.random() * 0.12,
        color: colors[Math.floor(Math.random() * colors.length)] ?? "#ffffff",
        shape: shapes[Math.floor(Math.random() * shapes.length)] ?? "rect",
        life: 0,
        maxLife,
        gravity,
        drag: 0.985,
      })
    }
    this.start()
  }

  /** Radial explosion at a point (viewport coordinates of the canvas). */
  burst(x: number, y: number, options: BurstOptions = {}): void {
    this.spawn(x, y, options)
  }

  /** Two side cannons shooting toward the center — the "big win" opener. */
  cannons(colors: string[] = CELEBRATION_COLORS): void {
    const y = this.height * 0.75
    this.spawn(-10, y, {
      count: 70,
      colors,
      speed: 13,
      angle: -Math.PI / 3,
      spread: Math.PI / 5,
      gravity: 0.22,
    })
    this.spawn(this.width + 10, y, {
      count: 70,
      colors,
      speed: 13,
      angle: (-2 * Math.PI) / 3,
      spread: Math.PI / 5,
      gravity: 0.22,
    })
  }

  /** Confetti rain from the top for `ms` milliseconds. */
  rain(ms: number, colors: string[] = CELEBRATION_COLORS): void {
    this.rainUntil = performance.now() + ms
    this.rainColors = colors
    this.start()
  }

  /** Small golden sparkle poof (scratch feedback). */
  sparkle(x: number, y: number): void {
    this.spawn(x, y, {
      count: 6,
      colors: GOLD_COLORS,
      speed: 3.5,
      shapes: ["circle", "star"],
      gravity: 0.12,
      sizeRange: [2, 5],
    })
  }

  /** Foil shavings flying off a scratch stroke. */
  shavings(x: number, y: number, color = "#c0c4cc"): void {
    this.spawn(x, y, {
      count: 5,
      colors: [color, "#9aa0ab", "#e2e5ea"],
      speed: 2.6,
      angle: Math.PI / 2,
      spread: Math.PI / 1.5,
      shapes: ["rect"],
      gravity: 0.35,
      sizeRange: [2, 4],
    })
  }

  clear(): void {
    this.particles = []
    this.rainUntil = 0
  }

  destroy(): void {
    this.destroyed = true
    this.clear()
    if (this.rafId !== null) cancelAnimationFrame(this.rafId)
    this.rafId = null
  }

  private start(): void {
    if (this.rafId !== null || this.destroyed) return
    this.lastFrame = performance.now()
    const loop = (now: number) => {
      this.rafId = null
      if (this.destroyed) return
      const dt = Math.min((now - this.lastFrame) / 16.667, 3)
      this.lastFrame = now
      this.step(dt, now)
      this.draw()
      if (this.particles.length > 0 || now < this.rainUntil) {
        this.rafId = requestAnimationFrame(loop)
      } else if (this.ctx) {
        this.ctx.clearRect(0, 0, this.width, this.height)
      }
    }
    this.rafId = requestAnimationFrame(loop)
  }

  private step(dt: number, now: number): void {
    if (now < this.rainUntil && this.particles.length < 400) {
      for (let i = 0; i < 3; i++) {
        this.spawnRainParticle()
      }
    }
    const next: Particle[] = []
    for (const p of this.particles) {
      p.life += dt
      if (p.life >= p.maxLife) continue
      p.vy += p.gravity * dt
      p.vx *= Math.pow(p.drag, dt)
      p.vy *= Math.pow(p.drag, dt)
      p.wobble += p.wobbleSpeed * dt
      p.x += (p.vx + Math.sin(p.wobble) * 0.7) * dt
      p.y += p.vy * dt
      p.rotation += p.rotationSpeed * dt
      if (p.y < this.height + 30) next.push(p)
    }
    this.particles = next
  }

  private spawnRainParticle(): void {
    this.particles.push({
      x: Math.random() * this.width,
      y: -15,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 2 + Math.random() * 2.5,
      size: 5 + Math.random() * 7,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.06 + Math.random() * 0.1,
      color: this.rainColors[Math.floor(Math.random() * this.rainColors.length)] ?? "#ffffff",
      shape: Math.random() < 0.7 ? "rect" : "circle",
      life: 0,
      maxLife: 200,
      gravity: 0.04,
      drag: 0.999,
    })
  }

  private draw(): void {
    const ctx = this.ctx
    if (!ctx) return
    ctx.clearRect(0, 0, this.width, this.height)
    for (const p of this.particles) {
      const fade = 1 - Math.pow(p.life / p.maxLife, 3)
      ctx.save()
      ctx.globalAlpha = Math.max(0, fade)
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.fillStyle = p.color
      if (p.shape === "rect") {
        // Flutter: squash on the wobble axis fakes a 3D flip
        const squash = 0.35 + Math.abs(Math.sin(p.wobble)) * 0.65
        ctx.fillRect((-p.size / 2) * squash, -p.size / 2, p.size * squash, p.size * 0.62)
      } else if (p.shape === "circle") {
        ctx.beginPath()
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        this.drawStar(ctx, p.size / 2)
      }
      ctx.restore()
    }
  }

  private drawStar(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.beginPath()
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? radius : radius * 0.45
      const a = (i * Math.PI) / 5 - Math.PI / 2
      if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
    }
    ctx.closePath()
    ctx.fill()
  }
}
