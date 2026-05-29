export function formatNumber(n: number, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return '--'
  return n.toLocaleString('zh-TW', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatLargeNumber(n: number): string {
  if (!n) return '--'
  if (n >= 1e12) return (n / 1e12).toFixed(2) + '兆'
  if (n >= 1e8) return (n / 1e8).toFixed(2) + '億'
  if (n >= 1e4) return (n / 1e4).toFixed(1) + '萬'
  return n.toLocaleString('zh-TW')
}

export function formatVolume(n: number): string {
  if (!n) return '--'
  if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K'
  return n.toString()
}

export function formatPercent(n: number): string {
  if (n === undefined || n === null || isNaN(n)) return '--'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(2)}%`
}

export function formatChange(n: number, decimals = 2): string {
  if (n === undefined || n === null || isNaN(n)) return '--'
  const sign = n > 0 ? '+' : ''
  return `${sign}${n.toFixed(decimals)}`
}

export function getChangeColor(value: number): string {
  if (value > 0) return 'text-red-500'
  if (value < 0) return 'text-green-500'
  return 'text-gray-500'
}

export function getChangeBg(value: number): string {
  if (value > 0) return 'bg-red-50 dark:bg-red-950/30'
  if (value < 0) return 'bg-green-50 dark:bg-green-950/30'
  return 'bg-gray-50 dark:bg-gray-800'
}

export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '剛剛'
  if (minutes < 60) return `${minutes} 分鐘前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小時前`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} 天前`
  return date.toLocaleDateString('zh-TW')
}

export function isTaiwanStock(symbol: string): boolean {
  return symbol.endsWith('.TW') || symbol.endsWith('.TWO')
}
