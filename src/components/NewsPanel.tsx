import { ExternalLink, Newspaper } from 'lucide-react'
import type { NewsItem } from '../types'
import { timeAgo } from '../utils/format'

interface Props {
  news: NewsItem[]
  loading: boolean
}

export default function NewsPanel({ news, loading }: Props) {
  if (loading) {
    return (
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
          <Newspaper className="w-4 h-4" /> 最新消息
        </h3>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse-gentle">
              <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-full mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
        <Newspaper className="w-4 h-4" /> 最新消息
        <span className="badge bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
          {news.length}
        </span>
      </h3>
      <div className="space-y-2 max-h-[400px] overflow-y-auto scrollbar-thin pr-1">
        {news.length === 0 && (
          <p className="text-sm text-gray-500 py-4 text-center">暫無相關新聞</p>
        )}
        {news.map((item, i) => (
          <a
            key={i}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-sm leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 line-clamp-2">
                {item.title}
              </h4>
              <ExternalLink className="w-3 h-3 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-gray-400" />
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              {item.source && <span>{item.source}</span>}
              {item.pubDate && <span>{timeAgo(item.pubDate)}</span>}
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
