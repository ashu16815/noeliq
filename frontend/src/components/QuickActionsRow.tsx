import { Search, GitCompare, Star, Package, DollarSign } from 'lucide-react'
import { AskResponse } from '../lib/apiClient'

interface QuickActionsRowProps {
  answer: AskResponse
  onAction: (action: string, data?: any) => void
}

export default function QuickActionsRow({ answer, onAction }: QuickActionsRowProps) {
  const actions = []

  // Show full specs
  if (answer.product_metadata?.sku) {
    actions.push({
      id: 'specs',
      label: 'Show full specs',
      icon: Search,
      onClick: () => onAction('specs', { sku: answer.product_metadata?.sku })
    })
  }

  // Compare with similar
  if (answer.product_metadata?.sku) {
    actions.push({
      id: 'compare',
      label: 'Compare with similar',
      icon: GitCompare,
      onClick: () => onAction('compare', { sku: answer.product_metadata?.sku })
    })
  }

  // Show online reviews
  if (answer.product_metadata?.sku && !answer.customer_voice) {
    actions.push({
      id: 'reviews',
      label: 'Show online reviews',
      icon: Star,
      onClick: () => onAction('reviews', { sku: answer.product_metadata?.sku })
    })
  }

  // Suggest add-ons
  if (answer.product_metadata?.sku) {
    actions.push({
      id: 'addons',
      label: 'Suggest add-ons',
      icon: Package,
      onClick: () => onAction('addons', { sku: answer.product_metadata?.sku })
    })
  }

  // Find similar but cheaper
  if (answer.product_metadata?.sku && answer.product_metadata?.price_band) {
    actions.push({
      id: 'similar',
      label: 'Find similar but cheaper',
      icon: DollarSign,
      onClick: () => onAction('similar', { sku: answer.product_metadata?.sku })
    })
  }

  if (actions.length === 0) {
    return null
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-medium text-gray-600 mb-2">Quick actions:</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <button
              key={action.id}
              onClick={action.onClick}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-noel-dark bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{action.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

