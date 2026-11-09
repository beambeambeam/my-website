import { describe, expect, test } from "vite-plus/test";

import { nodeX, nodeY, World } from "./world";
import type { SharkSpec } from "./world";

const STEP = 1 / 60;

const SHARKS: SharkSpec[] = [
  { kind: "classic", size: 1 },
  { kind: "hammerhead", size: 0.8 },
  { kind: "mako", size: 0.7 },
];

const BOXES = [
  [680, 860],
  [380, 620],
  [900, 420],
] as const;

const run = (world: World, seconds: number, each?: () => void) => {
  for (let step = 0; step < seconds / STEP; step += 1) {
    world.step(STEP);
    each?.();
  }
};

describe("World", () => {
  test.each(BOXES)("keeps each shark's snout inside a %i×%i box", (width, height) => {
    const world = new World(SHARKS);

    world.resize(width, height, 8, 12);

    let worst = 0;

    run(world, 90, () => {
      for (const shark of world.sharks) {
        const x = nodeX(shark.nodes, 0);
        const y = nodeY(shark.nodes, 0);

        worst = Math.max(worst, -x, x - width, -y, y - height);
      }
    });

    expect(worst).toBeLessThanOrEqual(0);
  });

  test("keeps the sharks inside after a click lures them to a corner", () => {
    const world = new World(SHARKS);

    world.resize(500, 700, 8, 12);

    let worst = 0;

    run(world, 30, () => {
      if (world.time > world.lure.until) {
        world.splash(2, 2);
      }

      for (const shark of world.sharks) {
        const x = nodeX(shark.nodes, 0);
        const y = nodeY(shark.nodes, 0);

        worst = Math.max(worst, -x, x - 500, -y, y - 700);
      }
    });

    expect(worst).toBeLessThanOrEqual(0);
  });

  test("brings eaten fish back, so the population stays steady", () => {
    const world = new World(SHARKS);

    world.resize(680, 860, 8, 12);
    const total = world.fish.length;

    run(world, 120);

    const alive = world.fish.filter((fish) => fish.alive).length;

    expect(world.fish).toHaveLength(total);
    expect(alive).toBeGreaterThan(total * 0.6);
  });

  test("moves sharks back inside when the box shrinks", () => {
    const world = new World(SHARKS);

    world.resize(900, 900, 8, 12);
    run(world, 5);
    world.resize(300, 300, 8, 12);

    for (const shark of world.sharks) {
      expect(nodeX(shark.nodes, 0)).toBeLessThanOrEqual(300);
      expect(nodeY(shark.nodes, 0)).toBeLessThanOrEqual(300);
    }
  });

  test("keeps Siren and her mermaids inside the box, even when a click lures her to a corner", () => {
    const world = new World(SHARKS);

    world.resize(500, 700, 8, 12);

    let worst = 0;

    run(world, 60, () => {
      if (world.time > world.lure.until && world.time % 10 < 5) {
        world.splash(2, 2);
      }

      for (const { x, y, halfW, halfH } of world.swimmers) {
        worst = Math.max(worst, halfW - x, x + halfW - 500, halfH - y, y + halfH - 700);
      }
    });

    expect(worst).toBeLessThanOrEqual(1e-6);
  });

  test("mermaids are a third of Siren and stay close to her", () => {
    const world = new World(SHARKS);

    world.resize(900, 700, 8, 12);
    run(world, 10);

    let total = 0;
    let steps = 0;

    run(world, 60, () => {
      for (const mermaid of world.mermaids) {
        total += Math.hypot(mermaid.x - world.siren.x, mermaid.y - world.siren.y);
        steps += 1;
      }
    });

    for (const mermaid of world.mermaids) {
      expect(mermaid.length).toBeCloseTo(world.siren.length / 3);
    }

    expect(total / steps).toBeLessThan(world.siren.length * 0.9);
  });
});
