import { useMemo, useState } from 'react'
import './App.css'

// Import all constants
import {
  POSITION_WEIGHTS,
  POSITION_TO_CODE,
  CATEGORY_FIELDS,
  SKILL_TIERS,
  NATIONALITY_OPTIONS,
  NAME_POOL_FIRST,
  NAME_POOL_LAST,
} from './constants'

// Import all utilities
import {
  clamp,
  parseNumberInput,
  escapeLuaString,
  toJerseyName,
  randomInt,
  categoryAverage,
  computeSuggestedOverall,
  buildRatingsFromTier,
  expandStatsFromCategory,
  collapseStatsToCategoryRatings,
  buildSquadPositions,
  generateSquadPlayers,
} from './utils'

// Import all Lua generators
import {
  generateLuaScript,
  generateMultiLuaScript,
  generateReleaseAllLuaScript,
  generateHappinessLuaScript,
  generateContractExtensionLuaScript,
  generatePlayerLockLuaScript,
  generateBlockTransfersLuaScript,
} from './generators'

function App() {
  // ==================== STATE ====================
  const [screen, setScreen] = useState('home')
  const [densityMode, setDensityMode] = useState('comfortable')
  const [jerseyAuto, setJerseyAuto] = useState(true)
  const [squadSearch, setSquadSearch] = useState('')
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
  const [photoUrl, setPhotoUrl] = useState(null)
  const [faceData, setFaceData] = useState(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionMessage, setDetectionMessage] = useState('')
  const [showLuaImportModal, setShowLuaImportModal] = useState(false)
  const [luaImportText, setLuaImportText] = useState('')
  const [happinessConfig, setHappinessConfig] = useState({
    form: 100,
    sharpness: 100,
    morale: 120,
    runDaily: true,
    runPrematch: true,
    runOnLoad: true,
    applyNow: true,
  })
  const [contractConfig, setContractConfig] = useState({
    months: 48,
  })

  // ==================== MEMOIZED VALUES ====================
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
  const filteredSquadPlayers = useMemo(() => {
    const query = squadSearch.trim().toLowerCase()
    const withIndex = squadPlayers.map((player, index) => ({ player, index }))
    if (!query) return withIndex
    return withIndex.filter(({ player }) => {
      const haystack = `${player.firstName} ${player.lastName} ${player.jerseyName} ${player.position} ${player.overall}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [squadPlayers, squadSearch])
  const releaseAllLuaScript = useMemo(() => generateReleaseAllLuaScript(), [])
  const happinessLuaScript = useMemo(() => generateHappinessLuaScript(happinessConfig), [happinessConfig])
  const contractLuaScript = useMemo(() => generateContractExtensionLuaScript(contractConfig), [contractConfig])
  const lockLuaScript = useMemo(() => generatePlayerLockLuaScript(), [])
  const blockTransfersLuaScript = useMemo(() => generateBlockTransfersLuaScript(), [])
  const layoutClassName = `layout ${densityMode === 'compact' ? 'density-compact' : 'density-comfortable'}`

  // ==================== HANDLERS ====================
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

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (e) => {
      const url = e.target?.result
      if (typeof url === 'string') {
        setPhotoUrl(url)
        await detectFace(url)
      }
    }
    reader.readAsDataURL(file)
  }

  async function detectFace(imageUrl) {
    if (!window.ml5) {
      setDetectionMessage('Face detection library not loaded yet. Skip for now or try refreshing.')
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)
    setDetectionMessage('Analyzing face... (this may take a moment)')

    const timeoutId = setTimeout(() => {
      setDetectionMessage('Face detection taking too long. Try a different photo or skip this step.')
      setIsDetecting(false)
    }, 10000)

    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = imageUrl

      img.onload = () => {
        try {
          window.ml5.faceDetection('tiniyolov2', img, (err, result) => {
            clearTimeout(timeoutId)
            if (err) {
              setDetectionMessage('Could not detect a face. Please try another photo.')
              setFaceData(null)
              setIsDetecting(false)
              return
            }
            if (result && result.length > 0) {
              const face = result[0]
              const detectedData = {
                confidence: Math.round(face.confidence * 100),
                detectedAt: new Date().toLocaleTimeString(),
              }
              setFaceData(detectedData)
              setDetectionMessage(`✓ Face detected! Confidence: ${detectedData.confidence}%`)
            } else {
              setDetectionMessage('No face detected in this image. Try another photo.')
              setFaceData(null)
            }
            setIsDetecting(false)
          })
        } catch (innerErr) {
          clearTimeout(timeoutId)
          setDetectionMessage('Face detection model failed to load. You can skip this step.')
          setIsDetecting(false)
        }
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        setDetectionMessage('Could not load image. Please try another photo.')
        setIsDetecting(false)
      }
    } catch (error) {
      clearTimeout(timeoutId)
      setDetectionMessage(`Face detection unavailable. You can skip this feature.`)
      setIsDetecting(false)
    }
  }

  async function copyLuaScript() {
    try {
      await navigator.clipboard.writeText(luaScript)
      window.alert('Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  async function copySquadLuaScript() {
    try {
      await navigator.clipboard.writeText(squadLuaScript)
      window.alert('Squad Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  async function copyReleaseAllLuaScript() {
    try {
      await navigator.clipboard.writeText(releaseAllLuaScript)
      window.alert('Release all Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  async function copyHappinessLuaScript() {
    try {
      await navigator.clipboard.writeText(happinessLuaScript)
      window.alert('Happiness Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  async function copyContractLuaScript() {
    try {
      await navigator.clipboard.writeText(contractLuaScript)
      window.alert('Contract extension Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  async function copyLockLuaScript() {
    try {
      await navigator.clipboard.writeText(lockLuaScript)
      window.alert('Player lock Lua script copied to clipboard!')
    } catch {
      window.alert('Could not copy automatically. Select and copy manually.')
    }
  }

  async function copyBlockTransfersLuaScript() {
    try {
      await navigator.clipboard.writeText(blockTransfersLuaScript)
      window.alert('Block transfers Lua script copied to clipboard!')
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

  function importFromLua(luaScript) {
    try {
      const playersMatch = luaScript.match(/local players = \{([\s\S]*?)\}\s*local created_player_ids/m)
      if (!playersMatch) {
        window.alert('Could not find players array in Lua script. Make sure you copied the generated squad script.')
        return
      }

      const playersText = playersMatch[1]
      const playerBlocks = Array.from(playersText.matchAll(/\{\s*first\s*=\s*"[\s\S]*?stats\s*=\s*\{[\s\S]*?\}\s*\}/g)).map(
        (match) => match[0],
      )

      if (!playerBlocks.length) {
        window.alert('No valid players found in Lua. Paste the full generated squad script.')
        return
      }

      const extract = (block, field) => {
        const regex = new RegExp(`${field}\\s*=\\s*"([^"]*)"|${field}\\s*=\\s*(\\d+)`)
        const match = block.match(regex)
        return match ? match[1] || match[2] : ''
      }

      const extractStats = (block) => {
        const statsMatch = block.match(/stats = \{([\s\S]*?)\}/)
        if (!statsMatch) return {}
        const statsText = statsMatch[1]
        const stats = {}
        const statMatches = statsText.matchAll(/(\w+)\s*=\s*(\d+)/g)
        for (const match of statMatches) {
          stats[match[1]] = Number(match[2])
        }
        return stats
      }

      const imported = playerBlocks.map((block, idx) => {
        const positionCode = Number(extract(block, 'position'))
        const position = Object.keys(POSITION_TO_CODE).find((p) => POSITION_TO_CODE[p] === positionCode) || 'CM'
        const stats = extractStats(block)
        const ratings = collapseStatsToCategoryRatings(stats, position)

        return {
          slotId: `imported-${idx}`,
          firstName: extract(block, 'first').trim(),
          lastName: extract(block, 'last').trim(),
          jerseyName: toJerseyName(extract(block, 'jersey').trim() || extract(block, 'first').trim()),
          position,
          nationality: Number(extract(block, 'nationality')) || 14,
          age: Number(extract(block, 'age')) || 22,
          height: Number(extract(block, 'height')) || 184,
          weight: Number(extract(block, 'weight')) || 78,
          overall: Number(extract(block, 'overall')) || 60,
          ratings,
          priority: idx < 11 ? 'XI' : idx < 18 ? 'Subs' : 'Reserves',
        }
      })

      setSquadPlayers(imported)
      window.alert(`Imported ${imported.length} players from Lua script!`)
    } catch (error) {
      window.alert(`Error importing: ${error?.message || 'Unknown error'}`)
    }
  }

  function handleLuaImportClick() {
    setShowLuaImportModal(true)
    setLuaImportText('')
  }

  function submitLuaImport() {
    if (!luaImportText.trim()) {
      window.alert('Please paste your Lua script first.')
      return
    }
    importFromLua(luaImportText)
    setShowLuaImportModal(false)
    setLuaImportText('')
  }

  function updateSquadPlayerField(index, field, value) {
    setSquadPlayers((prev) =>
      prev.map((player, i) => {
        if (i !== index) return player
        const nextPlayer = { ...player, [field]: value }
        if (field === 'firstName') {
          nextPlayer.jerseyName = toJerseyName(value)
        }
        return nextPlayer
      }),
    )
  }

  function removeSquadPlayer(index) {
    setSquadPlayers((prev) => prev.filter((_, i) => i !== index))
  }

  function rerollSinglePlayer(index) {
    setSquadPlayers((prev) =>
      prev.map((player, i) => {
        if (i !== index) return player
        const ratings = buildRatingsFromTier(player.position, squadConfig.skillTier)
        return {
          ...player,
          ratings,
          overall: computeSuggestedOverall(player.position, ratings),
        }
      }),
    )
  }

  function updateHappinessField(field, value) {
    setHappinessConfig((prev) => ({ ...prev, [field]: value }))
  }

  function updateContractField(field, value) {
    setContractConfig((prev) => ({ ...prev, [field]: value }))
  }

  function renderDensityToggle() {
    return (
      <div className="density-toggle" role="group" aria-label="Density mode">
        <button
          type="button"
          className={densityMode === 'comfortable' ? 'is-active' : ''}
          onClick={() => setDensityMode('comfortable')}
        >
          Comfortable
        </button>
        <button
          type="button"
          className={densityMode === 'compact' ? 'is-active' : ''}
          onClick={() => setDensityMode('compact')}
        >
          Compact
        </button>
      </div>
    )
  }

  // ==================== RENDER HOME ====================
  if (screen === 'home') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Automation Suite</p>
          <h1>Player & Squad Builder</h1>
          <p>Create individual players or entire squads with full Lua export. Complete control over skills, ages, nationalities, and more.</p>
          <div className="hero-actions">
            {renderDensityToggle()}
          </div>
        </header>

        <section className="home-grid-modern">
          <article className="card home-card home-mode-card">
            <span className="mode-num" aria-hidden="true">01</span>
            <p className="mode-kicker">One Player</p>
            <h2>Single Player Builder</h2>
            <p>Build a single custom player with fine-tuned attributes, then export the generated Lua script.</p>
            <button type="button" onClick={() => setScreen('single')}>
              Open Builder
            </button>
          </article>

          <article className="card home-card home-mode-card">
            <span className="mode-num" aria-hidden="true">02</span>
            <p className="mode-kicker">Full Squad</p>
            <h2>Multi-Squad Generator</h2>
            <p>Generate balanced 24-player squads with customizable skill tiers, nations, and positions. Perfect for quick team building.</p>
            <button type="button" onClick={() => setScreen('squad')}>
              Open Squad Builder
            </button>
          </article>

          <article className="card home-card home-mode-card">
            <span className="mode-num" aria-hidden="true">03</span>
            <p className="mode-kicker">Club Clean</p>
            <h2>Wipe Your Club</h2>
            <p>Release all players from your club in one go with a multi-pass cleanup script.</p>
            <button type="button" onClick={() => setScreen('release')}>
              Open Team Wipe
            </button>
          </article>

          <article className="card home-card home-mode-card">
            <span className="mode-num" aria-hidden="true">04</span>
            <p className="mode-kicker">Squad Mood</p>
            <h2>Keep Players Happy</h2>
            <p>Generate Lua that boosts morale, form, and sharpness so players stay happy and less likely to complain.</p>
            <button type="button" onClick={() => setScreen('happiness')}>
              Open Team Happiness
            </button>
          </article>

          <article className="card home-card home-mode-card muted">
            <span className="mode-num" aria-hidden="true">05</span>
            <p className="mode-kicker">Retention</p>
            <h2>Extend Contracts</h2>
            <p>Extend all player contracts at once to keep your squad intact for years to come.</p>
            <button type="button" onClick={() => setScreen('contract')}>
              Open Contract Manager
            </button>
          </article>

          <article className="card home-card home-mode-card muted">
            <span className="mode-num" aria-hidden="true">06</span>
            <p className="mode-kicker">Lock-in</p>
            <h2>Lock Players to Club</h2>
            <p>Prevent all players from being transferred by locking them with 20-year contracts. Keep your squad forever.</p>
            <button type="button" onClick={() => setScreen('lock')}>
              Open Player Lock
            </button>
          </article>

          <article className="card home-card home-mode-card muted">
            <span className="mode-num" aria-hidden="true">07</span>
            <p className="mode-kicker">No Offers</p>
            <h2>Block Transfer Offers</h2>
            <p>Ban all players from the transfer market so they never get approached with transfer offers.</p>
            <button type="button" onClick={() => setScreen('block-transfers')}>
              Open Transfer Blocker
            </button>
          </article>
        </section>
      </main>
    )
  }

  // ==================== RENDER SINGLE ====================
  if (screen === 'single') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Single Player Builder</h1>
          <p>Create one custom player with fine-tuned skills and export as Lua.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Player Details</h2>
            <div className="row two-col">
              <label>
                First Name
                <input value={form.firstName} onChange={(e) => updateFirstName(e.target.value)} />
              </label>
              <label>
                Last Name
                <input value={form.lastName} onChange={(e) => updateField('lastName', e.target.value)} />
              </label>
            </div>

            <div className="row">
              <label>
                Jersey Name
                <div className="jersey-input-group">
                  <input
                    value={form.jerseyName}
                    onChange={(e) => updateJerseyName(e.target.value)}
                    placeholder={toJerseyName(form.firstName)}
                  />
                  {!jerseyAuto && (
                    <button type="button" className="sync-jersey" onClick={syncJerseyToFirstName}>
                      Sync to First
                    </button>
                  )}
                </div>
              </label>
            </div>

            <div className="row two-col">
              <label>
                Age
                <input
                  type="number"
                  min="15"
                  max="40"
                  value={form.age}
                  onChange={(e) => updateField('age', parseNumberInput(e.target.value, form.age))}
                  onBlur={(e) => updateField('age', clamp(parseNumberInput(e.target.value, form.age), 15, 40))}
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
            </div>

            <div className="row two-col">
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
                  onChange={(e) => updateField('height', parseNumberInput(e.target.value, form.height))}
                  onBlur={(e) => updateField('height', clamp(parseNumberInput(e.target.value, form.height), 150, 210))}
                />
              </label>
              <label>
                Weight (kg)
                <input
                  type="number"
                  min="50"
                  max="120"
                  value={form.weight}
                  onChange={(e) => updateField('weight', parseNumberInput(e.target.value, form.weight))}
                  onBlur={(e) => updateField('weight', clamp(parseNumberInput(e.target.value, form.weight), 50, 120))}
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
            <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
              💡 <strong>Requires FC26 Live Editor:</strong>{' '}
              <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Get it from Patreon
              </a>
            </p>
            <textarea readOnly value={luaScript} rows={22} />
          </aside>
        </section>
      </main>
    )
  }

  // ==================== RENDER SQUAD ====================
  if (screen === 'squad') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Multi-Squad Generator</h1>
          <p>Create full balanced squads with a single click. Customize skills, nations, and squad size.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Squad Config</h2>

            <div className="row">
              <label>
                Squad Name
                <input value={squadConfig.teamName} onChange={(e) => updateSquadField('teamName', e.target.value)} />
              </label>
            </div>

            <div className="row two-col">
              <label>
                Skill Tier
                <select value={squadConfig.skillTier} onChange={(e) => updateSquadField('skillTier', e.target.value)}>
                  {Object.entries(SKILL_TIERS).map(([key, tier]) => (
                    <option key={key} value={key}>
                      {tier.label} ({tier.min}-{tier.max})
                    </option>
                  ))}
                </select>
              </label>
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
            </div>

            <div className="row two-col">
              <label>
                Age Min
                <input
                  type="number"
                  value={squadConfig.ageMin}
                  onChange={(e) => updateSquadField('ageMin', clamp(Number(e.target.value), 16, 40))}
                />
              </label>
              <label>
                Age Max
                <input
                  type="number"
                  value={squadConfig.ageMax}
                  onChange={(e) => updateSquadField('ageMax', clamp(Number(e.target.value), 16, 40))}
                />
              </label>
            </div>

            <div className="row two-col">
              <label>
                CM/CDM Count
                <input
                  type="number"
                  min="3"
                  max="8"
                  value={squadConfig.cdmCmCount}
                  onChange={(e) => updateSquadField('cdmCmCount', clamp(Number(e.target.value), 3, 8))}
                />
              </label>
              <label>
                ST Count
                <input
                  type="number"
                  min="2"
                  max="4"
                  value={squadConfig.stCount}
                  onChange={(e) => updateSquadField('stCount', clamp(Number(e.target.value), 2, 4))}
                />
              </label>
            </div>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={squadConfig.includeCam}
                onChange={(e) => updateSquadField('includeCam', e.target.checked)}
              />
              Include CAM (2 players)
            </label>

            <div className="button-row">
              <button type="button" onClick={generateSquadPreview}>
                Generate Squad
              </button>
              <button type="button" onClick={handleLuaImportClick}>
                Import From Lua
              </button>
            </div>

            {showLuaImportModal && (
              <div className="import-modal-overlay" onClick={() => setShowLuaImportModal(false)}>
                <div className="import-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Import from Lua Script</h3>
                  <p>Paste your generated squad Lua script here:</p>
                  <textarea
                    value={luaImportText}
                    onChange={(e) => setLuaImportText(e.target.value)}
                    placeholder="Paste Lua script..."
                    rows={10}
                  />
                  <div className="modal-actions">
                    <button type="button" onClick={submitLuaImport}>
                      Import
                    </button>
                    <button type="button" onClick={() => setShowLuaImportModal(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </article>

          <aside className="card summary-card">
            <h2>Squad List ({squadPlayers.length})</h2>
            <p className="hint">Search by name, position, or overall rating</p>

            <input
              type="text"
              placeholder="Search players..."
              value={squadSearch}
              onChange={(e) => setSquadSearch(e.target.value)}
              className="search-input"
            />

            {filteredSquadPlayers.length > 0 ? (
              <div className="squad-list">
                {filteredSquadPlayers.map(({ player, index }) => (
                  <div key={index} className="preview-editor">
                    <div className="preview-content">
                      <span className="name-inputs">
                        <input
                          type="text"
                          className="name-input"
                          value={player.firstName}
                          onChange={(e) => updateSquadPlayerField(index, 'firstName', e.target.value)}
                          placeholder="First"
                          aria-label={`Player ${index + 1} first name`}
                        />
                        <input
                          type="text"
                          className="name-input"
                          value={player.lastName}
                          onChange={(e) => updateSquadPlayerField(index, 'lastName', e.target.value)}
                          placeholder="Last"
                          aria-label={`Player ${index + 1} last name`}
                        />
                      </span>
                      <span>{player.position}</span>
                      <span>OVR {player.overall}</span>
                    </div>
                    <div className="preview-actions">
                      <button
                        type="button"
                        className="mini-btn reroll"
                        onClick={() => rerollSinglePlayer(index)}
                        title="Reroll this player"
                      >
                        ↻
                      </button>
                      <button
                        type="button"
                        className="mini-btn remove"
                        onClick={() => removeSquadPlayer(index)}
                        title="Remove this player"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="hint">No players yet. Generate squad first or import from Lua.</p>
            )}

            {squadPlayers.length > 0 && (
              <>
                <div className="lua-header">
                  <h3>Squad Lua</h3>
                  <button type="button" onClick={copySquadLuaScript}>
                    Copy
                  </button>
                </div>
                <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
                  💡 <strong>Requires FC26 Live Editor:</strong>{' '}
                  <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                    Get it from Patreon
                  </a>
                </p>
                <textarea readOnly value={squadLuaScript} rows={24} />
              </>
            )}
          </aside>
        </section>
      </main>
    )
  }

  // ==================== RENDER RELEASE ====================
  if (screen === 'release') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Full Team Wipe</h1>
          <p>Use this if you want to clear your club first with a dedicated script.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Team Wipe Tool</h2>
            <p className="hint">This script will release all players from your team in multiple passes to ensure cleanup.</p>
            <button type="button" onClick={copyReleaseAllLuaScript}>
              Copy Release All Lua
            </button>
          </article>

          <aside className="card summary-card">
            <h2>Generated Script</h2>
            <p className="hint">Run this in Career Mode to wipe your team.</p>

            <div className="lua-header">
              <h3>Release All Lua</h3>
              <button type="button" onClick={copyReleaseAllLuaScript}>
                Copy
              </button>
            </div>
            <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
              💡 <strong>Requires FC26 Live Editor:</strong>{' '}
              <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Get it from Patreon
              </a>
            </p>
            <textarea readOnly value={releaseAllLuaScript} rows={24} />
          </aside>
        </section>
      </main>
    )
  }

  // ==================== RENDER HAPPINESS ====================
  if (screen === 'happiness') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Team Happiness Manager</h1>
          <p>Set morale, form, and sharpness boosts so your players stay satisfied over time.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Happiness Settings</h2>

            <div className="row three-col">
              <label>
                Form (0-100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={happinessConfig.form}
                  onChange={(e) => updateHappinessField('form', clamp(Number(e.target.value), 0, 100))}
                />
              </label>
              <label>
                Sharpness (0-100)
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={happinessConfig.sharpness}
                  onChange={(e) => updateHappinessField('sharpness', clamp(Number(e.target.value), 0, 100))}
                />
              </label>
              <label>
                Morale (0-120)
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={happinessConfig.morale}
                  onChange={(e) => updateHappinessField('morale', clamp(Number(e.target.value), 0, 120))}
                />
              </label>
            </div>

            <h3>Event Triggers</h3>
            <p className="hint">Choose when to automatically boost happiness</p>

            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={happinessConfig.runDaily}
                onChange={(e) => updateHappinessField('runDaily', e.target.checked)}
              />
              Every day
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={happinessConfig.runPrematch}
                onChange={(e) => updateHappinessField('runPrematch', e.target.checked)}
              />
              Before match
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={happinessConfig.runOnLoad}
                onChange={(e) => updateHappinessField('runOnLoad', e.target.checked)}
              />
              On save load
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={happinessConfig.applyNow}
                onChange={(e) => updateHappinessField('applyNow', e.target.checked)}
              />
              Apply immediately when script runs
            </label>

            <button type="button" onClick={copyHappinessLuaScript}>
              Copy Happiness Lua
            </button>
          </article>

          <aside className="card summary-card">
            <h2>Generated Script</h2>
            <p className="hint">Use this script in Career Mode to automatically manage player morale and form.</p>
            <div className="pill-row">
              <div className="pill">
                <span>Form</span>
                <strong>{happinessConfig.form}</strong>
              </div>
              <div className="pill">
                <span>Sharpness</span>
                <strong>{happinessConfig.sharpness}</strong>
              </div>
              <div className="pill">
                <span>Morale</span>
                <strong>{happinessConfig.morale}</strong>
              </div>
            </div>

            <div className="lua-header">
              <h3>Happiness Lua</h3>
              <button type="button" onClick={copyHappinessLuaScript}>
                Copy
              </button>
            </div>
            <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
              💡 <strong>Requires FC26 Live Editor:</strong>{' '}
              <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Get it from Patreon
              </a>
            </p>
            <textarea readOnly value={happinessLuaScript} rows={24} />
          </aside>
        </section>
      </main>
    )
  }

  // ==================== RENDER CONTRACT ====================
  if (screen === 'contract') {
    const years = Math.floor(contractConfig.months / 12)
    const remainingMonths = contractConfig.months % 12

    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Contract Extension Manager</h1>
          <p>Extend all your player contracts to lock in your squad and prevent valuable players from leaving.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Contract Settings</h2>

            <div className="row">
              <label>
                Extend by (months)
                <input
                  type="number"
                  min="3"
                  max="120"
                  value={contractConfig.months}
                  onChange={(e) => updateContractField('months', parseNumberInput(e.target.value, contractConfig.months))}
                  onBlur={(e) => updateContractField('months', clamp(parseNumberInput(e.target.value, contractConfig.months), 3, 120))}
                />
              </label>
            </div>

            <p className="hint">This will extend all player contracts in your club, except loaned-in players.</p>

            <div className="home-grid">
              <button
                type="button"
                onClick={() => updateContractField('months', 48)}
              >
                4 Years
              </button>
              <button
                type="button"
                onClick={() => updateContractField('months', 60)}
              >
                5 Years
              </button>
              <button type="button" onClick={copyContractLuaScript}>
                Copy Contract Lua
              </button>
            </div>
          </article>

          <aside className="card summary-card">
            <h2>Generated Script</h2>
            <p className="hint">Use this script in Career Mode to extend all player contracts.</p>
            <div className="pill-row two-pills">
              <div className="pill">
                <span>Extension Length</span>
                <strong>
                  {years}y {remainingMonths}m
                </strong>
              </div>
              <div className="pill">
                <span>Total Months</span>
                <strong>{contractConfig.months}</strong>
              </div>
            </div>

            <div className="lua-header">
              <h3>Contract Lua</h3>
              <button type="button" onClick={copyContractLuaScript}>
                Copy
              </button>
            </div>
            <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
              💡 <strong>Requires FC26 Live Editor:</strong>{' '}
              <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Get it from Patreon
              </a>
            </p>
            <textarea readOnly value={contractLuaScript} rows={24} />
          </aside>
        </section>
      </main>
    )
  }

  // ==================== RENDER LOCK ====================
  if (screen === 'lock') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Lock Players to Club</h1>
          <p>Prevent all your players from leaving the club by locking them with 20-year contracts. Complete control over your squad.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Player Lock Settings</h2>

            <p className="hint">
              This will lock all players in your club by setting their contracts to 20 years. Players cannot be transferred while locked. 
              Loaned-in players are excluded from this operation.
            </p>

            <div className="home-grid">
              <button type="button" onClick={copyLockLuaScript}>
                Copy Lock Lua Script
              </button>
              <button 
                type="button" 
                onClick={() => {
                  window.alert('Go to Career Mode and paste the Lua script in the Live Editor to lock all your players.')
                }}
              >
                Need Help?
              </button>
            </div>
          </article>

          <aside className="card summary-card">
            <h2>Generated Script</h2>
            <p className="hint">Use this script in Career Mode to lock all players with 20-year contracts.</p>
            <div className="pill-row one-pill">
              <div className="pill">
                <span>Contract Duration</span>
                <strong>20 Years</strong>
              </div>
            </div>

            <div className="lua-header">
              <h3>Lock Lua</h3>
              <button type="button" onClick={copyLockLuaScript}>
                Copy
              </button>
            </div>
            <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
              💡 <strong>Requires FC26 Live Editor:</strong>{' '}
              <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Get it from Patreon
              </a>
            </p>
            <textarea readOnly value={lockLuaScript} rows={24} />
          </aside>
        </section>
      </main>
    )
  }

  // ==================== RENDER BLOCK TRANSFERS ====================
  if (screen === 'block-transfers') {
    return (
      <main className={layoutClassName}>
        <header className="hero">
          <p className="eyebrow">FC26 Career Mode Tool</p>
          <h1>Block Transfer Offers</h1>
          <p>Ban all your players from the transfer market so they never receive offers from other clubs.</p>
          <div className="hero-actions">
            <button type="button" onClick={() => setScreen('home')}>
              Back To Home
            </button>
            {renderDensityToggle()}
          </div>
        </header>

        <section className="grid">
          <article className="card form-card">
            <h2>Transfer Block Settings</h2>

            <p className="hint">
              This will ban all players in your club from the transfer market until 2099. 
              Players cannot receive offers while banned. Loaned-in players are excluded from this operation.
            </p>

            <div className="home-grid">
              <button type="button" onClick={copyBlockTransfersLuaScript}>
                Copy Block Transfers Lua
              </button>
              <button 
                type="button" 
                onClick={() => {
                  window.alert('Go to Career Mode and paste the Lua script in the Live Editor to block all transfer offers.')
                }}
              >
                Need Help?
              </button>
            </div>
          </article>

          <aside className="card summary-card">
            <h2>Generated Script</h2>
            <p className="hint">Use this script in Career Mode to ban all players from receiving transfer offers.</p>
            <div className="pill-row one-pill">
              <div className="pill">
                <span>Ban Until</span>
                <strong>2099</strong>
              </div>
            </div>

            <div className="lua-header">
              <h3>Block Transfers Lua</h3>
              <button type="button" onClick={copyBlockTransfersLuaScript}>
                Copy
              </button>
            </div>
            <p className="hint" style={{ marginTop: '10px', marginBottom: '10px' }}>
              💡 <strong>Requires FC26 Live Editor:</strong>{' '}
              <a href="https://www.patreon.com/collection/1744907" target="_blank" rel="noopener noreferrer" style={{ color: '#4a9eff', textDecoration: 'underline' }}>
                Get it from Patreon
              </a>
            </p>
            <textarea readOnly value={blockTransfersLuaScript} rows={24} />
          </aside>
        </section>
      </main>
    )
  }

  return null
}

export default App
