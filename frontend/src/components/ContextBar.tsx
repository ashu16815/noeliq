import { useState } from 'react'
import { X, Edit2, Package, DollarSign, Briefcase, MapPin } from 'lucide-react'

interface ContextPill {
  type: 'product' | 'budget' | 'use_case' | 'store'
  label: string
  value: string
}

interface ContextBarProps {
  context: {
    product?: { name: string; sku: string } | null
    budget?: string | null
    useCase?: string | null
    store?: string | null
  }
  onUpdate: (type: string, value: string) => void
}

export default function ContextBar({ context, onUpdate }: ContextBarProps) {
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const pills: ContextPill[] = []

  if (context.product) {
    pills.push({
      type: 'product',
      label: 'Product',
      value: `${context.product.name} (SKU ${context.product.sku})`
    })
  }

  if (context.budget) {
    pills.push({
      type: 'budget',
      label: 'Budget',
      value: context.budget
    })
  }

  if (context.useCase) {
    pills.push({
      type: 'use_case',
      label: 'Use case',
      value: context.useCase
    })
  }

  if (context.store) {
    pills.push({
      type: 'store',
      label: 'Store',
      value: context.store
    })
  }

  if (pills.length === 0) {
    return null
  }

  const handleEdit = (pill: ContextPill) => {
    setEditing(pill.type)
    setEditValue(pill.value)
  }

  const handleSave = (type: string) => {
    if (editValue.trim()) {
      onUpdate(type, editValue.trim())
    }
    setEditing(null)
    setEditValue('')
  }

  const handleCancel = () => {
    setEditing(null)
    setEditValue('')
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'product':
        return Package
      case 'budget':
        return DollarSign
      case 'use_case':
        return Briefcase
      case 'store':
        return MapPin
      default:
        return Package
    }
  }

  return (
    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-medium text-gray-600 mb-2">Current context:</p>
      <div className="flex flex-wrap gap-2">
        {pills.map((pill) => {
          const Icon = getIcon(pill.type)
          const isEditing = editing === pill.type

          if (isEditing) {
            return (
              <div key={pill.type} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-noel-red rounded-lg">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSave(pill.type)
                    } else if (e.key === 'Escape') {
                      handleCancel()
                    }
                  }}
                  className="text-xs outline-none min-w-[100px]"
                  autoFocus
                />
                <button
                  onClick={() => handleSave(pill.type)}
                  className="text-green-600 hover:text-green-700"
                >
                  ✓
                </button>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )
          }

          return (
            <button
              key={pill.type}
              onClick={() => handleEdit(pill)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:border-noel-red hover:text-noel-red transition-colors"
            >
              <Icon className="w-3 h-3" />
              <span>{pill.label}: {pill.value}</span>
              <Edit2 className="w-3 h-3 ml-1" />
            </button>
          )
        })}
      </div>
    </div>
  )
}

