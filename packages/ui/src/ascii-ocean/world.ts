/**
 * Artificial-life sim: small fish schools, and Siren with her two mermaids, kept inside a box.
 *
 * Fish: Reynolds boids (separation, alignment, cohesion) in Couzin-style zones, with a blind spot
 * behind each fish. Alarm spreads from fish to fish through the school, so a whole school bolts
 * even when only its edge feels the pointer or a splash.
 *
 * Swimmers: Siren swims from spot to spot, head first, and her two mermaids swim at her sides. Fish
 * part around them without panic. A click lures Siren to look.
 *
 * Adapted from ascii-sharks by drewdi (MIT, see LICENSE).
 */
import { angleDiff, clamp, current, rand, randInt } from "./math";
import { createMermaid, fitMermaids, stepMermaid } from "./mermaid";
import { createSiren, fitSiren, stepSiren } from "./siren";
import { FISH_SPECIES, pickSpecies, speciesAt } from "./species";
import { awayFrom } from "./swimmer";

export interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  species: number;
  /** 0 calm to 1 panicking. Spreads to neighbors. */
  alarm: number;
  /** Smoothed angular velocity in rad/s. Hard turns glint. */
  turn: number;
  /** 0.55 far to 1 near. */
  depth: number;
  /** Spin direction that a school shares when it mills into a bait ball. */
  millDir: 1 | -1;
}

const FISH_SEPARATION_K = 420;
const FISH_ALIGN_K = 1.4;
const FISH_COHESION_K = 1;
const FISH_FLEE_K = 1100;

/** About 127° to either side of the heading is visible. */
const BLIND_COS = -0.6;

/** Fish keep this far from a swimmer's spine, in units of its length. */
const SWIMMER_ROOM = 0.34;

/** How long Siren swims to the spot of a click, in seconds. */
const LURE_TIME = 3.5;

/** A fish has room for its own cell. More fish than cells make a gray carpet, so cap it. */
export const fishCountFor = (width: number, height: number) =>
  clamp(Math.round((width * height) / 4400), 60, 340);

/**
 * A resize changes the fish count only when it is off by more than this fraction, so small resizes
 * (a mobile address bar that shows or hides) do not add or remove fish.
 */
const RECOUNT_SLACK = 0.15;

export class World {
  width = 0;
  height = 0;
  time = 0;
  fish: Fish[] = [];
  pointer = { x: 0, y: 0, active: false };
  /** A spot that Siren swims to after a click. */
  lure = { x: 0, y: 0, until: 0 };
  readonly siren = createSiren();
  readonly mermaids = [createMermaid(1), createMermaid(-1)] as const;
  /** Siren and her mermaids, in draw order: the mermaids swim under her. */
  readonly swimmers = [...this.mermaids, this.siren] as const;

  /** Fish neighborhood radius. The spatial hash bucket size matches it. */
  private perception = 60;
  /** Personal space per species in px (x, y). */
  private sepX: number[] = [];
  private sepY: number[] = [];
  private foreignSep = 40;
  private bucketCols = 0;
  private bucketRows = 0;
  private bucketHead = new Int32Array(0);
  private bucketNext = new Int32Array(0);
  private readonly flow = { x: 0, y: 0 };

  /** Size of Siren and her mermaids: 1 is full size, 0.5 is half. */
  readonly swimmerScale: number;

  constructor(swimmerScale = 1) {
    this.swimmerScale = swimmerScale;
  }

  resize(width: number, height: number, cellW: number, cellH: number) {
    const first = this.width === 0;

    this.width = width;
    this.height = height;
    // Spacing is in grid cells, so each fish lands in its own cell.
    this.sepX = FISH_SPECIES.map((species) => species.spacing[0] * cellW);
    this.sepY = FISH_SPECIES.map((species) => species.spacing[1] * cellH);
    this.perception = Math.max(cellH * 3, cellW * 5.5);
    this.foreignSep = cellW * 3;

    fitSiren(this.siren, this, first);
    fitMermaids(this.mermaids, this.siren, this, first);

    for (const fish of this.fish) {
      fish.x = clamp(fish.x, 0, width);
      fish.y = clamp(fish.y, 0, height);
    }

    this.recount(first);
  }

  splash(x: number, y: number) {
    this.lure = { x, y, until: this.time + LURE_TIME };
    const r = 240;

    for (const fish of this.fish) {
      const dx = fish.x - x;
      const dy = fish.y - y;
      const d = Math.hypot(dx, dy);

      if (d > r || d < 1e-3) {
        continue;
      }

      // Flash expansion: each fish nearby bolts straight out.
      const k = (1 - d / r) * 260;

      fish.vx += (dx / d) * k;
      fish.vy += (dy / d) * k;
      fish.alarm = 1;
    }
  }

  step(dt: number) {
    this.time += dt;
    this.rebuildHash();
    this.stepFish(dt);
    stepSiren(this.siren, dt, this);

    for (const mermaid of this.mermaids) {
      stepMermaid(mermaid, this.siren, dt, this);
    }
  }

