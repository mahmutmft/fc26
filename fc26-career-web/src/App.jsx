import { useMemo, useState } from 'react'
import './App.css'

const POSITION_WEIGHTS = {
  ST: { shooting: 0.35, pace: 0.2, dribbling: 0.2, physical: 0.15, passing: 0.07, defending: 0.03 },
  CF: { shooting: 0.3, dribbling: 0.24, passing: 0.2, pace: 0.15, physical: 0.08, defending: 0.03 },
  CAM: { passing: 0.34, dribbling: 0.25, pace: 0.12, shooting: 0.16, physical: 0.08, defending: 0.05 },
  CM: { passing: 0.3, dribbling: 0.16, defending: 0.2, physical: 0.14, pace: 0.1, shooting: 0.1 },
  CDM: { defending: 0.34, physical: 0.24, passing: 0.2, pace: 0.1, dribbling: 0.07, shooting: 0.05 },
  CB: { defending: 0.4, physical: 0.28, pace: 0.15, passing: 0.1, dribbling: 0.03, shooting: 0.04 },
  LB: { pace: 0.24, defending: 0.24, passing: 0.18, physical: 0.15, dribbling: 0.13, shooting: 0.06 },
  RB: { pace: 0.24, defending: 0.24, passing: 0.18, physical: 0.15, dribbling: 0.13, shooting: 0.06 },
  LM: { pace: 0.24, dribbling: 0.24, passing: 0.22, shooting: 0.16, physical: 0.08, defending: 0.06 },
  RM: { pace: 0.24, dribbling: 0.24, passing: 0.22, shooting: 0.16, physical: 0.08, defending: 0.06 },
  LW: { pace: 0.24, dribbling: 0.3, shooting: 0.21, passing: 0.14, physical: 0.07, defending: 0.04 },
  RW: { pace: 0.24, dribbling: 0.3, shooting: 0.21, passing: 0.14, physical: 0.07, defending: 0.04 },
}

const POSITION_TO_CODE = {
  GK: 0,
  RB: 3,
  CB: 5,
  LB: 7,
  CDM: 10,
  RM: 12,
  CM: 14,
  LM: 16,
  CAM: 18,
  CF: 21,
  RW: 23,
  ST: 25,
  LW: 27,
}

const CATEGORY_FIELDS = {
  pace: ['acceleration', 'sprintspeed'],
  shooting: ['finishing', 'shotpower', 'positioning', 'volleys', 'longshots'],
  passing: ['shortpassing', 'longpassing', 'crossing', 'vision'],
  dribbling: ['dribbling', 'ballcontrol', 'agility', 'balance'],
  defending: ['defensiveawareness', 'standingtackle', 'slidingtackle', 'interceptions'],
  physical: ['strength', 'stamina', 'jumping', 'aggression'],
}

const SKILL_TIERS = {
  noobie: { min: 48, max: 58, label: 'Noobie' },
  casual: { min: 56, max: 66, label: 'Casual' },
  semipro: { min: 64, max: 74, label: 'Semi-Pro' },
  pro: { min: 72, max: 82, label: 'Pro' },
  worldclass: { min: 82, max: 92, label: 'World Class' },
}

const NATIONALITY_OPTIONS = [
  { id: 14, label: 'England', flag: 'EN' },
  { id: 37, label: 'Poland', flag: 'PL' },
  { id: 38, label: 'Portugal', flag: 'PT' },
  { id: 45, label: 'Spain', flag: 'ES' },
  { id: 18, label: 'France', flag: 'FR' },
  { id: 21, label: 'Germany', flag: 'DE' },
  { id: 27, label: 'Italy', flag: 'IT' },
  { id: 34, label: 'Netherlands', flag: 'NL' },
  { id: 7, label: 'Argentina', flag: 'AR' },
  { id: 54, label: 'Brazil', flag: 'BR' },
]

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const escapeLuaString = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

