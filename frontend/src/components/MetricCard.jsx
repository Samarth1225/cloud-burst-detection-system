/**
 * MetricCard — compact stat display with animated value and trend delta.
 */
export default function MetricCard({ label, value, unit, delta, deltaLabel, colorize = false, style = {} }) {
  const isUp     = typeof delta === 'number' ? delta > 0 : null
  const deltaColor = colorize
    ? (isUp ? '#E24B4A' : '#1D9E75')
    : (isUp ? '#EF9F27' : '#1D9E75')

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '0.5px solid var(--border)',
      borderRadius: '10px',
      padding: '14px 16px',
      ...style,
    }}>
      <p style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
          {value ?? '—'}
        </span>
        {unit && (
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{unit}</span>
        )}
      </div>
      {(delta !== undefined || deltaLabel) && (
        <p style={{ fontSize: '11px', color: deltaColor, marginTop: '4px' }}>
          {isUp !== null && (isUp ? '↑' : '↓')} {deltaLabel || Math.abs(delta)?.toFixed(1)}
        </p>
      )}
    </div>
  )
}
