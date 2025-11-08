import { Sparkles } from 'lucide-react'

interface SuggestionChipsProps {
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

export default function SuggestionChips({ suggestions, onSelect }: SuggestionChipsProps) {
  if (!suggestions || suggestions.length === 0) {
    return null
  }

  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-600 mb-2 flex items-center gap-1">
        <Sparkles className="w-3 h-3" />
        <span>Try asking:</span>
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, idx) => (
          <button
            key={idx}
            onClick={() => onSelect(suggestion)}
            className="px-3 py-1.5 text-xs font-medium text-noel-dark bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  )
}