function toJerseyName(lastName) {
  return String(lastName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, 16)
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function categoryAverage(ratings) {
  return Math.round(
    (ratings.pace + ratings.shooting + ratings.passing + ratings.dribbling + ratings.defending + ratings.physical) / 6,
  )
}

function computeSuggestedOverall(position, ratings) {
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.CM
  const weighted =
    ratings.pace * weights.pace +
    ratings.shooting * weights.shooting +
    ratings.passing * weights.passing +
    ratings.dribbling * weights.dribbling +
    ratings.defending * weights.defending +
    ratings.physical * weights.physical

  return clamp(Math.round(weighted), 40, 97)
}

function buildRatingsFromTier(position, tierKey) {
  const tier = SKILL_TIERS[tierKey] || SKILL_TIERS.casual
  const targetOvr = randomInt(tier.min, tier.max)
  const weights = POSITION_WEIGHTS[position] || POSITION_WEIGHTS.CM
  const categories = ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical']

  const rawRatings = {}
  categories.forEach((key) => {
    const weightDelta = weights[key] - 1 / 6
    const structuralBias = Math.round(weightDelta * 72)
    const noise = randomInt(-4, 4)
    rawRatings[key] = clamp(targetOvr + structuralBias + noise, 35, 99)
  })

  const generatedOverall = computeSuggestedOverall(position, rawRatings)
  const diff = targetOvr - generatedOverall

  const balanced = {}
  categories.forEach((key) => {
    balanced[key] = clamp(rawRatings[key] + diff, 35, 99)
  })

  return balanced
}

function expandStatsFromCategory(ratings) {
  const stats = {}

  Object.entries(CATEGORY_FIELDS).forEach(([group, fields]) => {
    fields.forEach((fieldName) => {
      stats[fieldName] = ratings[group]
    })
  })

  return stats
}

function generateLuaScript(player) {
  const safeFirstName = escapeLuaString(player.firstName)
  const safeLastName = escapeLuaString(player.lastName)
  const safeJerseyName = escapeLuaString(player.jerseyName)
  const statFields = expandStatsFromCategory(player.ratings)
  const rows = [
    `overallrating = "${player.overall}"`,
    'potential = "99"',
    `preferredposition1 = "${POSITION_TO_CODE[player.position] ?? POSITION_TO_CODE.CM}"`,
    'preferredposition2 = "-1"',
    'preferredposition3 = "-1"',
    'preferredposition4 = "-1"',
    `nationality = "${player.nationality}"`,
    `height = "${player.height}"`,
    `weight = "${player.weight}"`,
    'gender = "0"',
    'usercaneditname = "1"',
  ]

  Object.entries(statFields).forEach(([field, value]) => {
    rows.push(`${field} = "${value}"`)
  })

  const statBlock = rows.map((line) => `    ${line},`).join('\n')

  return `-- Generated by FC26 Career Builder
require 'imports/career_mode/helpers'

if not IsInCM() then
    MessageBox("Error", "Must be in Career Mode!")
    return
end

math.randomseed(os.time())
local requested_playerid = 50000 + math.random(0, 400000)
local playerid = requested_playerid

if PlayerExists(playerid) then
    local found_free_id = false
    for i = 1, 5000 do
        local candidate = requested_playerid + i
        if not PlayerExists(candidate) then
            playerid = candidate
            found_free_id = true
            break
        end
    end

    if not found_free_id then
        Log("[PLAYER_BUILDER] Could not find free Player ID after: " .. requested_playerid)
        MessageBox("Error", "No free Player ID found in next 5000 values.")
        return
    end

    Log("[PLAYER_BUILDER] Requested ID " .. requested_playerid .. " exists. Using " .. playerid)
end

local player_data = {
${statBlock}
}

local created_id = CreatePlayer(playerid, player_data)
if created_id == 0 then
    Log("[PLAYER_BUILDER] CreatePlayer failed for ID: " .. playerid)
    MessageBox("Error", "CreatePlayer failed. Check Lua log.")
    return
end

if not PlayerExists(created_id) then
    Log("[PLAYER_BUILDER] Player missing after create. ID: " .. created_id)
    MessageBox("Error", "Player creation did not persist.")
    return
end

local edited_names_rows = GetDBTableRows("editedplayernames")
local existing_name_row = nil
for i = 1, #edited_names_rows do
    local row = edited_names_rows[i]
    if tonumber(row.playerid) == created_id then
        existing_name_row = row
        break
    end
end

if existing_name_row then
    EditDBTableField("editedplayernames", existing_name_row, "firstname", "${safeFirstName}")
    EditDBTableField("editedplayernames", existing_name_row, "surname", "${safeLastName}")
    EditDBTableField("editedplayernames", existing_name_row, "playerjerseyname", "${safeJerseyName}")
    Log("[PLAYER_BUILDER] Name row updated for ID: " .. created_id)
else
    local name_row = InsertDBTableRow("editedplayernames", {
        playerid = string.format("%d", created_id),
        firstname = "${safeFirstName}",
        surname = "${safeLastName}",
        commonname = "",
        playerjerseyname = "${safeJerseyName}"
    })

    if not name_row then
        Log("[PLAYER_BUILDER] Could not insert editedplayernames row for ID: " .. created_id)
    else
        Log("[PLAYER_BUILDER] Name row inserted for ID: " .. created_id)
    end
end

local players_rows = GetDBTableRows("players")
local player_row = nil
for i = 1, #players_rows do
    local row = players_rows[i]
    if tonumber(row.playerid) == created_id then
        player_row = row
        break
    end
end

if player_row then
    if player_row.usercaneditname ~= nil then
        EditDBTableField("players", player_row, "usercaneditname", "1")
    end
    if player_row.firstnameid ~= nil then
        EditDBTableField("players", player_row, "firstnameid", "0")
    end
    if player_row.surnameid ~= nil then
        EditDBTableField("players", player_row, "surnameid", "0")
    end
    if player_row.commonnameid ~= nil then
        EditDBTableField("players", player_row, "commonnameid", "0")
    end
    if player_row.knownas ~= nil then
        EditDBTableField("players", player_row, "knownas", "0")
    end
end

if ReloadPlayersManager then
    ReloadPlayersManager()
end

MessageBox("Success", "Created ${safeFirstName} ${safeLastName} (ID: " .. created_id .. ") in Free Agents.")
Log("[PLAYER_BUILDER] Created player in Free Agents. Final ID: " .. created_id)
`
}

function App() {
  const [jerseyAuto, setJerseyAuto] = useState(true)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    jerseyName: '',
    age: 22,
    position: 'CB',
    skillTier: 'casual',
    nationality: 14,
    height: 184,
    weight: 78,
    ratings: {
      pace: 58,
      shooting: 43,
      passing: 57,
      dribbling: 53,
      defending: 65,
      physical: 66,
    },
  })

  const suggestedOverall = useMemo(() => computeSuggestedOverall(form.position, form.ratings), [form.position, form.ratings])
  const averageCategory = useMemo(() => categoryAverage(form.ratings), [form.ratings])

  const nationality = useMemo(
    () => NATIONALITY_OPTIONS.find((item) => item.id === Number(form.nationality)) || NATIONALITY_OPTIONS[0],
    [form.nationality],
  )

  const luaScript = useMemo(
    () =>
      generateLuaScript({
        ...form,
        firstName: form.firstName || 'Career',
        lastName: form.lastName || 'Player',
        jerseyName: form.jerseyName || toJerseyName(form.lastName) || 'PLAYER',
        overall: suggestedOverall,
      }),
    [form, suggestedOverall],
  )

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateLastName(value) {
    setForm((prev) => {
      const updated = { ...prev, lastName: value }
      if (jerseyAuto) {
        updated.jerseyName = toJerseyName(value)
      }
      return updated
    })
  }

  function updateJerseyName(value) {
    setJerseyAuto(false)
    updateField('jerseyName', toJerseyName(value))
  }

  function syncJerseyToLastName() {
    setJerseyAuto(true)
    updateField('jerseyName', toJerseyName(form.lastName))
  }

  function updateRating(field, value) {
    const numberValue = Number(value)
    setForm((prev) => ({
      ...prev,
      ratings: {
        ...prev.ratings,
        [field]: numberValue,
      },
    }))
  }

  function randomizeByTier() {
    const randomized = buildRatingsFromTier(form.position, form.skillTier)
    setForm((prev) => ({ ...prev, ratings: randomized }))
  }

  async function copyLuaScript() {
    try {
      await navigator.clipboard.writeText(luaScript)
      window.alert('Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">FC26 Career Mode Tool</p>
        <h1>Player Builder + Lua Generator</h1>
        <p>Build one realistic custom player fast, then generate Lua that creates him directly in Free Agents.</p>
      </header>

      <section className="grid">
        <article className="card form-card">
          <h2>Player Profile</h2>

          <div className="row two-col">
            <label className="field-dark">
              First name
              <input
                value={form.firstName}
                placeholder="Enter first name"
                onChange={(e) => updateField('firstName', e.target.value)}
              />
            </label>
            <label className="field-dark">
              Last name
              <input value={form.lastName} placeholder="Enter last name" onChange={(e) => updateLastName(e.target.value)} />
            </label>
          </div>

          <div className="row two-col">
            <label>
              Jersey name
              <input value={form.jerseyName} placeholder="Auto from last name" onChange={(e) => updateJerseyName(e.target.value)} />
            </label>
            <div className="inline-actions">
              <button type="button" onClick={syncJerseyToLastName}>
                Use Last Name
              </button>
              <small>{jerseyAuto ? 'Auto mode active' : 'Manual mode active'}</small>
            </div>
          </div>

          <div className="row three-col">
            <label>
              Age
              <input
                type="number"
                min="15"
                max="40"
                value={form.age}
                onChange={(e) => updateField('age', clamp(Number(e.target.value), 15, 40))}
              />
            </label>
            <label>
              Position
              <select value={form.position} onChange={(e) => updateField('position', e.target.value)}>
                {Object.keys(POSITION_WEIGHTS).map((positionKey) => (
                  <option key={positionKey} value={positionKey}>
                    {positionKey}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Nation
              <select value={form.nationality} onChange={(e) => updateField('nationality', Number(e.target.value))}>
                {NATIONALITY_OPTIONS.map((nation) => (
                  <option key={nation.id} value={nation.id}>
                    {nation.flag} {nation.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="row two-col">
            <label>
              Height (cm)
              <input
                type="number"
                min="150"
                max="210"
                value={form.height}
                onChange={(e) => updateField('height', clamp(Number(e.target.value), 150, 210))}
              />
            </label>
            <label>
              Weight (kg)
              <input
                type="number"
                min="50"
                max="120"
                value={form.weight}
                onChange={(e) => updateField('weight', clamp(Number(e.target.value), 50, 120))}
              />
            </label>
          </div>

          <h3>Rating Questions</h3>
          <p className="hint">Pick a tier, then randomize smartly for your position. You can still tweak sliders manually.</p>

          <div className="tier-row">
            <label>
              Skill tier
              <select value={form.skillTier} onChange={(e) => updateField('skillTier', e.target.value)}>
                {Object.entries(SKILL_TIERS).map(([key, tier]) => (
                  <option key={key} value={key}>
                    {tier.label} ({tier.min}-{tier.max})
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={randomizeByTier}>
              Randomize Smart
            </button>
          </div>

          <div className="slider-group">
            {Object.entries(form.ratings).map(([key, value]) => (
              <label key={key}>
                <span>{key}</span>
                <input
                  type="range"
                  min="35"
                  max="99"
                  value={value}
                  onChange={(e) => updateRating(key, e.target.value)}
                />
                <strong>{value}</strong>
              </label>
            ))}
          </div>
        </article>

        <aside className="card summary-card">
          <h2>Build Summary</h2>
          <div className="summary-header">
            <strong>
              {form.firstName || 'First'} {form.lastName || 'Last'}
            </strong>
            <span>
              {form.position} · age {form.age}
            </span>
            <span>
              {nationality.flag} {nationality.label}
            </span>
          </div>

          <div className="pill-row two-pills">
            <div className="pill">
              <span>Auto OVR</span>
              <strong>{suggestedOverall}</strong>
            </div>
            <div className="pill">
              <span>Potential</span>
              <strong>99</strong>
            </div>
          </div>

          <div className="pill-row two-pills">
            <div className="pill">
              <span>Category Avg</span>
              <strong>{averageCategory}</strong>
            </div>
            <div className="pill">
              <span>Tier</span>
              <strong>{SKILL_TIERS[form.skillTier].label}</strong>
            </div>
          </div>

          <p className="hint">Player will be created in Free Agents with auto-generated free Player ID and proper name fields.</p>

          <div className="lua-header">
            <h3>Generated Lua</h3>
            <button type="button" onClick={copyLuaScript}>
              Copy
            </button>
          </div>
          <textarea readOnly value={luaScript} rows={22} />
        </aside>
      </section>

      <footer className="next-step">
        <p>Next: multi-player squad builder for you and friends with one-click batch Lua export.</p>
      </footer>
    </main>
  )
}

export default App
