# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

**FC26 Career Web** — a React + Vite web app that generates ready-to-use Lua scripts for FIFA 26 Career Mode modding. Users configure players, squads, and gameplay settings through the UI; the app outputs Lua for game mod tools (FC26 Live Editor).

Features: Single Player Builder, Multi-Squad Generator, Team Wipe, Team Happiness, Contract Extension, Player Lock, Transfer Blocker, Lua Import Tool.

## Commands

```bash
npm run dev      # Dev server with HMR → http://localhost:5173
npm run build    # Production build → dist/
npm run lint     # ESLint on src/
npm run preview  # Preview production build
```

No test suite — manual browser testing only.

## Architecture

The codebase has a clear 4-layer dependency chain:

```
constants.js  →  utils.js  →  generators.js  →  App.jsx
(data/config)    (pure fns)   (Lua templates)   (UI + state)
```

**`constants.js`** — All lookup tables: `POSITION_WEIGHTS` (13 positions × 6 rating weights that sum to 1.0), `POSITION_TO_CODE` (position string → FIFA numeric code), `SKILL_TIERS` (5 tiers with overall ranges), `NATIONALITY_OPTIONS`, `NAME_POOL_FIRST/LAST`, `CATEGORY_FIELDS`.

**`utils.js`** — Pure helpers: `clamp()`, `computeSuggestedOverall()` (position-weighted), `buildRatingsFromTier()` (tier + position → randomized ratings), `escapeLuaString()`, `generateSquadPlayers()` (24-player roster builder).

**`generators.js`** — Lua template functions for each feature. All user strings must go through `escapeLuaString()` before embedding. Output is copy-pasted directly into game tools — syntax errors break gameplay.

**`App.jsx`** — ~1375-line monolith holding all screen routing, form state, and memoized generators. No sub-components currently.

## Critical Conventions

**Overall rating** is position-weighted, not a simple average. `computeSuggestedOverall()` multiplies each of the 6 rating categories by `POSITION_WEIGHTS[position]` weights. Changing player logic requires verifying weights stay sensible.

**State updates** must use the spread pattern:
```javascript
setForm(prev => ({ ...prev, age: 25 }))  // correct
```

**Lua escaping** — always `escapeLuaString()` on any user-provided string before interpolating into a generator template. Missing this breaks Lua syntax.

**Position codes** — position strings like `"CB"` map to numeric FIFA codes via `POSITION_TO_CODE`. These must match the game schema exactly.

**`useMemo` dependencies** — all expensive calculations (Lua generation, rating computation) are memoized. Missing a dependency causes stale output without errors.

**Function naming prefixes:** `handle*` (event handlers), `compute*` (pure calculations), `generate*` (Lua output), `update*` (state setters).

## What Not To Do

- Don't add TypeScript without discussion — migrating ~1500 lines is a large change.
- Don't refactor App.jsx into sub-components unless that's the stated goal — stay focused on the feature.
- Don't skip `escapeLuaString()` when adding new generators.
- Don't lint-disable without an inline comment explaining why.
