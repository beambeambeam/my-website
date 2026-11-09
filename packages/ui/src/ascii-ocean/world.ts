import type { SharkKind } from "./anatomy";
/**
 * Artificial-life sim: small fish schools and the sharks that hunt them, kept inside a box.
 *
 * Fish: Reynolds boids (separation, alignment, cohesion) in Couzin-style zones, with a blind spot
 * behind each fish. Alarm spreads from fish to fish through the school, so a whole school bolts
 * even when only its edge can see the shark. Fleeing fish break sideways around the shark's path,
 * which gives the fountain effect of real bait balls.
 *
 * Sharks: Reynolds steering (wander, pursuit, separation) on a follow-the-leader spine. Hunger
 * builds over time and drops when they eat. They prefer fish in sparse spots, because dense schools
 * confuse predators. Eaten fish come back later as new schools that swim in from the edges.
 *
 * Swimmers: Siren swims from spot to spot, head first, and her two mermaids swim at her sides. Fish
 * part around them without panic, and sharks give them room.
 *
 * Adapted from ascii-sharks by drewdi (MIT, see LICENSE).
 */
import { angleDiff, clamp, current, rand, randInt, TAU } from "./math";
import { createMermaid, fitMermaids, stepMermaid } from "./mermaid";
import { createSiren, fitSiren, stepSiren } from "./siren";
import { FISH_SPECIES, pickSpecies, speciesAt } from "./species";
import { awayFrom } from "./swimmer";

export const SHARK_NODES = 20;

/** A shark to put in the water. `size` is relative to the biggest shark, from 0 to 1. */
export interface SharkSpec {
  kind: SharkKind;
  size: number;
}

export interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  species: number;
  /** 0 calm to 1 panicking. Spreads to neighbors. */
  alarm: number;
  alive: boolean;
  respawnAt: number;
  /** Smoothed angular velocity in rad/s. Hard turns glint. */
  turn: number;
  /** 0.55 far to 1 near. */
  depth: number;
  /** Spin direction that a school shares when it mills into a bait ball. */
  millDir: 1 | -1;
}

export interface Shark {
  id: number;
  kind: SharkKind;
  length: number;
  /** Spine positions, snout first: [x0, y0, x1, y1, ...]. */
  nodes: Float32Array;
  heading: number;
  speed: number;
  /** Tail-beat phase. Drives the body wave in the renderer. */
  phase: number;
  /** Smoothed angular velocity in rad/s. The shark banks its fins into turns. */
  turn: number;
  hunger: number;
  wander: number;
  orbitDir: 1 | -1;
  /** Patrol radius as a fraction of the half-size of the box. */
  orbitRadius: number;
  target: Fish | null;
  retargetAt: number;
  /** 0 far and dim to 1 near and bright. */
  depth: number;
}

export interface WorldEvent {
  kind: "eat" | "splash";
  x: number;
  y: number;
}

const FISH_SEPARATION_K = 420;
const FISH_ALIGN_K = 1.4;
const FISH_COHESION_K = 1;
const FISH_FLEE_K = 1100;

/** About 127° to either side of the heading is visible. */
const BLIND_COS = -0.6;

/** The snout turns back before it gets this close to an edge, as a fraction of the length. */
const EDGE_INSET = 0.16;

/** Fish keep this far from a swimmer's spine, in units of its length. Sharks keep a little more. */
const SWIMMER_ROOM = 0.34;

/** How long sharks circle the spot of a click, in seconds. */
const LURE_TIME = 3.5;

/** A fish has room for its own cell. More fish than cells make a gray carpet, so cap it. */
const fishCountFor = (width: number, height: number) =>
  clamp(Math.round((width * height) / 4400), 60, 340);

export const nodeX = (nodes: Float32Array, k: number) => nodes[k * 2] ?? 0;
export const nodeY = (nodes: Float32Array, k: number) => nodes[k * 2 + 1] ?? 0;

/** Lays the spine out straight behind the snout at (x, y). */
const layStraight = (shark: Shark, x: number, y: number) => {
  const seg = shark.length / (SHARK_NODES - 1);

  for (let n = 0; n < SHARK_NODES; n += 1) {
    shark.nodes[n * 2] = x - Math.cos(shark.heading) * seg * n;
    shark.nodes[n * 2 + 1] = y - Math.sin(shark.heading) * seg * n;
  }
};

