# FC26 Career Web – AI Agent Instructions

## Project Overview

**FC26 Career Web** is a React + Vite web application that generates ready-to-use Lua scripts for FIFA 26 Career Mode modding. Users configure custom players, teams, and gameplay settings through an intuitive UI; the app outputs Lua scripts for game modification tools.

### Core Purpose

- Player Builder: Create individual players with AI-suggested ratings based on position
- Squad Builder: Batch-generate players with team composition rules
- Utility Generators: Release clauses, happiness config, contract extensions, player locks, transfer blocks
- All outputs are deterministic Lua scripts ready to paste into game mod tools

---

## Tech Stack & Build Commands

**Framework:** React 19 + Vite 8 (using `@vitejs/plugin-react`)  
**Styling:** Plain CSS (no tailwind/styled-components)  
**State Management:** React `useState` + `useMemo` (no Redux/Context API)  
**Linting:** ESLint (plain JS/JSX, no TypeScript)

### Essential Commands

```bash
npm run dev      # Start dev server (Vite HMR enabled) → localhost:5173
npm run build    # Production build → dist/
npm run lint     # Run ESLint on src/
npm run preview  # Preview production build locally
```

**No test suite.** Manual testing via browser only. Consider adding tests before major refactors.

---

## Architecture & Component Structure

### Current State

- **Single component** (`App.jsx`) handles all state, UI, and generation logic
- **Modular utilities** (`utils.js`, `generators.js`, `constants.js`) for pure functions and templates

### Key Data Structures

**Player Object** (core data model)

```javascript
{
  firstName, lastName, jerseyName,   // strings
  age,                               // number (min 16, max 45)
  position,                          // string (e.g., "CB", "LW", "GK")
  nationality,                       // string (country name)
  height, weight,                    // numbers
  ratings: {
    pace, shooting, passing,
    dribbling, defending, physical   // each 0-99
  },
  overall                            // computed, position-weighted
}
```

**Rating Computation** (critical logic)

```javascript
// overall = weighted average of 6 rating categories
// weights vary by position (in POSITION_WEIGHTS)
// e.g., GK prioritizes defending & physical
//       ST prioritizes pace & shooting
```

### File Responsibilities

| File                   | Purpose                       | Key Exports                                                                           |
| ---------------------- | ----------------------------- | ------------------------------------------------------------------------------------- |
| `constants.js`         | Lookup tables, config         | `POSITION_WEIGHTS`, `NATIONALITIES`, `SKILL_TIERS`, `NAME_POOLS`                      |
| `utils.js`             | Pure calculations & helpers   | `computeSuggestedOverall()`, `buildRatingsFromTier()`, `clamp()`, `escapeLuaString()` |
| `generators.js`        | Lua template generation       | `generatePlayerLua()`, `generateSquadLua()`, other script generators                  |
| `App.jsx`              | Main UI & state orchestration | Screen routing, form state, memoized computations                                     |
| `App.css`, `index.css` | Styling                       | Global styles & layout                                                                |

---

## Core Conventions

### Naming

- **Functions:** `camelCase`; prefixes indicate intent
  - `handle*()` – event handlers (onClick, onChange)
  - `update*()` – state setters
  - `compute*()` – pure calculations returning values
  - `generate*()` – create Lua output
- **Constants:** `UPPER_CASE` (stored in `constants.js`)
- **React hooks:** Follow standard React naming (use `useState`, `useMemo`, etc.)

### State Management Pattern

```javascript
// ✓ CORRECT: Spread pattern for object state
setForm((prev) => ({ ...prev, age: 25 }));

// ✗ AVOID: Direct mutation
form.age = 25;
setForm(form);
```

### Memoization

- All expensive calculations use `useMemo` (Lua generation, filtering, ratings computation)
- Dependencies must be accurate to avoid stale closures
- Example: `generatePlayerLua()` result is memoized because it depends on form state

### Data Validation

