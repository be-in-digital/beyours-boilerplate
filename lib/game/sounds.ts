"use client"

/**
 * Synthesized game audio engine (Web Audio API).
 *
 * Every sound is generated in code — no audio assets to load, works offline,
 * and never 404s. The AudioContext must be unlocked from a user gesture
 * (iOS requirement): call `unlock()` in the first tap handler.
 */

type NoiseColor = "white" | "pink"

class GameAudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private muted = false
  private chargeOsc: OscillatorNode | null = null
  private chargeGain: GainNode | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.muted = window.localStorage.getItem("beid_game_muted") === "1"
    }
  }

  get isMuted(): boolean {
    return this.muted
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (typeof window !== "undefined") {
      window.localStorage.setItem("beid_game_muted", muted ? "1" : "0")
    }
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx.currentTime, 0.02)
    }
  }

  /** Must be called from a user gesture before any sound can play (iOS). */
  unlock(): void {
    if (typeof window === "undefined") return
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return
      this.ctx = new Ctor()
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : 0.9
      this.master.connect(this.ctx.destination)
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume()
    }
  }

  private get ready(): boolean {
    return this.ctx !== null && this.master !== null && this.ctx.state === "running"
  }

  private tone(params: {
    freq: number
    endFreq?: number
    type?: OscillatorType
    duration: number
    volume?: number
    delay?: number
    attack?: number
  }): void {
    if (!this.ready || !this.ctx || !this.master) return
    const t0 = this.ctx.currentTime + (params.delay ?? 0)
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.type = params.type ?? "sine"
    osc.frequency.setValueAtTime(params.freq, t0)
    if (params.endFreq !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, params.endFreq), t0 + params.duration)
    }
    const vol = params.volume ?? 0.5
    const attack = params.attack ?? 0.005
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(vol, t0 + attack)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + params.duration)
    osc.connect(gain)
    gain.connect(this.master)
    osc.start(t0)
    osc.stop(t0 + params.duration + 0.05)
  }

  private noiseBuffer(color: NoiseColor, seconds: number): AudioBuffer | null {
    if (!this.ctx) return null
    const rate = this.ctx.sampleRate
    const buffer = this.ctx.createBuffer(1, Math.ceil(rate * seconds), rate)
    const data = buffer.getChannelData(0)
    if (color === "white") {
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    } else {
      // Paul Kellet pink noise approximation
      let b0 = 0
      let b1 = 0
      let b2 = 0
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99765 * b0 + white * 0.099046
        b1 = 0.963 * b1 + white * 0.2965164
        b2 = 0.57 * b2 + white * 1.0526913
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25
      }
    }
    return buffer
  }

  private noise(params: {
    duration: number
    volume?: number
    color?: NoiseColor
    filterType?: BiquadFilterType
    filterFreq?: number
    filterEndFreq?: number
    q?: number
    delay?: number
  }): void {
    if (!this.ready || !this.ctx || !this.master) return
    const buffer = this.noiseBuffer(params.color ?? "white", params.duration + 0.1)
    if (!buffer) return
    const t0 = this.ctx.currentTime + (params.delay ?? 0)
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = params.filterType ?? "bandpass"
    filter.frequency.setValueAtTime(params.filterFreq ?? 1200, t0)
    if (params.filterEndFreq !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(1, params.filterEndFreq),
        t0 + params.duration
      )
    }
    filter.Q.value = params.q ?? 1
    const gain = this.ctx.createGain()
    const vol = params.volume ?? 0.4
    gain.gain.setValueAtTime(0, t0)
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + params.duration)
    src.connect(filter)
    filter.connect(gain)
    gain.connect(this.master)
    src.start(t0)
    src.stop(t0 + params.duration + 0.1)
  }

  /** Wheel peg tick — pitch rises slightly with wheel speed (0..1). */
  tick(speed = 0.5): void {
    this.tone({
      freq: 1600 + speed * 900,
      endFreq: 900,
      type: "square",
      duration: 0.035,
      volume: 0.12 + speed * 0.1,
    })
  }

  /** UI confirmation blip. */
  pop(): void {
    this.tone({ freq: 520, endFreq: 780, type: "sine", duration: 0.12, volume: 0.3 })
  }

  /** Action completed — small two-note chime. */
  chime(): void {
    this.tone({ freq: 880, type: "sine", duration: 0.15, volume: 0.25 })
    this.tone({ freq: 1318.5, type: "sine", duration: 0.3, volume: 0.22, delay: 0.09 })
  }

  /** Spin launch — airy whoosh. */
  whoosh(): void {
    this.noise({
      duration: 0.7,
      volume: 0.5,
      filterType: "bandpass",
      filterFreq: 300,
      filterEndFreq: 2600,
      q: 0.8,
    })
  }

  /** One scratch stroke — short filtered noise burst. */
  scratch(): void {
    this.noise({
      duration: 0.09,
      volume: 0.22,
      color: "pink",
      filterType: "bandpass",
      filterFreq: 2400 + Math.random() * 1600,
      q: 1.6,
    })
  }

  /** Suspense drumroll tick (call repeatedly during the final crawl). */
  suspense(): void {
    this.tone({ freq: 190, endFreq: 130, type: "triangle", duration: 0.05, volume: 0.16 })
  }

  /** Start the rising power-charge tone. Stop with `chargeEnd()`. */
  chargeStart(): void {
    if (!this.ready || !this.ctx || !this.master) return
    this.chargeEnd()
    const t0 = this.ctx.currentTime
    this.chargeOsc = this.ctx.createOscillator()
    this.chargeGain = this.ctx.createGain()
    this.chargeOsc.type = "sawtooth"
    this.chargeOsc.frequency.setValueAtTime(90, t0)
    this.chargeOsc.frequency.exponentialRampToValueAtTime(420, t0 + 2.2)
    this.chargeGain.gain.setValueAtTime(0, t0)
    this.chargeGain.gain.linearRampToValueAtTime(0.1, t0 + 0.15)
    this.chargeOsc.connect(this.chargeGain)
    this.chargeGain.connect(this.master)
    this.chargeOsc.start(t0)
  }

  chargeEnd(): void {
    if (this.chargeOsc && this.chargeGain && this.ctx) {
      const t = this.ctx.currentTime
      this.chargeGain.gain.setTargetAtTime(0, t, 0.03)
      this.chargeOsc.stop(t + 0.15)
    }
    this.chargeOsc = null
    this.chargeGain = null
  }

  /** Win fanfare — bright major arpeggio + shimmer. */
  fanfare(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      this.tone({ freq, type: "triangle", duration: 0.55, volume: 0.3, delay: i * 0.09 })
      this.tone({ freq: freq * 2, type: "sine", duration: 0.4, volume: 0.1, delay: i * 0.09 })
    })
    this.tone({ freq: 1568, type: "sine", duration: 1.1, volume: 0.14, delay: 0.4 })
    this.noise({
      duration: 0.8,
      volume: 0.1,
      filterType: "highpass",
      filterFreq: 6000,
      delay: 0.35,
    })
  }

  /** Lose — soft descending "womp", kept warm and short. */
  womp(): void {
    this.tone({ freq: 320, endFreq: 190, type: "triangle", duration: 0.35, volume: 0.25 })
    this.tone({
      freq: 240,
      endFreq: 140,
      type: "triangle",
      duration: 0.5,
      volume: 0.2,
      delay: 0.18,
    })
  }

  /** Prize reveal shine sweep. */
  reveal(): void {
    this.tone({ freq: 700, endFreq: 2100, type: "sine", duration: 0.45, volume: 0.2 })
    this.noise({
      duration: 0.5,
      volume: 0.08,
      filterType: "highpass",
      filterFreq: 5000,
    })
  }
}

/** Shared singleton — screens import this directly. */
export const gameSounds = new GameAudioEngine()
