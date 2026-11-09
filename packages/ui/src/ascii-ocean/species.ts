export interface FishSpecies {
  name: string;
  cruise: number;
  maxSpeed: number;
  minSpeed: number;
  /** Relative odds that a new school is this species. */
  weight: number;
  schoolSize: [number, number];
  /** Personal space in grid cells (x, y), so each fish gets its own glyph. */
  spacing: [number, number];
  // Behavior weights. Different mixes give different group shapes (Couzin et al. 2002): strong
  // alignment gives polarized schools and ribbons, low alignment gives swarms, and a tangential
  // pull gives a mill.
  align: number;
  cohesion: number;
  jitter: number;
  /** Tangential pull around the local center. Above 0, the school spins into a bait ball. */
  mill: number;
  /** Damps vertical speed, because real fish mostly cruise level. */
  verticalDrag: number;
}

export const FISH_SPECIES: readonly FishSpecies[] = [
  {
    name: "sardine",
    cruise: 36,
    maxSpeed: 64,
    minSpeed: 18,
    weight: 3,
    schoolSize: [18, 28],
    spacing: [1.8, 1.1],
    align: 1.6,
    cohesion: 1.6,
    jitter: 40,
    mill: 70,
    verticalDrag: 0.5,
  },
  {
    name: "anchovy",
    cruise: 46,
    maxSpeed: 78,
    minSpeed: 22,
    weight: 3,
    schoolSize: [20, 32],
    spacing: [1.5, 1],
    align: 3.2,
    cohesion: 0.45,
    jitter: 30,
    mill: 0,
    verticalDrag: 1.4,
  },
  {
    name: "silverside",
    cruise: 40,
    maxSpeed: 70,
    minSpeed: 20,
    weight: 3,
    schoolSize: [12, 20],
    spacing: [2, 1.1],
    align: 2.4,
    cohesion: 1.1,
    jitter: 35,
    mill: 0,
    verticalDrag: 1.6,
  },
  {
    name: "mackerel",
    cruise: 32,
    maxSpeed: 60,
    minSpeed: 16,
    weight: 2,
    schoolSize: [5, 9],
    spacing: [2.6, 1.3],
    align: 2,
    cohesion: 0.9,
    jitter: 25,
    mill: 0,
    verticalDrag: 2,
  },
  {
    name: "goby",
    cruise: 26,
    maxSpeed: 56,
    minSpeed: 10,
    weight: 1,
    schoolSize: [8, 12],
    spacing: [1.4, 1.1],
    align: 0.35,
    cohesion: 1.4,
    jitter: 110,
    mill: 0,
    verticalDrag: 0.3,
  },
];

const TOTAL_WEIGHT = FISH_SPECIES.reduce((sum, species) => sum + species.weight, 0);

/** Returns the index of a random species, weighted by `weight`. */
export const pickSpecies = () => {
  let r = Math.random() * TOTAL_WEIGHT;

  for (const [index, species] of FISH_SPECIES.entries()) {
    r -= species.weight;

    if (r <= 0) {
      return index;
    }
  }

  return 0;
};

/** The species at `index`. Falls back to the first species, so callers never get `undefined`. */
export const speciesAt = (index: number): FishSpecies => {
  const species = FISH_SPECIES[index] ?? FISH_SPECIES[0];

  if (species === undefined) {
    throw new Error("No fish species defined");
  }

  return species;
};