- **Numeric ranges:** Use `clamp(value, min, max)` utility
- **Lua safety:** All strings interpolated into Lua use `escapeLuaString()` before inclusion
- **Position codes:** Hardcoded mapping (GK=0, RB=3, etc.) must match game schema

### Component Organization

- No sub-components currently; consider extracting UI sections into separate components if App.jsx exceeds 500 lines
- Keep render logic separate from business logic (memoization handles this currently)

---

## How Key Systems Work

### Position-Weighted Overall Rating

The `overall` field is **not** a simple average. It uses:

1. Look up `POSITION_WEIGHTS[position]` → weight object
2. Multiply each rating category by its weight
3. Clamp result to 0-99

**Impact:** A CB with high defending/physical but low pace still gets a high overall. A ST needs pace.

**When modifying:** Always verify position weights make sense for game balance.

### Lua Script Generation

- Templates in `generators.js` are large template strings with `${variable}` interpolation
- Each template must produce valid Lua syntax
- All user-provided strings (names, etc.) must be escaped via `escapeLuaString()` first

**Critical:** Generated scripts are copy-pasted directly into game tools—errors break gameplay. Test thoroughly.

### Form State Structure

- Single form object captures all UI inputs per screen
- Spread pattern for updates ensures React re-renders correctly
- Memoized generators re-run only when form deps change

---

## Common Pitfalls & What to Watch For

1. **Stale Closures with useMemo**
   - If generator output doesn't update, check memoization dependencies
   - Missing a dependency means stale Lua generation
2. **Position Code Mismatches**
   - Position strings (e.g., "CB") must map to numeric codes in generators
   - Game mod tools expect specific Lua position enums
3. **Lua String Escaping**
   - Always use `escapeLuaString()` before embedding user input (names, etc.) in templates
   - Unescaped quotes/backslashes break Lua syntax
4. **No TypeScript = Runtime Errors**
   - Player objects must match expected shape; no type checking at dev time
   - Test with edge cases (missing fields, extreme ages, etc.)
5. **Single Component Monolith**
   - App.jsx will become hard to maintain if logic grows
   - Early refactoring into feature sub-components is better than late
6. **ml5.js Face Detection (Non-Critical)**
   - Loads async; has timeout/fallback handlers
   - Don't block main flow on face detection failures

---

## Development Workflow

1. **Start dev server:** `npm run dev`
   - Vite HMR reloads on file changes instantly
   - Check console for React errors/warnings

2. **Test locally:** Open http://localhost:5173
   - Use all UI screens (Player Builder, Squad Builder, Utilities)
   - Copy generated Lua and verify syntax (multiline strings especially)

3. **Lint before commit:** `npm run lint`
   - Fixes auto-fixable issues: `npm run lint -- --fix`
   - Respect ESLint rules; disable only with comments explaining why

4. **Build for production:** `npm run build`
   - Outputs to `dist/`
   - Test preview: `npm run preview`

---

## What AI Should Do On First Ask

When asked to implement a feature or fix:

1. ✓ Understand how current state flows through the app
2. ✓ Check position weights / rating calculations if touching player logic
3. ✓ Verify Lua generation output (copy-paste to syntax highlighter if unsure)
4. ✓ Run `npm run lint` before suggesting code
5. ✓ Test manually in browser (screenshots/descriptions of new behavior appreciated)
6. ✗ Don't add TypeScript without discussion (migrating 1500+ lines is large change)
7. ✗ Don't refactor into sub-components without clear scope (stay focused on feature)

---

## Useful References

- **React 19 Docs:** https://react.dev (focus on `useState`, `useMemo`)
- **Vite Docs:** https://vitejs.dev (dev server, build config)
- **Lua Reference:** https://www.lua.org/manual/5.1/ (for validating script output)
- **Position Data:** Check `POSITION_WEIGHTS` in `constants.js` for position-to-rating mappings

---

## Questions for Clarification?

If anything here is unclear or conflicts with actual codebase behavior, ask me to clarify. This guide is a living document—update it as conventions evolve.
