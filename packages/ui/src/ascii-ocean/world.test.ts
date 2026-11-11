import { describe, expect, test } from "vite-plus/test";

import { fishCountFor, World } from "./world";

const STEP = 1 / 60;

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

/** How far the farthest swimmer pokes out of the box, in px. 0 or less is inside. */
const overflow = (world: World) => {
  let worst = -Infinity;

  for (const { x, y, halfW, halfH } of world.swimmers) {
    worst = Math.max(
      worst,
      halfW - x,
      x + halfW - world.width,
      halfH - y,
      y + halfH - world.height,
    );
  }

  return worst;
};

describe("World", () => {
  test.each(BOXES)(
    "keeps Siren and her mermaids inside a %i×%i box, even when a click lures her to a corner",
    (width, height) => {
      const world = new World();

      world.resize(width, height, 8, 12);

      let worst = -Infinity;

      run(world, 60, () => {
        if (world.time > world.lure.until && world.time % 10 < 5) {
          world.splash(2, 2);
        }

        worst = Math.max(worst, overflow(world));
      });

      expect(worst).toBeLessThanOrEqual(1e-6);
    },
  );

  test("moves the swimmers back inside when the box shrinks", () => {
    const world = new World();

    world.resize(900, 900, 8, 12);
    run(world, 5);
    world.resize(300, 300, 8, 12);

    expect(overflow(world)).toBeLessThanOrEqual(1e-6);
  });

  test("mermaids are a third of Siren and stay close to her", () => {
    const world = new World();

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

  test("scales Siren and her mermaids by swimmerScale", () => {
    const full = new World();
    const half = new World(0.5);

    full.resize(1400, 900, 8, 12);
    half.resize(1400, 900, 8, 12);

    expect(half.siren.length).toBeCloseTo(full.siren.length / 2);
    expect(half.mermaids[0].length).toBeCloseTo(full.mermaids[0].length / 2);
  });

  test("keeps the fish near the box", () => {
    const world = new World();

    world.resize(680, 860, 8, 12);
    run(world, 30);

    const outside = world.fish.filter(
      ({ x, y }) => x < -20 || x > world.width + 20 || y < -20 || y > world.height + 20,
    );

    expect(outside).toHaveLength(0);
  });

  test("fits the fish count to the box after a big resize", () => {
    const world = new World();

    world.resize(400, 400, 8, 12);
    world.resize(1400, 900, 8, 12);

    expect(world.fish).toHaveLength(fishCountFor(1400, 900));

    world.resize(400, 400, 8, 12);

    expect(world.fish).toHaveLength(fishCountFor(400, 400));
  });

  test("keeps the fish count through a small resize", () => {
    const world = new World();

    world.resize(1400, 900, 8, 12);
    const count = world.fish.length;

    world.resize(1400, 840, 8, 12);

    expect(world.fish).toHaveLength(count);
  });
});