export class World {
  width = 0;
  height = 0;
  time = 0;
  fish: Fish[] = [];
  sharks: Shark[] = [];
  events: WorldEvent[] = [];
  pointer = { x: 0, y: 0, active: false };
  /** A spot that sharks circle for a while after a click. */
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
  private bucketCount = new Uint16Array(0);
  private bucketNext = new Int32Array(0);
  private lastSpawn = 0;
  private readonly flow = { x: 0, y: 0 };
  private readonly sharkSpecs: readonly SharkSpec[];

  constructor(sharkSpecs: readonly SharkSpec[]) {
    this.sharkSpecs = sharkSpecs;
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

    if (first || this.fish.length === 0) {
      this.seed();

      return;
    }

    for (const fish of this.fish) {
      fish.x = clamp(fish.x, 0, width);
      fish.y = clamp(fish.y, 0, height);
    }

    for (const shark of this.sharks) {
      this.placeInside(shark);
    }
  }

  splash(x: number, y: number) {
    this.events.push({ kind: "splash", x, y });
    this.lure = { x, y, until: this.time + LURE_TIME };
    const r = 240;

    for (const fish of this.fish) {
      if (!fish.alive) {
        continue;
      }

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
    this.stepSharks(dt);
    stepSiren(this.siren, dt, this);

    for (const mermaid of this.mermaids) {
      stepMermaid(mermaid, this.siren, dt, this);
    }

    this.respawn();
  }

  private seed() {
    const { width: W, height: H } = this;
    const minSide = Math.min(W, H);
    const baseLength = clamp(minSide * 0.46, 120, 430);
    const count = this.sharkSpecs.length;

    this.sharks = this.sharkSpecs.map(({ kind, size }, index) => {
      const length = baseLength * size;
      const orbitRadius = rand(0.45, 0.62);
      const a = (index / count) * TAU + rand(-0.4, 0.4);
      const orbitDir: 1 | -1 = index % 2 === 0 ? 1 : -1;
      const x = W / 2 + Math.cos(a) * orbitRadius * (W / 2);
      const y = H / 2 + Math.sin(a) * orbitRadius * (H / 2);
      const heading = a + (orbitDir * Math.PI) / 2;

      const shark: Shark = {
        id: index + 1,
        kind,
        length,
        nodes: new Float32Array(SHARK_NODES * 2),
        heading,
        speed: 30,
        phase: rand(0, TAU),
        turn: 0,
        hunger: rand(0.25, 0.75),
        wander: 0,
        orbitDir,
        orbitRadius,
        target: null,
        retargetAt: 0,
        depth: size,
      };

      layStraight(shark, x, y);

      return shark;
    });
    // Smaller (farther) sharks draw first, so the big one swims over them.
    this.sharks.sort((a, b) => a.length - b.length);

    const total = fishCountFor(W, H);

    this.fish = [];

    while (this.fish.length < total) {
      const species = pickSpecies();
      const sp = speciesAt(species);
      const size = Math.min(randInt(sp.schoolSize[0], sp.schoolSize[1]), total - this.fish.length);
      const millDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
      const cx = rand(W * 0.08, W * 0.92);
      const cy = rand(H * 0.08, H * 0.92);
      // Mostly level headings: fish cruise sideways far more than up or down.
      const dir = (Math.random() < 0.5 ? 0 : Math.PI) + rand(-0.5, 0.5);
      const spreadX = (this.sepX[species] ?? 10) * Math.sqrt(size);
      const spreadY = (this.sepY[species] ?? 10) * Math.sqrt(size) * 0.6;

      for (let k = 0; k < size; k += 1) {
        this.fish.push({
          x: clamp(cx + rand(-1, 1) * spreadX, 0, W),
          y: clamp(cy + rand(-1, 1) * spreadY, 0, H),
          vx: Math.cos(dir) * sp.cruise,
          vy: Math.sin(dir) * sp.cruise,
          species,
          alarm: 0,
          alive: true,
          respawnAt: 0,
          turn: 0,
          depth: rand(0.55, 1),
          millDir,
        });
      }
    }

    this.bucketNext = new Int32Array(this.fish.length);
  }

  /** After a resize, moves a shark whose snout fell outside the box back in. */
  private placeInside(shark: Shark) {
    const inset = shark.length * EDGE_INSET;
    const x = nodeX(shark.nodes, 0);
    const y = nodeY(shark.nodes, 0);
    const insideX = clamp(x, inset, Math.max(inset, this.width - inset));
    const insideY = clamp(y, inset, Math.max(inset, this.height - inset));

    if (insideX !== x || insideY !== y) {
      shark.heading = Math.atan2(this.height / 2 - insideY, this.width / 2 - insideX);
      layStraight(shark, insideX, insideY);
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
      this.bucketCount = new Uint16Array(n);
    }

    this.bucketHead.fill(-1);
    this.bucketCount.fill(0);

    if (this.bucketNext.length !== this.fish.length) {
      this.bucketNext = new Int32Array(this.fish.length);
    }

    for (const [index, fish] of this.fish.entries()) {
      if (!fish.alive) {
        continue;
      }

      const bucket = this.bucketOf(fish.x, fish.y);

      this.bucketNext[index] = this.bucketHead[bucket] ?? -1;
      this.bucketHead[bucket] = index;
      this.bucketCount[bucket] = (this.bucketCount[bucket] ?? 0) + 1;
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
    const { fish: school, sharks, pointer, swimmers, width: W, height: H, time, flow } = this;
    const R2 = this.perception * this.perception;
    const size = this.perception;
    const cols = this.bucketCols;
    const rows = this.bucketRows;
    const head = this.bucketHead;
    const next = this.bucketNext;
    const calmDecay = Math.exp(-dt * 0.7);
    const contagion = Math.min(1, dt * 6);

    for (const [i, f] of school.entries()) {
      if (!f.alive) {
        continue;
      }

      const sp = speciesAt(f.species);
      // Alarmed fish want more room: the school flashes apart around a shark and closes back up
      // once the threat fades.
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

      // Predators. Distance is to the nearest point along the front half of the shark, so fish
      // also give the flanks a wide berth.
      let fear = 0;

      for (const shark of sharks) {
        const fearR = shark.length * 0.6 + 60;
        let best = Infinity;
        let bx = 0;
        let by = 0;

        for (let k = 0; k <= 12; k += 3) {
          const nx = nodeX(shark.nodes, k);
          const ny = nodeY(shark.nodes, k);
          const d2 = (f.x - nx) ** 2 + (f.y - ny) ** 2;

          if (d2 < best) {
            best = d2;
            bx = nx;
            by = ny;
          }
        }

        const d = Math.sqrt(best);

        if (d >= fearR || d < 1e-3) {
          continue;
        }

        const w = (1 - d / fearR) ** 2;
        const awayX = (f.x - bx) / d;
        const awayY = (f.y - by) / d;
        // Fountain effect: break to whichever side of the shark's path the fish is on.
        const shx = Math.cos(shark.heading);
        const shy = Math.sin(shark.heading);
        const snoutX = nodeX(shark.nodes, 0);
        const snoutY = nodeY(shark.nodes, 0);
        const side = shx * (f.y - snoutY) - shy * (f.x - snoutX) >= 0 ? 1 : -1;

        ax += (awayX * 0.7 - shy * side * 0.9) * FISH_FLEE_K * w;
        ay += (awayY * 0.7 + shx * side * 0.9) * FISH_FLEE_K * w;
        fear = Math.max(fear, Math.sqrt(w));
      }

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

  // oxlint-disable-next-line max-statements, complexity -- Each steering force reads the same locals.
  private stepSharks(dt: number) {
    const { sharks, swimmers, width: W, height: H, time, lure } = this;
    const cxW = W / 2;
    const cyW = H / 2;
    const luring = time < lure.until;

    for (const shark of sharks) {
      const L = shark.length;
      const { nodes } = shark;
      const hx = nodeX(nodes, 0);
      const hy = nodeY(nodes, 0);

      shark.hunger = Math.min(1, shark.hunger + dt * 0.03);

      // Momentum.
      let dx = Math.cos(shark.heading);
      let dy = Math.sin(shark.heading);

      // Wander: a slowly drifting offset on a circle ahead of the snout.
      shark.wander = clamp(shark.wander + (Math.random() - 0.5) * dt * 3.2, -1.1, 1.1);
      dx += Math.cos(shark.heading + shark.wander) * 0.45;
      dy += Math.sin(shark.heading + shark.wander) * 0.45;

      // Hunt.
      if (time >= shark.retargetAt) {
        shark.target = this.findPrey(shark);
        shark.retargetAt = time + 0.45;
      }

      const { target } = shark;
      let hunting = false;
      let closing = 0;

      if (luring) {
        // Something hit the water: come and look.
        const tx = lure.x - hx;
        const ty = lure.y - hy;
        const d = Math.hypot(tx, ty) || 1;

        dx += (tx / d) * 2.2;
        dy += (ty / d) * 2.2;
        hunting = true;
        closing = clamp(1 - d / L, 0, 0.6);
      } else if (target !== null && this.catchable(target) && shark.hunger > 0.3) {
        // Pursuit: aim at where the fish is about to be.
        const tx = target.x + target.vx * 0.35 - hx;
        const ty = target.y + target.vy * 0.35 - hy;
        const d = Math.hypot(tx, ty) || 1;
        const w = 1.4 + 2.6 * shark.hunger;

        dx += (tx / d) * w;
        dy += (ty / d) * w;
        hunting = true;
        closing = clamp(1 - d / (L * 0.9), 0, 1);
      } else {
        // Patrol: a lazy loop around the middle of the box.
        const rx = (hx - cxW) / (W / 2 || 1);
        const ry = (hy - cyW) / (H / 2 || 1);
        const r = Math.hypot(rx, ry) || 1;
        const radius = shark.orbitRadius * (1 + 0.15 * Math.sin(time * 0.05 + shark.id));
        const radial = clamp((radius - r) / radius, -1, 1);

        dx += ((-ry / r) * shark.orbitDir + (rx / r) * radial * 0.9) * 0.55;
        dy += ((rx / r) * shark.orbitDir + (ry / r) * radial * 0.9) * 0.55;
      }

      // Give other sharks room.
      for (const other of sharks) {
        if (other === shark) {
          continue;
        }

        const range = (L + other.length) * 0.4;

        for (let k = 0; k < SHARK_NODES; k += 4) {
          const ox = hx - nodeX(other.nodes, k);
          const oy = hy - nodeY(other.nodes, k);
          const d = Math.hypot(ox, oy);

          if (d < range && d > 1e-3) {
            const w = (1 - d / range) * 3;

            dx += (ox / d) * w;
            dy += (oy / d) * w;
          }
        }
      }

      // Give the swimmers room: steer the snout away from them.
      for (const swimmer of swimmers) {
        const from = awayFrom(swimmer, hx, hy);

        if (from.d < SWIMMER_ROOM * 1.4) {
          const push = (1 - from.d / (SWIMMER_ROOM * 1.4)) * 3;

          dx += from.x * push;
          dy += from.y * push;
        }
      }

      // Stay in the box: look ahead along the heading, and when that point leaves the box, turn
      // back toward the middle before the snout gets to the edge.
      const inset = L * EDGE_INSET;
      const look = L * 0.3 + shark.speed * 0.8;
      const aheadX = hx + Math.cos(shark.heading) * look;
      const aheadY = hy + Math.sin(shark.heading) * look;

      const over = Math.max(
        inset - aheadX,
        aheadX - (W - inset),
        inset - aheadY,
        aheadY - (H - inset),
      );

      const wallUrgency = clamp(over / (L * 0.12), 0, 1);

      if (wallUrgency > 0) {
        const toX = cxW - hx;
        const toY = cyW - hy;
        const d = Math.hypot(toX, toY) || 1;
        const pull = (Math.hypot(dx, dy) + 1) * wallUrgency * 1.5;

        // Blend instead of add, so a chase can't pull the shark through the wall.
        dx = dx * (1 - wallUrgency) + (toX / d) * pull;
        dy = dy * (1 - wallUrgency) + (toY / d) * pull;
      }

      const desired = Math.atan2(dy, dx);
      // Sharks can't pivot on the spot: the turning circle grows with speed. Near a wall they
      // turn harder, so they stay in the box.

      const agility = Math.max(
        Math.min(hunting ? 1.7 + closing : 0.8, shark.speed / (L * 0.22)),
        wallUrgency * 2.6,
      );

      const maxTurn = agility * dt;
      const turned = clamp(angleDiff(shark.heading, desired), -maxTurn, maxTurn);

      shark.heading += turned;
      shark.turn += (turned / dt - shark.turn) * Math.min(1, dt * 3);

      const cruise = 30 + L * 0.04;
      const targetSpeed = hunting ? cruise * (1.45 + closing * 1.5) : cruise;

      shark.speed += (targetSpeed - shark.speed) * Math.min(1, dt * 1.1);
      shark.phase += dt * (2 + shark.speed / 24);

      nodes[0] = hx + Math.cos(shark.heading) * shark.speed * dt;
      nodes[1] = hy + Math.sin(shark.heading) * shark.speed * dt;

      // Follow-the-leader spine, with a stiffness limit on each joint, so the body bends into a C
      // at most and never folds back on itself.
      const seg = L / (SHARK_NODES - 1);
      const maxBend = 0.16;
      let prevAngle = shark.heading + Math.PI;

      for (let k = 1; k < SHARK_NODES; k += 1) {
        const px = nodeX(nodes, k - 1);
        const py = nodeY(nodes, k - 1);
        let angle = Math.atan2(nodeY(nodes, k) - py, nodeX(nodes, k) - px);

        angle = prevAngle + clamp(angleDiff(prevAngle, angle), -maxBend, maxBend);
        nodes[k * 2] = px + Math.cos(angle) * seg;
        nodes[k * 2 + 1] = py + Math.sin(angle) * seg;
        prevAngle = angle;
      }

      this.feed(shark);
    }
  }

  private feed(shark: Shark) {
    if (shark.hunger <= 0.15) {
      return;
    }

    const mouthR = shark.length * 0.05 + 8;
    const mx = nodeX(shark.nodes, 0);
    const my = nodeY(shark.nodes, 0);

    for (const fish of this.fish) {
      if (fish.alive && (fish.x - mx) ** 2 + (fish.y - my) ** 2 < mouthR * mouthR) {
        fish.alive = false;
        fish.respawnAt = this.time + rand(3, 8);
        shark.hunger = Math.max(0, shark.hunger - 0.16);
        this.events.push({ kind: "eat", x: fish.x, y: fish.y });
      }
    }
  }

  /** A live fish inside the box. Sharks ignore fish outside, so a chase never leads them out. */
  private catchable(fish: Fish) {
    return (
      fish.alive && fish.x >= 0 && fish.x <= this.width && fish.y >= 0 && fish.y <= this.height
    );
  }

  /**
   * Picks prey in the shark's forward cone. Close fish in sparse buckets (stragglers) win over fish
   * deep in a dense school.
   */
  private findPrey(shark: Shark): Fish | null {
    const range = shark.length * 0.9 + 160;
    const hx = nodeX(shark.nodes, 0);
    const hy = nodeY(shark.nodes, 0);
    const fx = Math.cos(shark.heading);
    const fy = Math.sin(shark.heading);
    let best: Fish | null = null;
    let bestScore = Infinity;
    let currentScore = Infinity;

    for (const fish of this.fish) {
      if (!this.catchable(fish)) {
        continue;
      }

      const dx = fish.x - hx;
      const dy = fish.y - hy;
      const d = Math.hypot(dx, dy);

      if (d > range || d < 1e-3) {
        continue;
      }

      const cos = (dx * fx + dy * fy) / d;

      if (cos < 0.2) {
        continue;
      }

      const crowd = this.bucketCount[this.bucketOf(fish.x, fish.y)] ?? 0;
      const score = d * (1 + (1 - cos) * 0.8) * (1 + crowd * 0.07);

      if (score < bestScore) {
        bestScore = score;
        best = fish;
      }

      if (fish === shark.target) {
        currentScore = score;
      }
    }

    // Keep the current target unless something is clearly better.
    if (shark.target !== null && currentScore < bestScore * 1.3) {
      return shark.target;
    }

    return best;
  }

  private respawn() {
    const { time, width: W, height: H } = this;
    const due = this.fish.filter((fish) => !fish.alive && fish.respawnAt <= time);

    if (due.length === 0 || (due.length < 6 && time - this.lastSpawn < 9)) {
      return;
    }

    this.lastSpawn = time;

    // A new school swims in from a random edge.
    const vertical = Math.random() < 0.5;
    const far = Math.random() < 0.5;
    const along = rand(0.15, 0.85);
    let x = along * W;
    let y = far ? H + 20 : -20;

    if (vertical) {
      x = far ? W + 20 : -20;
      y = along * H;
    }

    const inward = Math.atan2(H / 2 - y, W / 2 - x) + rand(-0.5, 0.5);
    const species = pickSpecies();
    const sp = speciesAt(species);
    const millDir: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

    for (const fish of due.slice(0, sp.schoolSize[1])) {
      fish.alive = true;
      fish.species = species;
      fish.alarm = 0;
      fish.turn = 0;
      fish.millDir = millDir;
      fish.x = x + rand(-1, 1) * this.perception;
      fish.y = y + rand(-1, 1) * this.perception;
      fish.vx = Math.cos(inward) * sp.cruise * 1.4;
      fish.vy = Math.sin(inward) * sp.cruise * 1.4;
    }
  }
}