  /**
   * Fits the fish count to the box. Extra fish are cut from the newest school. New schools start at
   * random spots on the first call, and after that swim in from a side.
   */
  private recount(first: boolean) {
    const total = fishCountFor(this.width, this.height);

    if (!first && Math.abs(this.fish.length - total) <= total * RECOUNT_SLACK) {
      return;
    }

    if (this.fish.length > total) {
      this.fish.length = total;
    }

    while (this.fish.length < total) {
      this.addSchool(total - this.fish.length, first);
    }
  }

  private addSchool(room: number, first: boolean) {
    const { width: W, height: H } = this;
    const species = pickSpecies();
    const sp = speciesAt(species);
    const size = Math.min(randInt(sp.schoolSize[0], sp.schoolSize[1]), room);
    const millDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
    const fromLeft = Math.random() < 0.5;
    const spreadX = (this.sepX[species] ?? 10) * Math.sqrt(size);
    const spreadY = (this.sepY[species] ?? 10) * Math.sqrt(size) * 0.6;
    const cx = rand(W * 0.08, W * 0.92);
    const cy = rand(H * 0.08, H * 0.92);
    // Mostly level headings: fish cruise sideways far more than up or down.
    const dir = (fromLeft ? 0 : Math.PI) + rand(-0.5, 0.5);

    // A new school after a resize waits in a strip just off one side, and the soft walls pull it in.
    const spawnX = () => {
      if (first) {
        return clamp(cx + rand(-1, 1) * spreadX, 0, W);
      }

      return fromLeft ? rand(-60, -10) : W + rand(10, 60);
    };

    for (let k = 0; k < size; k += 1) {
      this.fish.push({
        x: spawnX(),
        y: clamp(cy + rand(-1, 1) * spreadY * (first ? 1 : 1.5), 0, H),
        vx: Math.cos(dir) * sp.cruise,
        vy: Math.sin(dir) * sp.cruise,
        species,
        alarm: 0,
        turn: 0,
        depth: rand(0.55, 1),
        millDir,
      });
    }
  }

  private rebuildHash() {
    const size = this.perception;
    const pad = 2;

    this.bucketCols = Math.ceil(this.width / size) + pad * 2;
    this.bucketRows = Math.ceil(this.height / size) + pad * 2;
    const n = this.bucketCols * this.bucketRows;

    if (this.bucketHead.length !== n) {
      this.bucketHead = new Int32Array(n);
    }

    this.bucketHead.fill(-1);

    if (this.bucketNext.length !== this.fish.length) {
      this.bucketNext = new Int32Array(this.fish.length);
    }

    for (const [index, fish] of this.fish.entries()) {
      const bucket = this.bucketOf(fish.x, fish.y);

      this.bucketNext[index] = this.bucketHead[bucket] ?? -1;
      this.bucketHead[bucket] = index;
    }
  }

  private bucketOf(x: number, y: number) {
    const size = this.perception;
    const c = clamp(Math.floor(x / size) + 2, 0, this.bucketCols - 1);
    const r = clamp(Math.floor(y / size) + 2, 0, this.bucketRows - 1);

    return r * this.bucketCols + c;
  }

