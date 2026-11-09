# UI

Shared components that the apps use. Each component is free of app content.

## Language

### Pixel Loader

**Pixel Loader**:\
A 3×3 or 5×5 grid of cells that light up in a timed pattern to show that content is loading.\
_Avoid_: Spinner, pixel wave icon

**Pixel Pattern**:\
The order in which the cells of a Pixel Loader light up, such as ripple, radar, or rain.\
_Avoid_: Preset, wave

### Pixel effects

**Dia Colors**:\
The five colors of the pixel effects, from pink through orange and yellow to lime.\
_Avoid_: Rainbow, gradient

### Ascii Ocean

**Ascii Ocean**:\
A canvas that draws fish schools and the sharks that hunt them as ASCII cells. It fills its parent and keeps every animal inside it.\
_Avoid_: Shark animation, aquarium

**School**:\
A group of fish of one species that swim together. A school forms a ribbon, a swarm, or a bait ball by its species.\
_Avoid_: Flock, swarm

**Lure**:\
The spot of a click. Sharks circle it for a short time.\
_Avoid_: Target, bait

**Wake**:\
The faint trail of lit cells that an animal leaves as it swims.\
_Avoid_: Trail, ripple
