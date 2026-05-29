import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from 'recharts'
import { Waves } from 'lucide-react'
import axios from 'axios'

interface PERiverPoint {
  time: string
  price: number
  pe10: number
  pe15: number
  pe20: number
  pe25: number
  pe30: number
  pe35: number
  currentPE: number
  eps: number
}

interface Props {
  symbol: string
  darkMode: boolean
}

function getPEZone(pe: number): { label: string; color: string } {
  if (pe <= 0) return { label: '--', color: 'text-gray-500' }
  if (pe < 12) return { label: '極度低估', color: 'text-green-600' }
  if (pe < 16) return { label: '偏低', color: 'text-green-500' }
  if (pe < 22) return { label: '合理', color: 'text-blue-500' }
  if (pe < 28) return { label: '偏高', color: 'text-orange-500' }
  return { label: '極度高估', color: 'text-red-500' }
}

export default function PERiverChart({ symbol, darkMode }: Props) {
  const [data, setData] = useState<PERiverPoint[]>([])
  const [currentPE, setCurrentPE] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!symbol) return
    let cancelled = false
    setLoading(true)
    setError('')

    axios.get(`/api/pe-river/${symbol}`)
      .then((res) => {
        if (cancelled) return
        setData(res.data.data || [])
        setCurrentPE(res.data.currentPE || 0)
      })
      .catch(() => {
        if (cancelled) return
        setError('無法取得本益比資料')
        setData([])
      })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [symbol])

  if (loading) {
    return (
      <div className="card p-4 h-[360px] flex items-center justify-center animate-pulse-gentle">
        <span className="text-gray-400">載入本益比河流圖...</span>
      </div>
    )
  }

  if (error || data.length === 0) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-2">
          <Waves className="w-4 h-4 text-cyan-500" /> 本益比河流圖
        </h3>
        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
          {error || '此股票暫無本益比資料'}
        </div>
      </div>
    )
  }

  const peZone = getPEZone(currentPE)
  const latestEPS = data[data.length - 1]?.eps ?? 0

  // Build chart data with stacked bands
  const chartData = data.map((d) => ({
    time: d.time.slice(0, 7), // YYYY-MM
    price: d.price,
    band1: d.pe15 - d.pe10,  // 10-15x band
    band2: d.pe20 - d.pe15,  // 15-20x band
    band3: d.pe25 - d.pe20,  // 20-25x band
    band4: d.pe30 - d.pe25,  // 25-30x band
    band5: d.pe35 - d.pe30,  // 30-35x band
    base: d.pe10,            // base line
    pe10: d.pe10,
    pe15: d.pe15,
    pe20: d.pe20,
    pe25: d.pe25,
    pe30: d.pe30,
    pe35: d.pe35,
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    const d = payload[0]?.payload
    if (!d) return null
    const pe = d.price > 0 && latestEPS > 0 ? (d.price / latestEPS) : 0
    return (
      <div className="bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 text-xs">
        <div className="font-semibold mb-1">{label}</div>
        <div className="text-blue-600 font-medium">股價: {d.price?.toFixed(2)}</div>
        {pe > 0 && <div className="text-gray-500">約 PE: {pe.toFixed(1)}x</div>}
        <div className="mt-1 space-y-0.5 text-[10px] text-gray-400">
          <div>PE 35x: {d.pe35?.toFixed(0)}</div>
          <div>PE 30x: {d.pe30?.toFixed(0)}</div>
          <div>PE 25x: {d.pe25?.toFixed(0)}</div>
          <div>PE 20x: {d.pe20?.toFixed(0)}</div>
          <div>PE 15x: {d.pe15?.toFixed(0)}</div>
          <div>PE 10x: {d.pe10?.toFixed(0)}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Waves className="w-4 h-4 text-cyan-500" /> 本益比河流圖
        </h3>
        <div className="flex items-center gap-3">
          {latestEPS > 0 && (
            <span className="text-xs text-gray-500">
              EPS {latestEPS.toFixed(2)}
            </span>
          )}
          {currentPE > 0 && (
            <span className={`badge ${peZone.color} bg-opacity-10 ${peZone.color.replace('text-', 'bg-').replace('-500', '-50').replace('-600', '-50')} dark:bg-opacity-20`}>
              PE {currentPE.toFixed(1)}x · {peZone.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-green-200" /> 10-15x</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-emerald-200" /> 15-20x</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-yellow-200" /> 20-25x</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-orange-200" /> 25-30x</span>
        <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-red-200" /> 30-35x</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={darkMode ? '#1f2937' : '#f3f4f6'}
          />
          <XAxis
            dataKey="time"
            tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: darkMode ? '#9ca3af' : '#6b7280' }}
            tickLine={false}
            axisLine={false}
            domain={['auto', 'auto']}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Invisible base to offset the stacking */}
          <Area type="monotone" dataKey="base" stackId="pe" fill="transparent" stroke="none" />

          {/* PE bands stacked */}
          <Area type="monotone" dataKey="band1" stackId="pe" fill={darkMode ? '#065f46' : '#bbf7d0'} stroke="none" fillOpacity={0.7} />
          <Area type="monotone" dataKey="band2" stackId="pe" fill={darkMode ? '#047857' : '#a7f3d0'} stroke="none" fillOpacity={0.6} />
          <Area type="monotone" dataKey="band3" stackId="pe" fill={darkMode ? '#92400e' : '#fef08a'} stroke="none" fillOpacity={0.5} />
          <Area type="monotone" dataKey="band4" stackId="pe" fill={darkMode ? '#9a3412' : '#fed7aa'} stroke="none" fillOpacity={0.5} />
          <Area type="monotone" dataKey="band5" stackId="pe" fill={darkMode ? '#7f1d1d' : '#fecaca'} stroke="none" fillOpacity={0.5} />

          {/* Price line on top */}
          <Line
            type="monotone"
            dataKey="price"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
