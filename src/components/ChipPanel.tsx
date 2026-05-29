import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'
import type { ChipData } from '../types'
import { formatLargeNumber } from '../utils/format'

interface Props {
  data: ChipData | null
  loading: boolean
  isTW: boolean
}

function Row({ label, buy, sell, net }: { label: string; buy: number; sell: number; net: number }) {
  return (
    <div className="grid grid-cols-4 gap-2 py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 text-sm">
      <div className="font-medium">{label}</div>
      <div className="text-red-500 text-right">{formatLargeNumber(buy)}</div>
      <div className="text-green-500 text-right">{formatLargeNumber(sell)}</div>
      <div className={`text-right font-semibold flex items-center justify-end gap-1 ${
        net > 0 ? 'text-red-500' : net < 0 ? 'text-green-500' : 'text-gray-500'
      }`}>
        {net > 0 ? <TrendingUp className="w-3 h-3" /> : net < 0 ? <TrendingDown className="w-3 h-3" /> : null}
        {formatLargeNumber(Math.abs(net))}
      </div>
    </div>
  )
}

export default function ChipPanel({ data, loading, isTW }: Props) {
  if (!isTW) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> 籌碼面
        </h3>
        <p className="text-sm text-gray-500 py-4 text-center">
          籌碼面資料目前僅支援台股
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> 籌碼面
        </h3>
        <div className="space-y-3 animate-pulse-gentle">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4" /> 籌碼面
        </h3>
        <p className="text-sm text-gray-500 py-4 text-center">
          無法取得籌碼資料
        </p>
      </div>
    )
  }

  const totalNet = data.foreignNet + data.trustNet + data.dealerNet

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <BarChart3 className="w-4 h-4" /> 三大法人籌碼
        <span className={`badge ${totalNet > 0 ? 'bg-red-100 dark:bg-red-900/30 text-red-600' : 'bg-green-100 dark:bg-green-900/30 text-green-600'}`}>
          {totalNet > 0 ? '買超' : '賣超'} {formatLargeNumber(Math.abs(totalNet))}
        </span>
      </h3>
      <div className="grid grid-cols-4 gap-2 pb-2 text-xs text-gray-500 border-b">
        <div>法人</div>
        <div className="text-right">買進</div>
        <div className="text-right">賣出</div>
        <div className="text-right">買賣超</div>
      </div>
      <Row label="外資" buy={data.foreignBuy} sell={data.foreignSell} net={data.foreignNet} />
      <Row label="投信" buy={data.trustBuy} sell={data.trustSell} net={data.trustNet} />
      <Row label="自營商" buy={data.dealerBuy} sell={data.dealerSell} net={data.dealerNet} />

      <div className="mt-3 flex gap-1 h-4 rounded-full overflow-hidden">
        {data.foreignNet !== 0 && (
          <div
            className={`${data.foreignNet > 0 ? 'bg-red-400' : 'bg-green-400'}`}
            style={{ flex: Math.abs(data.foreignNet) }}
            title={`外資: ${formatLargeNumber(data.foreignNet)}`}
          />
        )}
        {data.trustNet !== 0 && (
          <div
            className={`${data.trustNet > 0 ? 'bg-red-300' : 'bg-green-300'}`}
            style={{ flex: Math.abs(data.trustNet) }}
            title={`投信: ${formatLargeNumber(data.trustNet)}`}
          />
        )}
        {data.dealerNet !== 0 && (
          <div
            className={`${data.dealerNet > 0 ? 'bg-red-200' : 'bg-green-200'}`}
            style={{ flex: Math.abs(data.dealerNet) }}
            title={`自營商: ${formatLargeNumber(data.dealerNet)}`}
          />
        )}
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
        <span>外資</span>
        <span>投信</span>
        <span>自營商</span>
      </div>
    </div>
  )
}
