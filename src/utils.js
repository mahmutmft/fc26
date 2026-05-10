import { POSITION_WEIGHTS, CATEGORY_FIELDS, SKILL_TIERS, POSITION_TO_CODE, NAME_POOL_FIRST, NAME_POOL_LAST } from './constants'

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value))

export const parseNumberInput = (rawValue, fallback) => {
  if (String(rawValue).trim() === '') return fallback
  const nextValue = Number(rawValue)
  return Number.isFinite(nextValue) ? nextValue : fallback
}

export const escapeLuaString = (value) => String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"')

export function toJerseyName(lastName) {
  return String(lastName || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase()
    .slice(0, 16)
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function categoryAverage(ratings) {
  return Math.round(
    (ratings.pace + ratings.shooting + ratings.passing + ratings.dribbling + ratings.defending + ratings.physical) / 6,
  )
}

export function computeSuggestedOverall(position, ratings) {
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

export function buildRatingsFromTier(position, tierKey) {
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

export function expandStatsFromCategory(ratings, position = 'CM') {
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

export function collapseStatsToCategoryRatings(stats = {}, position = 'CM') {
  const ratings = {}

  Object.entries(CATEGORY_FIELDS).forEach(([group, fields]) => {
    const values = fields
      .map((fieldName) => Number(stats[fieldName]))
      .filter((value) => Number.isFinite(value))

    if (values.length) {
      const sum = values.reduce((acc, value) => acc + value, 0)
      ratings[group] = clamp(Math.round(sum / values.length), 35, 99)
    } else {
      ratings[group] = 55
    }
  })

  if (position === 'GK') {
    const gkValues = [stats.gkdiving, stats.gkhandling, stats.gkpositioning, stats.gkreflexes]
      .map((value) => Number(value))
      .filter((value) => Number.isFinite(value))
    if (gkValues.length) {
      const sum = gkValues.reduce((acc, value) => acc + value, 0)
      ratings.defending = clamp(Math.round(sum / gkValues.length), 35, 99)
    }
  }

  return ratings
}

export function buildSquadPositions(config) {
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

export function generateSquadPlayers(config) {
  const positions = buildSquadPositions(config)

  return positions.map((position, idx) => {
    const first = NAME_POOL_FIRST[idx % NAME_POOL_FIRST.length]
    const last = NAME_POOL_LAST[Math.floor(idx / NAME_POOL_FIRST.length) % NAME_POOL_LAST.length]
    const age = randomInt(config.ageMin, config.ageMax)
    const height = position === 'GK' ? randomInt(188, 198) : randomInt(168, 192)
    const weight = position === 'GK' ? randomInt(78, 92) : randomInt(64, 86)
    const ratings = buildRatingsFromTier(position, config.skillTier)

    let priority = 'Reserves'
    if (idx < 11) priority = 'XI'
    else if (idx < 18) priority = 'Subs'

    return {
      slotId: idx + 1,
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
      priority,
    }
  })
}
