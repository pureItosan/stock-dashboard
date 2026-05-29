import { ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts'
import type { MACDData } from '../types'

interface Props {
  data: MACDData[]
  darkMode: boolean
}

export default function MACDChart({ data, darkMode }: Props) {
  const displayed = data.slice(-120)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">MACD 指標</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded bg-blue-500" /> DIF
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded bg-orange-500" /> DEA
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 rounded bg-gray-400" /> 柱狀
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={displayed} margin={{ top: 5, right: 5, bottom: 0, left: -15 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={darkMode ? '#1f2937' : '#f3f4f6'}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: darkMode ? '#6b7280' : '#9ca3af' }}
            tickFormatter={(v) => v.slice(5)}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{ fontSize: 10, fill: darkMode ? '#6b7280' : '#9ca3af' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: darkMode ? '#1f2937' : '#fff',
              border: `1px solid ${darkMode ? '#374151' : '#e5e7eb'}`,
              borderRadius: '8px',
              fontSize: '12px',
            }}
            labelFormatter={(v) => `日期: ${v}`}
            formatter={(value: number, name: string) => [
              value.toFixed(3),
              name === 'dif' ? 'DIF' : name === 'dea' ? 'DEA' : '柱狀體',
            ]}
          />
          <ReferenceLine y={0} stroke={darkMode ? '#4b5563' : '#d1d5db'} />
          <Bar dataKey="histogram" barSize={3} isAnimationActive={false}>
            {displayed.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.histogram >= 0
                  ? (index > 0 && displayed[index - 1].histogram < entry.histogram ? '#ef4444' : '#fca5a5')
                  : (index > 0 && displayed[index - 1].histogram > entry.histogram ? '#22c55e' : '#86efac')
                }
              />
            ))}
          </Bar>
          <Line
            type="monotone"
            dataKey="dif"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="dea"
            stroke="#f97316"
            dot={false}
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {data.length > 0 && (
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
          <span>DIF: <strong className="text-blue-500">{data[data.length - 1].dif.toFixed(3)}</strong></span>
          <span>DEA: <strong className="text-orange-500">{data[data.length - 1].dea.toFixed(3)}</strong></span>
          <span>柱: <strong className={data[data.length - 1].histogram >= 0 ? 'text-red-500' : 'text-green-500'}>
            {data[data.length - 1].histogram.toFixed(3)}
          </strong></span>
          {data.length >= 2 && data[data.length - 2].dif < data[data.length - 2].dea && data[data.length - 1].dif > data[data.length - 1].dea && (
            <span className="badge bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">多方交叉</span>
          )}
          {data.length >= 2 && data[data.length - 2].dif > data[data.length - 2].dea && data[data.length - 1].dif < data[data.length - 1].dea && (
            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">空方交叉</span>
          )}
        </div>
      )}
    </div>
  )
}
