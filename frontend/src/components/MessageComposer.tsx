import { useState, useRef, useEffect } from 'react'
import { Send, Barcode, Gamepad2, Briefcase, DollarSign, Shuffle } from 'lucide-react'
import { motion } from 'framer-motion'

interface MessageComposerProps {
  onSend: (message: string, sku?: string) => void
  isLoading?: boolean
  activeSku?: string | null
}

const QUICK_CHIPS = [
  { label: 'Gaming', icon: Gamepad2, query: 'Show me gaming options' },
  { label: 'Work from home', icon: Briefcase, query: 'What\'s good for work from home?' },
  { label: 'Under $1500', icon: DollarSign, query: 'Show me options under $1500' },
  { label: 'Compare', icon: Shuffle, query: 'Compare this with alternatives' },
]

export default function MessageComposer({ onSend, isLoading = false, activeSku }: MessageComposerProps) {
  const [message, setMessage] = useState('')
  const [sku, setSku] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (activeSku) {
      setSku(activeSku)
    }
  }, [activeSku])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim()) {
      onSend(message.trim(), sku.trim() || undefined)
      setMessage('')
      // Keep SKU for follow-up questions
    }
  }

  const handleChipClick = (chip: typeof QUICK_CHIPS[0]) => {
    // If there's an active SKU, make it contextual
    const contextualQuery = activeSku ? `${chip.query} for this product` : chip.query
    setMessage(contextualQuery)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (message.trim()) {
        handleSubmit(e as any)
      }
    }
  }

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* SKU/Barcode Input (Optional) */}
        <div className="flex items-center gap-2">
          <Barcode className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            placeholder="SKU / Barcode (optional)"
            className="flex-1 text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-noel-red focus:border-transparent text-noel-dark"
            disabled={isLoading}
          />
        </div>

        {/* Quick Chips */}
        <div className="flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => {
            const Icon = chip.icon
            return (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleChipClick(chip)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-noel-dark bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
              >
                <Icon className="w-3.5 h-3.5" />
                {chip.label}
              </button>
            )
          })}
        </div>

        {/* Message Input */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask NoelIQ anything about a product, use case, budget, or feature…"
            rows={2}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-noel-red focus:border-transparent text-noel-dark resize-none text-base"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!message.trim() || isLoading}
            className="flex-shrink-0 w-12 h-12 bg-noel-red text-white rounded-lg hover:bg-red-700 focus:ring-2 focus:ring-noel-red focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

