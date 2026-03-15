import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine, Area,
} from 'recharts'
import { format, parseISO } from 'date-fns'

const CLOUDBURST_THRESHOLD = 100  // mm/h

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1c2230', border: '0.5px solid rgba(99,120,170,0.3)',
      borderRadius: '8px', padding: '10px 14px', fontSize: '12px',
    }}>
      <p style={{ color: '#8b949e', marginBottom: '6px' }}>{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color, margin: '2px 0' }}>
          {p.name}: <strong style={{ fontFamily: "'Space Mono', monospace" }}>
            {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
            {p.unit || ''}
          </strong>
        </p>
      ))}
    </div>
  )
}

export default function WeatherChart({ data = [], height = 220 }) {
  const chartData = data.map(d => ({
    ...d,
    time: (() => {
      try { return format(parseISO(d.timestamp), 'HH:mm') } catch { return '' }
    })(),
    prob_pct: +(d.cloudburst_probability * 100).toFixed(1),
  }))

  const maxRain = Math.max(...chartData.map(d => d.rainfall_mm_1h || 0), 20)

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,120,170,0.1)" vertical={false} />
        <XAxis
          dataKey="time"
          tick={{ fill: '#8b949e', fontSize: 10, fontFamily: "'DM Sans'" }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(99,120,170,0.15)' }}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="rain"
          orientation="left"
          domain={[0, Math.max(maxRain * 1.3, 120)]}
          tick={{ fill: '#8b949e', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}`}
          label={{ value: 'mm/h', angle: -90, position: 'insideLeft', fill: '#8b949e', fontSize: 10, dy: 20 }}
        />
        <YAxis
          yAxisId="prob"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: '#E24B4A', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}%`}
        />

        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: '11px', color: '#8b949e', paddingTop: '6px' }}
          formatter={(value) => <span style={{ color: '#8b949e' }}>{value}</span>}
        />

        {/* Cloudburst threshold line */}
        <ReferenceLine
          yAxisId="rain"
          y={CLOUDBURST_THRESHOLD}
          stroke="#E24B4A"
          strokeDasharray="5 3"
          strokeWidth={1}
          label={{ value: '100mm threshold', fill: '#E24B4A', fontSize: 9, position: 'right' }}
        />

        {/* Rainfall bars */}
        <Bar
          yAxisId="rain"
          dataKey="rainfall_mm_1h"
          name="Rainfall (mm/h)"
          fill="#185FA5"
          fillOpacity={0.7}
          radius={[2, 2, 0, 0]}
          maxBarSize={12}
        />

        {/* Probability line */}
        <Line
          yAxisId="prob"
          type="monotone"
          dataKey="prob_pct"
          name="Probability (%)"
          stroke="#E24B4A"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: '#E24B4A' }}
        />

        {/* Pressure line */}
        <Line
          yAxisId="rain"
          type="monotone"
          dataKey="pressure_hpa"
          name="Pressure (hPa)"
          stroke="#7f77dd"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          hide
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
