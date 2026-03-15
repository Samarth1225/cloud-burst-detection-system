// API utility — wraps all backend calls
// Falls back to simulated data when the backend is unreachable.

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${path}`)
  return res.json()
}

// ── Prediction ──────────────────────────────────────────────────────────────

export async function predict(weatherData) {
  try {
    return await apiFetch('/predict', {
      method: 'POST',
      body: JSON.stringify(weatherData),
    })
  } catch {
    return simulatePrediction(weatherData)
  }
}

export async function batchPredict(records) {
  try {
    return await apiFetch('/batch-predict', {
      method: 'POST',
      body: JSON.stringify({ records }),
    })
  } catch {
    return { predictions: records.map(simulatePrediction), count: records.length }
  }
}

// ── Weather data ─────────────────────────────────────────────────────────────

export async function getWeatherData(stationId = 'STN001', hours = 24) {
  try {
    return await apiFetch(`/weather-data?station_id=${stationId}&hours=${hours}`)
  } catch {
    return simulateWeatherHistory(stationId, hours)
  }
}

export async function getStations() {
  try {
    return await apiFetch('/stations')
  } catch {
    return { stations: STATIONS_FALLBACK, count: STATIONS_FALLBACK.length }
  }
}

// ── Alerts ───────────────────────────────────────────────────────────────────

export async function getAlerts(activeOnly = true, stationId = null) {
  try {
    const q = `active_only=${activeOnly}${stationId ? `&station_id=${stationId}` : ''}`
    return await apiFetch(`/alerts?${q}`)
  } catch {
    return { alerts: [], count: 0 }
  }
}

export async function getRiskMap() {
  try {
    return await apiFetch('/risk-map')
  } catch {
    return { stations: STATIONS_FALLBACK.map(s => ({ ...s, probability: Math.random() * 0.5, risk_level: 'LOW' })) }
  }
}

// ── Simulation fallbacks ──────────────────────────────────────────────────────

function rng(seed) {
  let s = (seed * 1103515245 + 12345) & 0x7fffffff
  return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff }
}

export function simulatePrediction(data) {
  const rain   = data.rainfall_mm_1h || 0
  const rain3h = data.rainfall_mm_3h || rain * 2.5
  const hum    = data.humidity_pct   || 70
  const pres   = data.pressure_hpa   || 1010
  const wind   = data.wind_speed_kmh || 10
  const radar  = data.radar_reflectivity_dbz || 15
  const light  = data.lightning_strikes || 0

  let prob = Math.min(1, Math.max(0,
    (rain   / 100)  * 0.35 +
    (rain3h / 150)  * 0.20 +
    (Math.max(hum - 70, 0) / 30) * 0.15 +
    (Math.max(1015 - pres, 0) / 25) * 0.15 +
    (wind   / 50)   * 0.08 +
    (radar  / 65)   * 0.05 +
    (light  / 60)   * 0.02 +
    (Math.random() * 0.06 - 0.03)
  ))

  const level = prob < 0.30 ? 'LOW' : prob < 0.55 ? 'MODERATE' : prob < 0.75 ? 'HIGH' : 'CRITICAL'

  const factors = []
  if (rain  > 20) factors.push({ factor: 'Intense Rainfall',      value: `${rain.toFixed(1)} mm/h`,  severity: rain  > 60  ? 'high' : 'moderate' })
  if (hum   > 85) factors.push({ factor: 'Very High Humidity',    value: `${hum.toFixed(0)}%`,        severity: hum   > 93  ? 'high' : 'moderate' })
  if (pres  < 1005) factors.push({ factor: 'Low Pressure',        value: `${pres.toFixed(1)} hPa`,   severity: pres  < 1000 ? 'high' : 'moderate' })
  if (wind  > 30) factors.push({ factor: 'Strong Winds',          value: `${wind.toFixed(0)} km/h`,  severity: wind  > 45  ? 'high' : 'moderate' })
  if (radar > 40) factors.push({ factor: 'High Radar Reflectivity', value: `${radar.toFixed(0)} dBZ`, severity: radar > 55  ? 'high' : 'moderate' })
  if (light > 10) factors.push({ factor: 'Lightning Activity',    value: `${light}/h`,               severity: 'moderate' })
  if (!factors.length) factors.push({ factor: 'Normal Conditions', value: 'All nominal', severity: 'low' })

  const recs = {
    LOW:      ['Monitor weather updates hourly', 'No immediate action required'],
    MODERATE: ['Avoid low-lying flood-prone areas', 'Keep emergency contacts ready', 'Check drainage systems'],
    HIGH:     ['Evacuate vulnerable areas immediately', 'Issue public advisory', 'Deploy NDRF teams on standby'],
    CRITICAL: ['IMMEDIATE EVACUATION of all high-risk zones', 'Activate disaster response protocol', 'Alert hospitals & emergency services'],
  }

  return {
    station_id: data.station_id || 'STN001',
    timestamp: new Date().toISOString(),
    probability: +prob.toFixed(4),
    risk_level: level,
    alert_triggered: prob >= 0.55,
    confidence: +(0.85 + prob * 0.1).toFixed(3),
    contributing_factors: factors,
    model_version: 'rule-based-v1.0',
    prediction_id: Math.random().toString(36).slice(2, 10),
    recommendations: recs[level],
  }
}

export function simulateWeatherHistory(stationId, hours = 24) {
  const seed = stationId.replace(/\D/g, '') * 1 || 1
  const r    = rng(seed + Date.now() % 997)
  const evH  = Math.floor(r() * hours * 0.65 + hours * 0.15)
  const now  = new Date()
  const records = []

  for (let i = hours; i >= 0; i--) {
    const ts   = new Date(now.getTime() - i * 3600_000)
    const dist = Math.abs(i - evH)
    const inten = Math.max(0, 1 - dist / 7)

    records.push({
      timestamp:                ts.toISOString(),
      temperature_c:            +(22 - inten * 4   + r() * 2 - 1).toFixed(1),
      humidity_pct:             +Math.min(100, 65 + inten * 31 + r() * 4).toFixed(1),
      pressure_hpa:             +(1013 - inten * 13 + r() * 2 - 1).toFixed(1),
      wind_speed_kmh:           +Math.max(0, 10 + inten * 38 + r() * 5).toFixed(1),
      rainfall_mm_1h:           +Math.max(0, inten * 95 + r() * 8).toFixed(1),
      rainfall_mm_3h:           +Math.max(0, inten * 170 + r() * 12).toFixed(1),
      radar_reflectivity_dbz:   +Math.max(0, 15 + inten * 48 + r() * 5).toFixed(1),
      risk_score:               +Math.min(100, inten * 95 + r() * 8).toFixed(0),
      cloudburst_probability:   +Math.min(1, inten * 0.93 + r() * 0.06).toFixed(3),
    })
  }

  return {
    station_id: stationId,
    records,
    count: records.length,
    period_start: new Date(now.getTime() - hours * 3600_000).toISOString(),
    period_end: now.toISOString(),
  }
}

export const STATIONS_FALLBACK = [
  { id: 'STN001', name: 'Chandigarh',   lat: 30.7333, lon: 76.7794, elevation_m: 321,  region: 'Punjab Plains' },
  { id: 'STN002', name: 'Shimla',       lat: 31.1048, lon: 77.1734, elevation_m: 2202, region: 'Himachal Pradesh' },
  { id: 'STN003', name: 'Manali',       lat: 32.2190, lon: 77.1890, elevation_m: 2050, region: 'Himachal Pradesh' },
  { id: 'STN004', name: 'Dehradun',     lat: 30.3165, lon: 78.0322, elevation_m: 640,  region: 'Uttarakhand' },
  { id: 'STN005', name: 'Mussoorie',    lat: 30.4598, lon: 78.0644, elevation_m: 2005, region: 'Uttarakhand' },
  { id: 'STN006', name: 'Dharamshala', lat: 32.2190, lon: 76.3234, elevation_m: 1457, region: 'Himachal Pradesh' },
  { id: 'STN007', name: 'Kedarnath',   lat: 30.7346, lon: 79.0669, elevation_m: 3584, region: 'Uttarakhand' },
  { id: 'STN008', name: 'Srinagar',    lat: 34.0837, lon: 74.7973, elevation_m: 1585, region: 'J&K' },
]
