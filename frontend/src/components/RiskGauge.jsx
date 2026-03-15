import { useEffect, useRef } from 'react'

const RISK_COLORS = {
  LOW:      '#639922',
  MODERATE: '#EF9F27',
  HIGH:     '#D85A30',
  CRITICAL: '#E24B4A',
}

/**
 * Animated SVG arc gauge for cloudburst probability.
 * prob: 0–1
 */
export default function RiskGauge({ probability = 0, riskLevel = 'LOW', size = 160 }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)
  const currentRef = useRef(0)

  const color = RISK_COLORS[riskLevel] || '#639922'
  const pct   = Math.round(probability * 100)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const s   = size * dpr
    canvas.width  = s
    canvas.height = s
    canvas.style.width  = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx     = size / 2
    const cy     = size / 2
    const radius = size * 0.38
    const lineW  = size * 0.08
    const start  = Math.PI * 0.75
    const end    = Math.PI * 2.25
    const target = probability

    function draw(val) {
      ctx.clearRect(0, 0, size, size)

      // Track arc
      ctx.beginPath()
      ctx.arc(cx, cy, radius, start, end)
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth   = lineW
      ctx.lineCap     = 'round'
      ctx.stroke()

      // Value arc
      const arcEnd = start + (end - start) * val
      const grad = ctx.createLinearGradient(0, 0, size, size)
      grad.addColorStop(0, '#185FA5')
      grad.addColorStop(0.6, color)
      grad.addColorStop(1, color)
      ctx.beginPath()
      ctx.arc(cx, cy, radius, start, arcEnd)
      ctx.strokeStyle = grad
      ctx.lineWidth   = lineW
      ctx.lineCap     = 'round'
      ctx.stroke()

      // Glow tip
      if (val > 0.02) {
        const tipX = cx + radius * Math.cos(arcEnd)
        const tipY = cy + radius * Math.sin(arcEnd)
        const glow = ctx.createRadialGradient(tipX, tipY, 0, tipX, tipY, lineW)
        glow.addColorStop(0, color + 'cc')
        glow.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(tipX, tipY, lineW * 0.7, 0, Math.PI * 2)
        ctx.fillStyle = glow
        ctx.fill()
      }

      // Percentage text
      ctx.textAlign    = 'center'
      ctx.textBaseline = 'middle'
      ctx.font         = `700 ${size * 0.18}px 'Space Mono', monospace`
      ctx.fillStyle    = '#e6edf3'
      ctx.fillText(`${Math.round(val * 100)}%`, cx, cy - size * 0.04)

      // Label
      ctx.font      = `400 ${size * 0.08}px 'DM Sans', sans-serif`
      ctx.fillStyle = 'rgba(230,237,243,0.5)'
      ctx.fillText('PROBABILITY', cx, cy + size * 0.1)
    }

    // Animate
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const from = currentRef.current
    const dur  = 600
    const t0   = performance.now()

    function animate(now) {
      const t   = Math.min((now - t0) / dur, 1)
      const ease = 1 - Math.pow(1 - t, 3)
      const val  = from + (target - from) * ease
      currentRef.current = val
      draw(val)
      if (t < 1) animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [probability, riskLevel, size])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <canvas ref={canvasRef} />
      <span style={{
        padding: '4px 14px',
        borderRadius: '20px',
        fontSize: '11px',
        fontWeight: 500,
        letterSpacing: '0.6px',
        background: `${color}22`,
        color,
        border: `0.5px solid ${color}66`,
      }}>
        {riskLevel} RISK
      </span>
    </div>
  )
}
