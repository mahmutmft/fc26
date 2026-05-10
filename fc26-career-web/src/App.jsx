import { useMemo, useState } from 'react'
import './App.css'

const POSITION_WEIGHTS = {
  GK: { defending: 0.4, physical: 0.2, passing: 0.2, pace: 0.07, dribbling: 0.03, shooting: 0.1 },
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

const NAME_POOL_FIRST = [
  'Luca',
  'Mason',
  'Kai',
  'Noah',
  'Alex',
  'Niko',
  'Owen',
  'Milan',
  'Theo',
  'Ivan',
]

const NAME_POOL_LAST = [
  'Carter',
  'Novak',
  'Fisher',
  'Walker',
  'Silva',
  'Petrov',
  'Meyer',
  'Dawson',
  'Taylor',
  'Kovacs',
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

function expandStatsFromCategory(ratings, position = 'CM') {
  const stats = {}

  Object.entries(CATEGORY_FIELDS).forEach(([group, fields]) => {
    fields.forEach((fieldName) => {
      stats[fieldName] = ratings[group]
    })
  })

  if (position === 'GK') {
    stats.gkdiving = ratings.defending
    stats.gkhandling = ratings.defending
    stats.gkkicking = ratings.passing
    stats.gkpositioning = ratings.defending
    stats.gkreflexes = ratings.defending
  }

  return stats
}

function buildSquadPositions(config) {
  const positions = []

  const add = (position, count) => {
    for (let i = 0; i < count; i += 1) {
      positions.push(position)
    }
  }

  add('GK', 2)
  add('CB', 4)
  add('LB', 2)
  add('RB', 2)
  add('CM', config.cdmCmCount)
  if (config.includeCam) {
    add('CAM', 2)
  }
  add('LW', 2)
  add('RW', 2)
  add('ST', config.stCount)

  return positions
}

function generateSquadPlayers(config) {
  const positions = buildSquadPositions(config)

  return positions.map((position, idx) => {
    const first = NAME_POOL_FIRST[idx % NAME_POOL_FIRST.length]
    const last = NAME_POOL_LAST[Math.floor(idx / NAME_POOL_FIRST.length) % NAME_POOL_LAST.length]
    const age = randomInt(config.ageMin, config.ageMax)
    const height = position === 'GK' ? randomInt(188, 198) : randomInt(168, 192)
    const weight = position === 'GK' ? randomInt(78, 92) : randomInt(64, 86)
    const ratings = buildRatingsFromTier(position, config.skillTier)

    return {
      firstName: `${first}${idx + 1}`,
      lastName: last,
      jerseyName: toJerseyName(`${first}${idx + 1}`),
      position,
      nationality: config.nationality,
      age,
      height,
      weight,
      ratings,
      overall: computeSuggestedOverall(position, ratings),
    }
  })
}

function generateMultiLuaScript(players, teamName) {
  if (!players.length) {
    return '-- Generate squad preview first, then your batch Lua script will appear here.'
  }

  const safeTeamName = escapeLuaString(teamName || 'Custom Squad')

  const playerEntries = players
    .map((player) => {
      const statFields = expandStatsFromCategory(player.ratings, player.position)
      const statsLua = Object.entries(statFields)
        .map(([field, value]) => `${field} = ${Number(value)}`)
        .join(', ')

      return `    {
        first = "${escapeLuaString(player.firstName)}",
        last = "${escapeLuaString(player.lastName)}",
        jersey = "${escapeLuaString(player.jerseyName)}",
        position = ${POSITION_TO_CODE[player.position] ?? POSITION_TO_CODE.CM},
        nationality = ${Number(player.nationality)},
        age = ${Number(player.age)},
        height = ${Number(player.height)},
        weight = ${Number(player.weight)},
        overall = ${Number(player.overall)},
        stats = { ${statsLua} }
    }`
    })
    .join(',\n')

  return `-- Generated by FC26 Squad Builder
require 'imports/career_mode/helpers'
require 'imports/other/helpers'

if not IsInCM() then
    MessageBox("Error", "Must be in Career Mode!")
    return
end

math.randomseed(os.time())
local created_count = 0

local squad_name = "${safeTeamName}"
local players = {
${playerEntries}
}

local function get_free_player_id()
    local requested_playerid = 50000 + math.random(0, 49999)
    local playerid = requested_playerid

    if not PlayerExists(playerid) then return playerid end

    for i = 1, 5000 do
        local candidate = requested_playerid + i
        if not PlayerExists(candidate) then
            return candidate
        end
    end

    return 0
end

local function upsert_player_name(created_id, p)
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
        EditDBTableField("editedplayernames", existing_name_row, "firstname", p.first)
        EditDBTableField("editedplayernames", existing_name_row, "surname", p.last)
        EditDBTableField("editedplayernames", existing_name_row, "playerjerseyname", p.jersey)
    else
        InsertDBTableRow("editedplayernames", {
            playerid = string.format("%d", created_id),
            firstname = p.first,
            surname = p.last,
            commonname = "",
            playerjerseyname = p.jersey
        })
    end
end

for i = 1, #players do
    local p = players[i]
    local playerid = get_free_player_id()
    if playerid == 0 then
        Log("[SQUAD_BUILDER] Skipped one player, no free ID found")
        goto continue
    end

    local current_date = GetCurrentDate()
    local birthdate_date = DATE:new()
    birthdate_date.day = current_date.day
    birthdate_date.month = current_date.month
    birthdate_date.year = current_date.year - p.age
    local birthdate_days = birthdate_date:ToGregorianDays()

    local player_data = {
        overallrating = tostring(p.overall),
        potential = "99",
        preferredposition1 = tostring(p.position),
        preferredposition2 = "-1",
        preferredposition3 = "-1",
        preferredposition4 = "-1",
        nationality = tostring(p.nationality),
        birthdate = birthdate_days,
        height = tostring(p.height),
        weight = tostring(p.weight),
        gender = "0",
        usercaneditname = "1",
    }

    for key, val in pairs(p.stats) do
        player_data[key] = tostring(val)
    end

    local created_id = CreatePlayer(playerid, player_data)
    if created_id ~= 0 and PlayerExists(created_id) then
        upsert_player_name(created_id, p)
        created_count = created_count + 1
    else
        Log("[SQUAD_BUILDER] Failed to create: " .. p.first .. " " .. p.last)
    end

    ::continue::
end

if ReloadPlayersManager then
    ReloadPlayersManager()
end

MessageBox("Success", "Created " .. created_count .. " players for " .. squad_name .. " in Free Agents")
Log("[SQUAD_BUILDER] Completed. Created: " .. created_count)
`
}

function generateLuaScript(player) {
  const safeFirstName = escapeLuaString(player.firstName)
  const safeLastName = escapeLuaString(player.lastName)
  const safeJerseyName = escapeLuaString(player.jerseyName)
  const statFields = expandStatsFromCategory(player.ratings, player.position)
  const rows = [
    `overallrating = "${player.overall}"`,
    'potential = "99"',
    `preferredposition1 = "${POSITION_TO_CODE[player.position] ?? POSITION_TO_CODE.CM}"`,
    'preferredposition2 = "-1"',
    'preferredposition3 = "-1"',
    'preferredposition4 = "-1"',
    `nationality = "${player.nationality}"`,
    'birthdate = birthdate_days',
    `height = "${player.height}"`,
    `weight = "${player.weight}"`,
    'gender = "0"',
    'usercaneditname = "1"',
  ]

  Object.entries(statFields).forEach(([field, value]) => {
    rows.push(`${field} = "${value}"`)
  })

  const statBlock = rows.map((line) => `    ${line},`).join('\n')

  return `-- Generated by FC26 Career Builder v2
require 'imports/career_mode/helpers'
require 'imports/other/helpers'

if not IsInCM() then
    MessageBox("Error", "Must be in Career Mode!")
    return
end

local target_age = ${player.age}
local current_date = GetCurrentDate()
local birthdate_date = DATE:new()
birthdate_date.day = current_date.day
birthdate_date.month = current_date.month
birthdate_date.year = current_date.year - target_age
local birthdate_days = birthdate_date:ToGregorianDays()

math.randomseed(os.time())
local requested_playerid = 50000 + math.random(0, 49999)
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
    if player_row.birthdate ~= nil then
      EditDBTableField("players", player_row, "birthdate", tostring(birthdate_days))
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

local verify_rows = GetDBTableRows("players")
for i = 1, #verify_rows do
  local row = verify_rows[i]
  if tonumber(row.playerid) == created_id and row.birthdate ~= nil then
    local bd = DATE:new()
    bd:FromGregorianDays(tonumber(row.birthdate))
    local real_age = CalculatePlayerAge(GetCurrentDate(), bd)
    Log("[PLAYER_BUILDER] Verified age: " .. real_age .. " (target: " .. target_age .. ")")
    break
  end
end

MessageBox("Success", "Created ${safeFirstName} ${safeLastName} (ID: " .. created_id .. ") in Free Agents.")
Log("[PLAYER_BUILDER] Created player in Free Agents. Final ID: " .. created_id)
`
}

function App() {
  const [screen, setScreen] = useState('home')
  const [jerseyAuto, setJerseyAuto] = useState(true)
  const [squadConfig, setSquadConfig] = useState({
    teamName: 'Road To Glory FC',
    skillTier: 'casual',
    nationality: 14,
    ageMin: 18,
    ageMax: 24,
    includeCam: true,
    cdmCmCount: 5,
    stCount: 3,
  })
  const [squadPlayers, setSquadPlayers] = useState([])
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
        jerseyName: form.jerseyName || toJerseyName(form.firstName) || 'PLAYER',
        overall: suggestedOverall,
      }),
    [form, suggestedOverall],
  )

  const squadLuaScript = useMemo(
    () => generateMultiLuaScript(squadPlayers, squadConfig.teamName),
    [squadPlayers, squadConfig.teamName],
  )

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateFirstName(value) {
    setForm((prev) => {
      const updated = { ...prev, firstName: value }
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

  function syncJerseyToFirstName() {
    setJerseyAuto(true)
    updateField('jerseyName', toJerseyName(form.firstName))
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

  function applyTierRandomization(nextPosition, nextTier) {
    const randomized = buildRatingsFromTier(nextPosition, nextTier)
    setForm((prev) => ({
      ...prev,
      position: nextPosition,
      skillTier: nextTier,
      ratings: randomized,
    }))
  }

  function randomizeByTier() {
    applyTierRandomization(form.position, form.skillTier)
  }

  async function copyLuaScript() {
    try {
      await navigator.clipboard.writeText(luaScript)
      window.alert('Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  function updateSquadField(field, value) {
    setSquadConfig((prev) => ({ ...prev, [field]: value }))
  }

  function generateSquadPreview() {
    setSquadPlayers(generateSquadPlayers(squadConfig))
  }

  async function copySquadLuaScript() {
    try {
      await navigator.clipboard.writeText(squadLuaScript)
      window.alert('Squad Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  if (screen === 'home') {
    return (
      <main className="layout">
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Choose Your Builder Mode</h1>
          <p>Start with one custom player now, then move to full squad generation in the next step.</p>
        </header>

        <section className="home-grid">
          <article className="card home-card">
            <h2>Create One Player</h2>
            <p>Fast profile setup + smart ratings + Lua export for Free Agents.</p>
            <button type="button" onClick={() => setScreen('single')}>
              Open Single Player Builder
            </button>
          </article>

          <article className="card home-card muted">
            <h2>Build Full Squad</h2>
            <p>Starting XI + bench generation with role balance and smart depth rules.</p>
            <button type="button" onClick={() => setScreen('squad')}>
              Open Multi Squad Builder
            </button>
          </article>
        </section>
      </main>
    )
  }

  if (screen === 'squad') {
    const squadNation = NATIONALITY_OPTIONS.find((item) => item.id === Number(squadConfig.nationality)) || NATIONALITY_OPTIONS[0]
    const totalPlayers = buildSquadPositions(squadConfig).length

    return (
      <main className="layout">
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Multi Squad Builder</h1>
          <p>Create a full, balanced squad in one batch and export Lua for all players at once.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Squad Setup</h2>

            <div className="row two-col">
              <label>
                Team name
                <input value={squadConfig.teamName} onChange={(e) => updateSquadField('teamName', e.target.value)} />
              </label>
              <label>
                Skill tier
                <select value={squadConfig.skillTier} onChange={(e) => updateSquadField('skillTier', e.target.value)}>
                  {Object.entries(SKILL_TIERS).map(([key, tier]) => (
                    <option key={key} value={key}>
                      {tier.label} ({tier.min}-{tier.max})
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="row three-col">
              <label>
                Nation
                <select value={squadConfig.nationality} onChange={(e) => updateSquadField('nationality', Number(e.target.value))}>
                  {NATIONALITY_OPTIONS.map((nation) => (
                    <option key={nation.id} value={nation.id}>
                      {nation.flag} {nation.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Min age
                <input
                  type="number"
                  min="16"
                  max="35"
                  value={squadConfig.ageMin}
                  onChange={(e) => updateSquadField('ageMin', clamp(Number(e.target.value), 16, 35))}
                />
              </label>
              <label>
                Max age
                <input
                  type="number"
                  min="16"
                  max="35"
                  value={squadConfig.ageMax}
                  onChange={(e) => updateSquadField('ageMax', clamp(Number(e.target.value), 16, 35))}
                />
              </label>
            </div>

            <div className="row three-col">
              <label>
                CDM/CM count
                <select value={squadConfig.cdmCmCount} onChange={(e) => updateSquadField('cdmCmCount', Number(e.target.value))}>
                  <option value={4}>4</option>
                  <option value={5}>5</option>
                </select>
              </label>
              <label>
                ST count
                <select value={squadConfig.stCount} onChange={(e) => updateSquadField('stCount', Number(e.target.value))}>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </label>
              <label className="checkbox-line">
                <span>Include CAM pair</span>
                <input
                  type="checkbox"
                  checked={squadConfig.includeCam}
                  onChange={(e) => updateSquadField('includeCam', e.target.checked)}
                />
              </label>
            </div>

            <div className="home-grid">
              <button type="button" onClick={generateSquadPreview}>
                Generate Squad Preview
              </button>
              <button type="button" onClick={copySquadLuaScript}>
                Copy Squad Lua
              </button>
            </div>

            <section className="card depth-helper">
              <h2>Starting XI + Bench Helper</h2>
              <p>Recommended team depth for strong rotation without weak spots:</p>
              <div className="depth-grid">
                <div>
                  <h3>Goalkeepers</h3>
                  <p>GK: 2</p>
                  <p>1 starter, 1 backup</p>
                </div>
                <div>
                  <h3>Defenders</h3>
                  <p>CB: 4 (2 starters, 2 backups)</p>
                  <p>LB: 2, RB: 2</p>
                </div>
                <div>
                  <h3>Midfielders</h3>
                  <p>CDM/CM: 4-5 (rotation + injuries)</p>
                  <p>CAM: 2 (if formation uses CAM)</p>
                </div>
                <div>
                  <h3>Attackers</h3>
                  <p>LW: 2, RW: 2</p>
                  <p>ST: 2-3</p>
                </div>
              </div>
              <p className="hint">This gives you: strong starting XI, full bench, and reliable rotation depth.</p>
            </section>
          </article>

          <aside className="card summary-card">
            <h2>Squad Summary</h2>
            <div className="summary-header">
              <strong>{squadConfig.teamName}</strong>
              <span>
                {squadNation.flag} {squadNation.label}
              </span>
              <span>
                Tier: {SKILL_TIERS[squadConfig.skillTier].label} · Players: {totalPlayers}
              </span>
            </div>

            <div className="pill-row two-pills">
              <div className="pill">
                <span>Age Range</span>
                <strong>
                  {squadConfig.ageMin}-{squadConfig.ageMax}
                </strong>
              </div>
              <div className="pill">
                <span>Generated</span>
                <strong>{squadPlayers.length}</strong>
              </div>
            </div>

            <div className="player-preview-list">
              {squadPlayers.length === 0 ? (
                <p className="hint">Generate squad preview to see all players and batch Lua.</p>
              ) : (
                squadPlayers.map((player, idx) => (
                  <div className="preview-row" key={`${player.firstName}-${player.lastName}-${idx}`}>
                    <span>
                      {idx + 1}. {player.firstName} {player.lastName}
                    </span>
                    <strong>
                      {player.position} · {player.overall}
                    </strong>
                  </div>
                ))
              )}
            </div>

            <div className="lua-header">
              <h3>Squad Lua</h3>
              <button type="button" onClick={copySquadLuaScript}>
                Copy
              </button>
            </div>
            <textarea readOnly value={squadLuaScript} rows={22} />
          </aside>
        </section>
      </main>
    )
  }

  return (
    <main className="layout">
      <header className="hero">
        <p className="eyebrow">FC26 Career Mode Tool</p>
        <h1>Player Builder + Lua Generator</h1>
        <p>Build one realistic custom player fast, then generate Lua that creates him directly in Free Agents.</p>
        <div className="hero-actions">
          <button type="button" onClick={() => setScreen('home')}>
            Back To Home
          </button>
        </div>
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
                onChange={(e) => updateFirstName(e.target.value)}
              />
            </label>
            <label className="field-dark">
              Last name
              <input value={form.lastName} placeholder="Enter last name" onChange={(e) => updateField('lastName', e.target.value)} />
            </label>
          </div>

          <div className="row two-col">
            <label>
              Jersey name
              <input value={form.jerseyName} placeholder="Auto from first name" onChange={(e) => updateJerseyName(e.target.value)} />
            </label>
            <div className="inline-actions">
              <button type="button" onClick={syncJerseyToFirstName}>
                Use First Name
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
              <select value={form.position} onChange={(e) => applyTierRandomization(e.target.value, form.skillTier)}>
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
              <select value={form.skillTier} onChange={(e) => applyTierRandomization(form.position, e.target.value)}>
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
                  style={{ '--pct': `${((value - 35) / 64) * 100}%` }}
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
