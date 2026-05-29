import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'
import type { KDData } from '../types'

interface Props {
  data: KDData[]
  darkMode: boolean
}

export default function KDChart({ data, darkMode }: Props) {
  const displayed = data.slice(-120)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">KD 隨機指標</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded bg-blue-500" /> K
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 rounded bg-orange-500" /> D
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
            domain={[0, 100]}
            ticks={[20, 50, 80]}
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
              value.toFixed(2),
              name === 'k' ? 'K值' : name === 'd' ? 'D值' : name,
            ]}
          />
          <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={20} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Area
            dataKey={() => 80}
            fill={darkMode ? 'rgba(239,68,68,0.05)' : 'rgba(239,68,68,0.05)'}
            stroke="none"
            baseValue={100}
          />
          <Area
            dataKey={() => 20}
            fill={darkMode ? 'rgba(34,197,94,0.05)' : 'rgba(34,197,94,0.05)'}
            stroke="none"
            baseValue={0}
          />
          <Line
            type="monotone"
            dataKey="k"
            stroke="#3b82f6"
            dot={false}
            strokeWidth={1.5}
          />
          <Line
            type="monotone"
            dataKey="d"
            stroke="#f97316"
            dot={false}
            strokeWidth={1.5}
          />
        </ComposedChart>
      </ResponsiveContainer>
      {data.length > 0 && (
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
          <span>K: <strong className="text-blue-500">{data[data.length - 1].k.toFixed(1)}</strong></span>
          <span>D: <strong className="text-orange-500">{data[data.length - 1].d.toFixed(1)}</strong></span>
          {data[data.length - 1].k > 80 && <span className="text-red-500 font-medium">超買區</span>}
          {data[data.length - 1].k < 20 && <span className="text-green-500 font-medium">超賣區</span>}
          {data.length >= 2 && data[data.length - 2].k < data[data.length - 2].d && data[data.length - 1].k > data[data.length - 1].d && (
            <span className="badge bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">黃金交叉</span>
          )}
          {data.length >= 2 && data[data.length - 2].k > data[data.length - 2].d && data[data.length - 1].k < data[data.length - 1].d && (
            <span className="badge bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400">死亡交叉</span>
          )}
        </div>
      )}
    </div>
  )
}
