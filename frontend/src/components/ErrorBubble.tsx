import { AlertCircle, RefreshCw, Search, SkipForward } from 'lucide-react'

interface ErrorBubbleProps {
  error: string
  onRecoveryAction: (action: string) => void
}

export default function ErrorBubble({ error, onRecoveryAction }: ErrorBubbleProps) {
  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-800 mb-1">Something went wrong</h3>
          <p className="text-sm text-yellow-700">{error}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-yellow-300">
        <p className="text-xs font-medium text-yellow-800 mb-2">Try one of these:</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onRecoveryAction('retry')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try again</span>
          </button>
          <button
            onClick={() => onRecoveryAction('similar')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Show similar products</span>
          </button>
          <button
            onClick={() => onRecoveryAction('skip')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-yellow-800 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip reviews</span>
          </button>
        </div>
      </div>
    </div>
  )
}

