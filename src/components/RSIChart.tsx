import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts'

interface RSIData {
  time: string
  value: number
}

interface Props {
  data: RSIData[]
  darkMode: boolean
}

export default function RSIChart({ data, darkMode }: Props) {
  const displayed = data.slice(-120)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-sm">RSI 相對強弱指標</h3>
        <span className="flex items-center gap-1 text-xs">
          <span className="w-3 h-0.5 rounded bg-purple-500" /> RSI(14)
        </span>
      </div>
      <ResponsiveContainer width="100%" height={140}>
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
            ticks={[30, 50, 70]}
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
            formatter={(value: number) => [value.toFixed(2), 'RSI']}
          />
          <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
          <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
          <Area dataKey={() => 70} fill="rgba(239,68,68,0.05)" stroke="none" baseValue={100} />
          <Area dataKey={() => 30} fill="rgba(34,197,94,0.05)" stroke="none" baseValue={0} />
          <Line type="monotone" dataKey="value" stroke="#8b5cf6" dot={false} strokeWidth={1.5} />
        </ComposedChart>
      </ResponsiveContainer>
      {data.length > 0 && (
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
          <span>RSI: <strong className="text-purple-500">{data[data.length - 1].value.toFixed(1)}</strong></span>
          {data[data.length - 1].value > 70 && <span className="text-red-500 font-medium">超買</span>}
          {data[data.length - 1].value < 30 && <span className="text-green-500 font-medium">超賣</span>}
        </div>
      )}
    </div>
  )
}