  // oxlint-disable-next-line max-statements, complexity -- One pass over each fish keeps the hot loop free of calls.
  private stepFish(dt: number) {
    const { fish: school, pointer, swimmers, width: W, height: H, time, flow } = this;
    const R2 = this.perception * this.perception;
    const size = this.perception;
    const cols = this.bucketCols;
    const rows = this.bucketRows;
    const head = this.bucketHead;
    const next = this.bucketNext;
    const calmDecay = Math.exp(-dt * 0.7);
    const contagion = Math.min(1, dt * 6);

    for (const [i, f] of school.entries()) {
      const sp = speciesAt(f.species);
      // Alarmed fish want more room: the school flashes apart and closes back up once the threat
      // fades.
      const spread = 1 + 1.8 * f.alarm;
      const sepX = (this.sepX[f.species] ?? 10) * spread;
      const sepY = (this.sepY[f.species] ?? 10) * spread;

      const speed = Math.hypot(f.vx, f.vy) || 1;
      const hx = f.vx / speed;
      const hy = f.vy / speed;

      let ax = 0;
      let ay = 0;
      let sx = 0;
      let sy = 0;
      let avx = 0;
      let avy = 0;
      let cx = 0;
      let cy = 0;
      let n = 0;
      let neighborAlarm = 0;

      const bc = clamp(Math.floor(f.x / size) + 2, 0, cols - 1);
      const br = clamp(Math.floor(f.y / size) + 2, 0, rows - 1);

      for (let r = Math.max(0, br - 1); r <= Math.min(rows - 1, br + 1); r += 1) {
        for (let c = Math.max(0, bc - 1); c <= Math.min(cols - 1, bc + 1); c += 1) {
          for (let j = head[r * cols + c] ?? -1; j !== -1; j = next[j] ?? -1) {
            const o = school[j];

            if (j === i || o === undefined) {
              continue;
            }

            const dx = o.x - f.x;
            const dy = o.y - f.y;
            const d2 = dx * dx + dy * dy;

            if (d2 >= R2 || d2 <= 1e-6) {
              continue;
            }

            const d = Math.sqrt(d2);

            // Blind zone right behind the fish.
            if ((dx * hx + dy * hy) / d <= BLIND_COS) {
              continue;
            }

            // Elliptical personal space: wide along x, tight along y.
            const qx = dx / sepX;
            const qy = dy / sepY;
            const q2 = qx * qx + qy * qy;

            if (q2 < 1) {
              const q = Math.sqrt(q2) || 1e-3;
              const k = (1 - q) / q;

              sx -= qx * k;
              sy -= qy * k;
            }

            if (o.species === f.species) {
              avx += o.vx;
              avy += o.vy;
              cx += dx;
              cy += dy;
              n += 1;
            } else if (d < this.foreignSep) {
              // Different species keep to their own schools.
              const k = ((1 - d / this.foreignSep) / d) * 0.6;

              sx -= dx * k;
              sy -= dy * k;
            }

            neighborAlarm = Math.max(neighborAlarm, o.alarm);
          }
        }
      }

      ax += sx * FISH_SEPARATION_K;
      ay += sy * FISH_SEPARATION_K;

      if (n > 0) {
        const alignK = FISH_ALIGN_K * sp.align;
        const cohesionK = FISH_COHESION_K * sp.cohesion * (1 - 0.8 * f.alarm);

        ax += (avx / n - f.vx) * alignK + (cx / n) * cohesionK;
        ay += (avy / n - f.vy) * alignK + (cy / n) * cohesionK;

        if (sp.mill > 0) {
          // Circle the local center: the school spins into a bait ball.
          const cl = Math.hypot(cx, cy) || 1;

          ax += (-cy / cl) * f.millDir * sp.mill * (1 - f.alarm);
          ay += (cx / cl) * f.millDir * sp.mill * (1 - f.alarm);
        }
      }

      let fear = 0;

      if (pointer.active) {
        const pr = 110;
        const dx = f.x - pointer.x;
        const dy = f.y - pointer.y;
        const d = Math.hypot(dx, dy);

        if (d < pr && d > 1e-3) {
          const w = (1 - d / pr) ** 2;

          ax += (dx / d) * FISH_FLEE_K * w;
          ay += (dy / d) * FISH_FLEE_K * w;
          fear = Math.max(fear, Math.sqrt(w) * 0.8);
        }
      }

      // Part around the swimmers without panic.
      for (const swimmer of swimmers) {
        const away = awayFrom(swimmer, f.x, f.y);

        if (away.d < SWIMMER_ROOM) {
          const w = 1 - away.d / SWIMMER_ROOM;

          ax += away.x * FISH_FLEE_K * 0.7 * w;
          ay += away.y * FISH_FLEE_K * 0.7 * w;
        }
      }

      // Alarm: a direct threat sets it, neighbors pass it along (a little weaker each hop), and it
      // fades on its own.
      let alarm = Math.max(f.alarm * calmDecay, fear);
      const relayed = neighborAlarm * 0.86;

      if (relayed > alarm) {
        alarm += (relayed - alarm) * contagion;
      }

      f.alarm = alarm;

      // Soft walls.
      const m = 36;

      if (f.x < m) {
        ax += (m - f.x) * 7;
      } else if (f.x > W - m) {
        ax -= (f.x - (W - m)) * 7;
      }

      if (f.y < m) {
        ay += (m - f.y) * 7;
      } else if (f.y > H - m) {
        ay -= (f.y - (H - m)) * 7;
      }

      // Ambient current and a little restlessness of each fish.
      current(f.x, f.y, time, flow);
      ax += flow.x * 0.5 + (Math.random() - 0.5) * sp.jitter;
      ay += flow.y * 0.5 + (Math.random() - 0.5) * sp.jitter;
      // Swim level, except when bolting from danger.
      ay -= f.vy * sp.verticalDrag * (1 - 0.7 * f.alarm);

      // Relax toward a preferred speed that rises with panic.
      const preferred = sp.cruise * (1 + 1.3 * f.alarm);

      ax += (preferred - speed) * hx * 1.6;
      ay += (preferred - speed) * hy * 1.6;

      const before = Math.atan2(f.vy, f.vx);

      f.vx += ax * dt;
      f.vy += ay * dt;
      const maxSpeed = sp.maxSpeed * (1 + 1.8 * f.alarm);
      const s = Math.hypot(f.vx, f.vy);

      if (s > maxSpeed) {
        f.vx *= maxSpeed / s;
        f.vy *= maxSpeed / s;
      } else if (s < sp.minSpeed && s > 1e-3) {
        f.vx *= sp.minSpeed / s;
        f.vy *= sp.minSpeed / s;
      }

      f.turn += (angleDiff(before, Math.atan2(f.vy, f.vx)) / dt - f.turn) * Math.min(1, dt * 8);
      f.x = clamp(f.x + f.vx * dt, -60, W + 60);
      f.y = clamp(f.y + f.vy * dt, -60, H + 60);
    }
  }
}
