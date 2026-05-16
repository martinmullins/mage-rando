# VOID RITES

> *The old ones stir beneath the fractured sky. You hold the ritual fragments — shards of shattered reality cast as dice. Slot them into your cursed artifacts. Feed the void. Survive.*

A Dicey Dungeons-inspired eldritch roguelike built with [play-cljs](https://github.com/oakes/play-cljs) (ClojureScript + p5.js).

---

## Theme

**Ancient God Horror** — You are a cultist descending into eldritch dungeons, slotting ritual fragment dice into cursed artifacts and forbidden spells to battle creatures from the void between stars.

Dice = **Ritual Fragments** 
Equipment slots = **Cursed Artifacts & Forbidden Spells** 
Enemies = **Eldritch Entities** (Heralds, Watchers, Choirs, Sleepers)

---

## Gameplay

- **3 floors**, each with eldritch enemies
- Roll dice each turn — place them into artifact/spell slots
- Each artifact activates an effect when its slots are filled correctly
- Manage **HP** (health) and **SANITY** (some enemies drain sanity instead of dealing damage)
- Between floors, choose one **loot item** (artifact or spell) to add to your build
- Reach and defeat **The Sleeper Beneath All Things** to win

### Controls
- Click a **die** to select it
- Click an **artifact slot** to place the selected die
- Click an **artifact card** body to **activate** it (if slots are correctly filled)
- **REROLL** button: reroll all unslotted dice (1 free reroll per turn)
- **END TURN**: execute enemy's telegraphed attack, then start next turn

---

## Setup

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- [Java](https://adoptium.net/) 11+ (for ClojureScript compilation)
- [Clojure CLI](https://clojure.org/guides/install_clojure)

### Install & Run

```bash
npm install
npm run dev
```

Then open `http://localhost:8080` in your browser.

### Production Build

```bash
npm run build
npm run server
```

---

## Project Structure

```
src/void_rites/
  core.cljs        # Game loop, play-cljs integration
  state.cljs       # Game state atom, state mutation fns
  constants.cljs   # Colors, enemies, artifacts, spells, floors
  render.cljs      # All drawing/rendering functions
  input.cljs       # Mouse click/hover handlers
  effects.cljs     # Equipment effect resolution
  loot.cljs        # Loot generation between floors
resources/public/
  index.html       # Entry point
```

---

## Visual Style

Clean vector flat design — bold geometric shapes, deep void-purple/black palette with violet and blood-red accents. No pixel art, no gradients — every shape is a crisp rectangle or circle.
