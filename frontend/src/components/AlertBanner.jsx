import { useState, useEffect } from 'react'

const STYLES = {
  LOW:      { bg: 'rgba(59,109,17,0.12)',  border: '#3B6D11', color: '#97C459', icon: '✓' },
  MODERATE: { bg: 'rgba(239,159,39,0.12)', border: '#854F0B', color: '#EF9F27', icon: '◆' },
  HIGH:     { bg: 'rgba(216,90,48,0.15)',  border: '#993C1D', color: '#F0997B', icon: '▲' },
  CRITICAL: { bg: 'rgba(226,75,74,0.18)',  border: '#A32D2D', color: '#E24B4A', icon: '⬤' },
}

export default function AlertBanner({ riskLevel = 'LOW', probability = 0, stationName = '', recommendations = [], onDismiss }) {
  const [visible, setVisible] = useState(true)
  const [flash,   setFlash]   = useState(false)

  const s = STYLES[riskLevel] || STYLES.LOW

  // Flash on CRITICAL
  useEffect(() => {
    if (riskLevel === 'CRITICAL') {
      const id = setInterval(() => setFlash(f => !f), 800)
      return () => clearInterval(id)
    }
    setFlash(false)
  }, [riskLevel])

  if (!visible) return null

  return (
    <div style={{
      background: flash ? `${s.color}22` : s.bg,
      border: `1px solid ${s.border}55`,
      borderLeft: `3px solid ${s.color}`,
      borderRadius: '10px',
      padding: '14px 16px',
      display: 'flex',
      gap: '12px',
      alignItems: 'flex-start',
      animation: 'fadeInUp 0.35s ease both',
      transition: 'background 0.3s',
    }}>
      <span style={{ fontSize: '16px', color: s.color, flexShrink: 0, marginTop: '2px' }}>
        {s.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: s.color }}>
            {riskLevel} RISK {riskLevel !== 'LOW' && `— ${stationName}`}
          </span>
          <span style={{
            fontSize: '11px',
            fontFamily: "'Space Mono', monospace",
            color: s.color,
            background: `${s.color}22`,
            padding: '1px 7px',
            borderRadius: '10px',
          }}>
            {Math.round(probability * 100)}%
          </span>
        </div>
        {recommendations.length > 0 && (
          <ul style={{ paddingLeft: '14px', marginTop: '4px' }}>
            {recommendations.slice(0, 3).map((r, i) => (
              <li key={i} style={{ fontSize: '12px', color: 'rgba(230,237,243,0.75)', lineHeight: 1.6 }}>
                {r}
              </li>
            ))}
          </ul>
        )}
      </div>
      {onDismiss && (
        <button onClick={() => { setVisible(false); onDismiss?.() }} style={{
          background: 'none', border: 'none', color: s.color, cursor: 'pointer',
          fontSize: '16px', flexShrink: 0, padding: '0 4px', lineHeight: 1,
        }}>×</button>
      )}
    </div>
  )
}
