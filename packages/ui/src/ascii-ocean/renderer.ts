/**
 * Draws the World as a grid of ASCII cells:
 *
 * 1. Fish as one dash per cell, glinting on hard turns
 * 2. A flash of Dia colors where a shark bites
 * 3. Sharks drawn cell by cell with supersampled edges: blocks shaded by the light, glyphs on the
 *    shadow side, a soft glyph outline, and Dia accents that shimmer across the skin
 *
 * Adapted from ascii-sharks by drewdi (MIT, see LICENSE).
 */
import { ANATOMY, SHARK_KINDS } from "./anatomy";
import type { SharkAnatomy } from "./anatomy";
import { clamp, hash3 } from "./math";
import { FISH_ALPHAS, HEAT_LEVELS, SKIN_LEVELS } from "./palette";
import type { Palette } from "./palette";
import { SWIMMER_BLINK_INKS, SWIMMER_INKS, swimmerCells } from "./swimmer";
import type { Swimmer } from "./swimmer";
import { nodeX, nodeY, SHARK_NODES } from "./world";
import type { Shark, World } from "./world";

// Sparse glyphs on lit shadow and dense glyphs in deep shadow.
const SHADOW_RAMP = ":;t%SX8#@";
const FIN_GLYPHS = "%;tS:";
const EDGE_HEAVY = ":;";
const EDGE_LIGHT = ".',`";

/** Body cells darker than this get a glyph. Lighter cells stay plain blocks. */
const SHADOW_SHADE = 0.45;

const FLAG_BODY = 1;
const FLAG_EDGE = 2;
const FLAG_FIN = 3;
const FLAG_RIDGE = 4;
const FLAG_EYE = 5;

/** Dark skin markings: tiger bars and zebra spots. */
const FLAG_MARK = 6;

/** Sub-cell sample offsets for smooth silhouettes. */
const SUBSAMPLES = [0.25, 0.3, 0.75, 0.3, 0.25, 0.72, 0.75, 0.72];

const charAt = (set: string, index: number) => set[index % set.length] ?? " ";

/** Glyph of a body or fin cell in shadow, denser where the shadow is deeper. */
const shadowGlyph = (flag: number, shade: number, key: number) => {
  if (flag === FLAG_FIN) {
    return charAt(FIN_GLYPHS, Math.floor(key / 256));
  }

  const depth = 1 - shade / SHADOW_SHADE;
  const jitter = (Math.floor(key / 16) % 3) - 1;

  return charAt(SHADOW_RAMP, clamp(Math.floor(depth * 8.99) + jitter, 0, SHADOW_RAMP.length - 1));
};

/** Skin brightness of a body cell, 0–255, before depth dimming. */
const cellLevel = (flag: number, shade: number) => {
  switch (flag) {
    case FLAG_RIDGE: {
      return 226;
    }

    case FLAG_EYE: {
      return 12;
    }

    case FLAG_MARK: {
      return 24 + shade * 22;
    }

    case FLAG_FIN: {
      return 40 + shade * 120;
    }

    default: {
      return 46 + shade * 160;
    }
  }
};

