export const POSITION_WEIGHTS = {
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

export const POSITION_TO_CODE = {
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

export const CATEGORY_FIELDS = {
  pace: ['acceleration', 'sprintspeed'],
  shooting: ['finishing', 'shotpower', 'positioning', 'volleys', 'longshots'],
  passing: ['shortpassing', 'longpassing', 'crossing', 'vision'],
  dribbling: ['dribbling', 'ballcontrol', 'agility', 'balance'],
  defending: ['defensiveawareness', 'standingtackle', 'slidingtackle', 'interceptions'],
  physical: ['strength', 'stamina', 'jumping', 'aggression'],
}

export const SKILL_TIERS = {
  noobie: { min: 48, max: 58, label: 'Noobie' },
  casual: { min: 56, max: 66, label: 'Casual' },
  semipro: { min: 64, max: 74, label: 'Semi-Pro' },
  pro: { min: 72, max: 82, label: 'Pro' },
  worldclass: { min: 82, max: 92, label: 'World Class' },
}

export const NATIONALITY_OPTIONS = [
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

export const NAME_POOL_FIRST = [
  'Luca', 'Mason', 'Kai', 'Noah', 'Alex', 'Niko', 'Owen', 'Milan', 'Theo', 'Ivan',
]

export const NAME_POOL_LAST = [
  'Carter', 'Novak', 'Fisher', 'Walker', 'Silva', 'Petrov', 'Meyer', 'Dawson', 'Taylor', 'Kovacs',
]
