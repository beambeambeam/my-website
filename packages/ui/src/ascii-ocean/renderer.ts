/**
 * Draws the World as a grid of ASCII cells: fish as one dash per cell that glints on hard turns,
 * then Siren and her mermaids as blocks on top.
 *
 * Adapted from ascii-sharks by drewdi (MIT, see LICENSE).
 */
import { clamp } from "./math";
import { FISH_ALPHAS } from "./palette";
import type { Palette } from "./palette";
import { SWIMMER_BLINK_INKS, SWIMMER_INKS, swimmerCells } from "./swimmer";
import type { Swimmer } from "./swimmer";
import type { World } from "./world";

const charAt = (set: string, index: number) => set[index % set.length] ?? " ";

export class AsciiRenderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly canvas: HTMLCanvasElement;
  private palette: Palette;
  private fontFamily = "ui-monospace, Menlo, monospace";
  private dpr = 1;
  private cw = 12;
  private ch = 18;
  private cols = 0;
  private rows = 0;

  /** Frame stamp of the cells that hold a fish, so each cell draws one fish. */
  private fishStamp = new Uint32Array(0);
  private frameId = 0;
  /** Fish cells by brightness, so each bucket is one fill style. */
  private readonly fishBuckets: number[][] = FISH_ALPHAS.map(() => []);

  constructor(canvas: HTMLCanvasElement, palette: Palette) {
    const ctx = canvas.getContext("2d");

    if (ctx === null) {
      throw new Error("2D canvas unavailable");
    }

    this.canvas = canvas;
    this.ctx = ctx;
    this.palette = palette;
  }

  get cellWidth() {
    return this.cw;
  }

  get cellHeight() {
    return this.ch;
  }

  setFontFamily(family: string) {
    if (family !== "") {
      this.fontFamily = family;
    }
  }

  setPalette(palette: Palette) {
    this.palette = palette;
  }

  resize(width: number, height: number, dpr: number) {
    const prevCols = this.cols;
    const prevRows = this.rows;

    this.dpr = dpr;
    this.cw = clamp(Math.round(width / 80), 8, 12);
    this.ch = Math.round(this.cw * 1.45);
    this.cols = Math.ceil(width / this.cw);
    this.rows = Math.ceil(height / this.ch);

    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);

    if (this.cols !== prevCols || this.rows !== prevRows) {
      this.fishStamp = new Uint32Array(this.cols * this.rows);
    }
  }

  render(world: World) {
    const { ctx, dpr, cols } = this;

    if (cols === 0) {
      return;
    }

    const t = world.time;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.markFish(world);

    ctx.font = `600 ${Math.round(this.ch * 0.74)}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    this.drawFish();

    for (const [index, swimmer] of world.swimmers.entries()) {
      this.drawSwimmer(swimmer, t + index * 1.7);
    }
  }

  private cellIndex(x: number, y: number) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);

    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) {
      return -1;
    }

    return r * this.cols + c;
  }

  // ── swimmers ────────────────────────────────────────────────────────

  /**
   * Draws a body one block per cell, on top of everything, with a blink now and then. Each swimmer
   * gets its own `t` offset, so they do not blink together.
   */
  private drawSwimmer(swimmer: Swimmer, t: number) {
    const { ctx, cw, ch } = this;
    const blinking = t % 4.6 < 0.16;
    const { col0, row0, rows } = swimmerCells(swimmer, cw, ch);

    for (const [r, line] of rows.entries()) {
      for (const [c, part] of line.split("").entries()) {
        const ink = (blinking ? SWIMMER_BLINK_INKS.get(part) : undefined) ?? SWIMMER_INKS.get(part);

        if (ink === undefined) {
          continue;
        }

        const col = col0 + c;
        const row = row0 + r;

        ctx.fillStyle = ink.fill;
        ctx.fillRect(col * cw, row * ch, cw, ch);

        if (ink.glyph !== undefined) {
          ctx.fillStyle = ink.ink ?? ink.fill;
          ctx.fillText(
            charAt(ink.glyph, Math.abs(col * 7 + row * 3)),
            col * cw + cw / 2,
            row * ch + ch / 2 + 1,
          );
        }
      }
    }
  }

  // ── fish ────────────────────────────────────────────────────────────

  /**
   * Snaps each fish to a cell and buckets it by brightness: far fish are dim, near fish are
   * brighter, and turning or panicking fish glint. Nearer fish claim a cell first.
   */
  private markFish(world: World) {
    const { fishStamp, fishBuckets } = this;

    this.frameId += 1;
    const frame = this.frameId;

    for (const bucket of fishBuckets) {
      bucket.length = 0;
    }

    for (const near of [true, false]) {
      for (const fish of world.fish) {
        if (fish.depth > 0.78 !== near) {
          continue;
        }

        const i = this.cellIndex(fish.x, fish.y);

        if (i < 0 || fishStamp[i] === frame) {
          continue;
        }

        fishStamp[i] = frame;
        const glint = clamp(Math.abs(fish.turn) / 3.5, 0, 1);
        const v = 0.3 + (0.4 * (fish.depth - 0.55)) / 0.45 + 0.3 * Math.max(glint, fish.alarm);
        const bucket = clamp(Math.floor(v * FISH_ALPHAS.length), 0, FISH_ALPHAS.length - 1);

        fishBuckets[bucket]?.push(i);
      }
    }
  }

  private drawFish() {
    const { ctx, cw, ch, cols, fishBuckets, palette } = this;

    for (const [b, bucket] of fishBuckets.entries()) {
      ctx.fillStyle = palette.fish[b] ?? palette.glint;

      for (const i of bucket) {
        ctx.fillText("-", (i % cols) * cw + cw / 2, Math.floor(i / cols) * ch + ch / 2 + 1);
      }
    }
  }
}