const inTriangle = (
  px: number,
  py: number,
  [ax, ay, bx, by, cx, cy]: readonly [number, number, number, number, number, number],
) => {
  const d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  const d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  const d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);

  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};

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

  private heat = new Float32Array(0);

  private sharkFlag = new Uint8Array(0);
  private sharkShade = new Float32Array(0);
  private sharkKey = new Uint32Array(0);
  private sharkDepth = new Float32Array(0);
  private sharkKind = new Uint8Array(0);

  /** Render spine of the current shark: the sim spine plus the body wave. */
  private readonly spine = new Float32Array(SHARK_NODES * 2);
  private readonly arc = new Float32Array(SHARK_NODES);
  private arcTotal = 1;
  private anatomy: SharkAnatomy = ANATOMY.classic;
  private sharkId = 0;
  private finTipLeft = 0;
  private finTipRight = 0;
  // Outputs of sampleShark(), kept as fields to avoid an allocation per sample.
  private hitFlag = 0;
  private hitShade = 0;
  private hitS = 0;
  private hitV = 0;
  private hitDist = 0;

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
      const n = this.cols * this.rows;

      this.heat = new Float32Array(n);
      this.sharkFlag = new Uint8Array(n);
      this.sharkShade = new Float32Array(n);
      this.sharkKey = new Uint32Array(n);
      this.sharkDepth = new Float32Array(n);
      this.sharkKind = new Uint8Array(n);
      this.fishStamp = new Uint32Array(n);
    }
  }

  render(world: World, dt: number) {
    const { ctx, dpr, cols } = this;

    if (cols === 0) {
      return;
    }

    const t = world.time;

    this.consumeEvents(world);
    this.rasterizeSharks(world.sharks, t);
    this.decayHeat(dt);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.markFish(world);

    ctx.font = `600 ${Math.round(this.ch * 0.74)}px ${this.fontFamily}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    this.drawHeat();
    this.drawFish();
    this.drawSharks(t);

    for (const [index, swimmer] of world.swimmers.entries()) {
      this.drawSwimmer(swimmer, t + index * 1.7);
    }
  }

  // ── sim → fields ────────────────────────────────────────────────────

  private cellIndex(x: number, y: number) {
    const c = Math.floor(x / this.cw);
    const r = Math.floor(y / this.ch);

    if (c < 0 || r < 0 || c >= this.cols || r >= this.rows) {
      return -1;
    }

    return r * this.cols + c;
  }

  private stamp(field: Float32Array, x: number, y: number, radius: number, amount: number) {
    const c0 = Math.floor(x / this.cw);
    const r0 = Math.floor(y / this.ch);

    for (let r = Math.max(0, r0 - radius); r <= Math.min(this.rows - 1, r0 + radius); r += 1) {
      for (let c = Math.max(0, c0 - radius); c <= Math.min(this.cols - 1, c0 + radius); c += 1) {
        const d = Math.hypot(c - c0, (r - r0) * 1.4);

        if (d <= radius + 0.5) {
          const i = r * this.cols + c;

          field[i] = Math.min(1.6, (field[i] ?? 0) + amount * (1 - d / (radius + 1)));
        }
      }
    }
  }

  private consumeEvents(world: World) {
    for (const event of world.events) {
      if (event.kind === "eat") {
        this.stamp(this.heat, event.x, event.y, 2, 1);
      }
    }

    world.events.length = 0;
  }

  private decayHeat(dt: number) {
    const { heat } = this;
    const decay = Math.exp(-dt * 2.2);

    for (let i = 0; i < heat.length; i += 1) {
      heat[i] = (heat[i] ?? 0) * decay;
    }
  }

  // ── sharks ──────────────────────────────────────────────────────────

  /**
   * Classifies one point against the current shark (spine and arc already built). Body coordinates:
   * `s` along the spine (0 snout to 1 tail) and `v` across it. Writes the hit* fields and returns
   * whether the point is on the shark.
   */
  // oxlint-disable-next-line max-statements, complexity -- One pass per sample keeps the inner loop flat.
  private sampleShark(px: number, py: number, L: number) {
    const { spine, arc, anatomy } = this;
    let best = Infinity;
    let bestS = 0;
    let bestSign = 1;
    let bestNx = 0;
    let bestNy = 0;

    for (let k = 0; k < SHARK_NODES - 1; k += 1) {
      const ax = spine[k * 2] ?? 0;
      const ay = spine[k * 2 + 1] ?? 0;
      const sx = (spine[(k + 1) * 2] ?? 0) - ax;
      const sy = (spine[(k + 1) * 2 + 1] ?? 0) - ay;
      const len2 = sx * sx + sy * sy || 1;
      const u = clamp(((px - ax) * sx + (py - ay) * sy) / len2, 0, 1);
      const d2 = (px - (ax + sx * u)) ** 2 + (py - (ay + sy * u)) ** 2;

      if (d2 < best) {
        best = d2;
        const len = Math.sqrt(len2);

        bestS = ((arc[k] ?? 0) + u * len) / this.arcTotal;
        bestSign = sx * (py - ay) - sy * (px - ax) >= 0 ? 1 : -1;
        bestNx = (-sy / len) * bestSign;
        bestNy = (sx / len) * bestSign;
      }
    }

    const a = Math.sqrt(best);
    const s = bestS;
    const u = s * L;
    const w = anatomy.halfWidth(s) * L;

    this.hitDist = a;
    this.hitS = s;
    this.hitV = a * bestSign;

    const { head } = anatomy;

    if (head !== undefined && u < L * (head.sweep + head.depth + head.notch)) {
      // Cephalofoil: a wide wing across the snout, its tips swept back toward the eyes, and on a
      // great hammerhead a shallow notch in the middle of the front edge.
      const r = a / (L * head.span);
      const front = L * head.sweep * r * r + L * head.notch * Math.max(0, 1 - r / 0.14);
      // Full depth almost to the tips, so the wing reads as a solid bar and not a thin line.
      const depth = L * head.depth * (1 - 0.2 * r ** 4);

      if (r <= 1 && u >= front && u <= front + depth) {
        this.hitFlag = r > 0.84 ? FLAG_EYE : FLAG_BODY;
        this.hitShade = r > 0.84 ? 0 : 0.62 - 0.2 * r + (u < front + L * 0.012 ? 0.1 : 0);

        return true;
      }
    }

    if (a <= w) {
      const across = a / (w || 1);
      // A rounded back lit from the top left. The flanks fall off into shadow.
      const facing = (bestNx * -0.6 + bestNy * -0.8) * across;
      let shade = 0.58 - across * across * 0.42 + facing * 0.26;
      let flag = FLAG_BODY;

      if (s > anatomy.dorsal[0] && s < anatomy.dorsal[1] && across < 0.3) {
        // First dorsal fin, in the light.
        flag = FLAG_RIDGE;
        shade = 1;
      } else if (s > anatomy.secondDorsal[0] && s < anatomy.secondDorsal[1] && across < 0.4) {
        shade = Math.max(shade, 0.82);
      } else if (anatomy.eye !== null && s > anatomy.eye[0] && s < anatomy.eye[1] && across > 0.6) {
        flag = FLAG_EYE;
        shade = 0;
      } else if (s > anatomy.gills[0] && s < anatomy.gills[1] && across > 0.58) {
        // Five gill slits.
        const slit = Math.floor(
          ((s - anatomy.gills[0]) / (anatomy.gills[1] - anatomy.gills[0])) * 5,
        );

        shade *= slit % 2 === 0 ? 0.45 : 1;
      } else if (s < 0.05) {
        // Pale snout tip.
        shade = Math.max(shade, 0.7);
      } else if (
        anatomy.ridges === true &&
        s > 0.08 &&
        s < 0.55 &&
        (across < 0.1 || Math.abs(across - 0.6) < 0.08)
      ) {
        shade = Math.max(shade, 0.8);
      } else if (this.marked(s, a * bestSign, L, across)) {
        flag = FLAG_MARK;
      }

      this.hitFlag = flag;
      this.hitShade = shade;

      return true;
    }

    const tip = bestSign > 0 ? this.finTipRight : this.finTipLeft;
    const [p0, p1, p2] = anatomy.pectoral;

    if (
      inTriangle(u, a, [L * p0, 0, L * p1, 0, L * p2, tip]) &&
      // Falcate (sickle) fins get a concave trailing edge.
      !(
        anatomy.falcate &&
        inTriangle(u, a, [L * p1, 0, L * (p1 + (p2 - p1) * 0.33), tip * 0.55, L * p2, tip])
      )
    ) {
      this.hitFlag = this.marked(s, a * bestSign, L, 0) ? FLAG_MARK : FLAG_FIN;
      this.hitShade = 0.38 + 0.22 * (1 - clamp(a / tip, 0, 1));

      return true;
    }

    const [v0, v1, v2, vr] = anatomy.pelvic;

    if (
      inTriangle(u, a, [L * v0, 0, L * v1, 0, L * v2, L * vr]) ||
      // Forked caudal fin.
      (anatomy.caudal > 0 && inTriangle(u, a, [L * 0.86, 0, L * 0.95, 0, L, L * anatomy.caudal]))
    ) {
      this.hitFlag = FLAG_FIN;
      this.hitShade = 0.36;

      return true;
    }

    return false;
  }

  /** Whether a body point (`s` along, `v` across) falls on a dark marking. */
  private marked(s: number, v: number, L: number, across: number) {
    if (this.anatomy.markings === "bars") {
      // Wavy bars over the back half, fading out toward the head.
      if (s < 0.2 || s > 0.9 || across > 0.85) {
        return false;
      }

      const wobble = 0.35 * Math.sin((v / L) * 25 + s * 5);
      const bar = Math.sin(s * Math.PI * 2 * 9 + wobble);

      return bar > 0.65 - 0.5 * clamp((s - 0.2) / 0.22, 0, 1) + 0.4 * clamp((s - 0.8) / 0.1, 0, 1);
    }

    if (this.anatomy.markings === "spots") {
      // Spots on a jittered grid, so they ride along with the skin.
      if (s < 0.07) {
        return false;
      }

      const gu = s / 0.06;
      const gv = v / (L * 0.045);
      const cu = Math.floor(gu);
      const cv = Math.floor(gv);
      const jx = hash3(cu, cv, this.sharkId) * 0.5 + 0.25;
      const jy = hash3(cu, cv, this.sharkId + 11) * 0.5 + 0.25;

      return (gu - cu - jx) ** 2 + (gv - cv - jy) ** 2 < 0.08;
    }

    return false;
  }

  /** Builds a smooth render spine with a travelling body wave that grows toward the tail. */
  private buildSpine(shark: Shark) {
    const { spine, arc } = this;
    const N = SHARK_NODES;
    const L = shark.length;
    const swim = clamp(shark.speed / 60, 0.4, 1.4);

    for (let k = 0; k < N; k += 1) {
      const s = k / (N - 1);
      const a = Math.max(0, k - 1);
      const b = Math.min(N - 1, k + 1);
      let tx = nodeX(shark.nodes, a) - nodeX(shark.nodes, b);
      let ty = nodeY(shark.nodes, a) - nodeY(shark.nodes, b);
      const tl = Math.hypot(tx, ty) || 1;

      tx /= tl;
      ty /= tl;
      const amp = L * 0.05 * (0.1 + 0.9 * s ** 1.8) * swim;
      const off = amp * Math.sin(shark.phase - s * 5.2);

      spine[k * 2] = nodeX(shark.nodes, k) - ty * off;
      spine[k * 2 + 1] = nodeY(shark.nodes, k) + tx * off;
    }

    arc[0] = 0;

    for (let k = 1; k < N; k += 1) {
      const dx = (spine[k * 2] ?? 0) - (spine[(k - 1) * 2] ?? 0);
      const dy = (spine[k * 2 + 1] ?? 0) - (spine[(k - 1) * 2 + 1] ?? 0);

      arc[k] = (arc[k - 1] ?? 0) + Math.hypot(dx, dy);
    }

    this.arcTotal = Math.max(arc[N - 1] ?? 0, 1);

    // Bank into turns: the inside fin foreshortens and the outside one spreads.
    const bank = clamp(shark.turn * 0.45, -0.35, 0.35);
    const flex = 1 + 0.06 * Math.sin(shark.phase * 0.5);
    const reach = this.anatomy.pectoral.at(-1) ?? 0;

    this.finTipRight = L * reach * flex * (1 - bank);
    this.finTipLeft = L * reach * flex * (1 + bank);
  }

  /**
   * Supersamples each cell in the shark's bounding box against the anatomy. Fully covered cells
   * become solid skin, and partly covered cells become edge glyphs.
   */
  private rasterizeSharks(sharks: Shark[], t: number) {
    const { sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind, spine, cw, ch, cols, rows } =
      this;

    sharkFlag.fill(0);

    for (const shark of sharks) {
      const L = shark.length;

      this.anatomy = ANATOMY[shark.kind];
      this.sharkId = shark.id;
      this.buildSpine(shark);
      const kindIndex = SHARK_KINDS.indexOf(shark.kind);

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;

      for (let k = 0; k < SHARK_NODES; k += 1) {
        const x = spine[k * 2] ?? 0;
        const y = spine[k * 2 + 1] ?? 0;

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }

      const reach = L * 0.36;
      const c0 = Math.max(0, Math.floor((minX - reach) / cw));
      const c1 = Math.min(cols - 1, Math.floor((maxX + reach) / cw));
      const r0 = Math.max(0, Math.floor((minY - reach) / ch));
      const r1 = Math.min(rows - 1, Math.floor((maxY + reach) / ch));
      const skipBeyond = reach + Math.hypot(cw, ch);

      for (let r = r0; r <= r1; r += 1) {
        for (let c = c0; c <= c1; c += 1) {
          const x = c * cw;
          const y = r * ch;
          const centerHit = this.sampleShark(x + cw / 2, y + ch / 2, L);

          if (!centerHit && this.hitDist > skipBeyond) {
            continue;
          }

          const { hitFlag: flag, hitShade: shade, hitS: s, hitV: v } = this;
          let hits = centerHit ? 1 : 0;

          for (let k = 0; k < SUBSAMPLES.length; k += 2) {
            const sx = SUBSAMPLES[k] ?? 0.5;
            const sy = SUBSAMPLES[k + 1] ?? 0.5;

            hits += this.sampleShark(x + sx * cw, y + sy * ch, L) ? 1 : 0;
          }

          if (hits === 0) {
            continue;
          }

          const coverage = hits / 5;
          const i = r * cols + c;

          // Key anchored to the body, so each accent rides along with the skin.
          sharkKey[i] = Math.floor(
            hash3(Math.round(s * 52), Math.round(v / (cw * 0.9)), shark.id) * 4_294_967_295,
          );
          sharkDepth[i] = shark.depth;
          sharkKind[i] = kindIndex;

          if (centerHit && coverage >= 0.6) {
            const flicker = (hash3(c, r, Math.floor(t * 6)) - 0.5) * 0.06;

            sharkFlag[i] = flag;
            sharkShade[i] = clamp(shade + flicker, 0, 1);
          } else {
            sharkFlag[i] = FLAG_EDGE;
            sharkShade[i] = coverage;
          }
        }
      }
    }
  }

  private skin(kind: number, level: number) {
    const ramp = this.palette.skin[kind] ?? this.palette.skin[0] ?? [];
    const index = clamp(Math.round((level / 255) * (SKIN_LEVELS - 1)), 0, SKIN_LEVELS - 1);

    return ramp[index] ?? this.palette.glint;
  }

  private drawSharks(t: number) {
    const { ctx, cols, cw, ch, sharkFlag, sharkShade, sharkKey, sharkDepth, sharkKind, palette } =
      this;

    for (const [i, flag] of sharkFlag.entries()) {
      if (flag === 0) {
        continue;
      }

      const x = (i % cols) * cw;
      const y = Math.floor(i / cols) * ch;
      const key = sharkKey[i] ?? 0;
      const shade = sharkShade[i] ?? 0;
      const kind = sharkKind[i] ?? 0;
      const dim = 0.7 + 0.3 * (sharkDepth[i] ?? 1);
      // Colors re-roll on a staggered clock, so the skin shimmers.
      const tick = Math.floor(t * 2.4 + (key % 997) / 97);
      const roll = hash3(key, tick, 7);
      const accent = palette.accents[key % palette.accents.length] ?? palette.glint;

      if (flag === FLAG_EDGE) {
        // Soft silhouette: no block, only a light glyph.
        ctx.fillStyle = roll < 0.07 ? accent : this.skin(kind, (70 + shade * 80) * dim);
        ctx.fillText(
          charAt(shade >= 0.5 ? EDGE_HEAVY : EDGE_LIGHT, Math.floor(key / 256)),
          x + cw / 2,
          y + ch / 2 + 1,
        );
        continue;
      }

      if (flag === FLAG_EYE) {
        ctx.fillStyle = palette.eye;
      } else if (flag === FLAG_MARK) {
        ctx.fillStyle = palette.marks[kind] ?? palette.eye;
      } else if (roll < 0.06) {
        ctx.fillStyle = accent;
      } else {
        ctx.fillStyle = this.skin(kind, cellLevel(flag, shade) * dim);
      }

      ctx.fillRect(x, y, cw, ch);

      if ((flag === FLAG_BODY || flag === FLAG_FIN) && shade < SHADOW_SHADE) {
        ctx.fillStyle = palette.glyph;
        ctx.fillText(shadowGlyph(flag, shade, key), x + cw / 2, y + ch / 2 + 1);
      }
    }
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

  // ── fish and heat ────────────────────────────────────────────────

  /**
   * Snaps each fish to a cell and buckets it by brightness: far fish are dim, near fish are
   * brighter, and turning or panicking fish glint. Nearer fish claim a cell first.
   */
  private markFish(world: World) {
    const { fishStamp, fishBuckets, sharkFlag } = this;

    this.frameId += 1;
    const frame = this.frameId;

    for (const bucket of fishBuckets) {
      bucket.length = 0;
    }

    for (const near of [true, false]) {
      for (const fish of world.fish) {
        if (!fish.alive || fish.depth > 0.78 !== near) {
          continue;
        }

        const i = this.cellIndex(fish.x, fish.y);

        if (i < 0 || fishStamp[i] === frame || sharkFlag[i] !== 0) {
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

  private drawHeat() {
    const { ctx, heat, cols, cw, ch, palette } = this;

    for (const [i, h] of heat.entries()) {
      if (h < 0.08) {
        continue;
      }

      const level = clamp(Math.floor(Math.min(1, h) * HEAT_LEVELS), 0, HEAT_LEVELS - 1);

      ctx.fillStyle = (h > 0.5 ? palette.heatHot[level] : palette.heatCool[level]) ?? palette.glint;
      ctx.fillRect((i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
    }
  }
}
